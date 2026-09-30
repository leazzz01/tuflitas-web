"use server";

import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/lib/db";
import { getOwnerAccess } from "@/lib/auth/owner";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";

export type ProductActionState = {
  error?: string;
  success?: string;
};

type VariantInput = {
  size: string;
  color: string;
  stock: number;
};

type EditableVariantInput = VariantInput & {
  id: string | null;
  isActive: boolean;
};

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseVariants(value: string): VariantInput[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 30) return null;

    const variants: VariantInput[] = [];
    const seen = new Set<string>();

    for (const item of parsed) {
      if (typeof item !== "object" || item === null) return null;
      const row = item as Record<string, unknown>;
      if (typeof row.size !== "string" || typeof row.color !== "string") return null;

      const size = row.size.trim();
      const color = row.color.trim();
      const stock = Number(row.stock);
      if (!size || size.length > 32 || !color || color.length > 48) return null;
      if (!Number.isInteger(stock) || stock < 0 || stock > 10000) return null;

      const key = `${size.toLocaleLowerCase("es-AR")}:${color.toLocaleLowerCase("es-AR")}`;
      if (seen.has(key)) return null;
      seen.add(key);
      variants.push({ size, color, stock });
    }

    return variants;
  } catch {
    return null;
  }
}

export async function createProductAction(
  _previousState: ProductActionState | null,
  formData: FormData,
): Promise<ProductActionState> {
  const access = await getOwnerAccess();
  if (access.status !== "owner") {
    return { error: "Iniciá sesión con la cuenta autorizada para administrar el catálogo." };
  }

  const name = readText(formData, "name");
  const categorySlug = readText(formData, "category");
  const description = readText(formData, "description");
  const rawPrice = readText(formData, "price").replace(",", ".");
  const price = Number(rawPrice);
  const rawDiscountPrice = readText(formData, "discountPrice").replace(",", ".");
  const discountPrice = rawDiscountPrice === "" ? null : Number(rawDiscountPrice);
  const variants = parseVariants(readText(formData, "variants"));
  const imageUrls = readText(formData, "imageUrls")
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);

  if (name.length < 2 || name.length > 120) {
    return { error: "El nombre debe tener entre 2 y 120 caracteres." };
  }
  if (!categorySlug) return { error: "Elegí una categoría." };
  if (!Number.isFinite(price) || price <= 0 || price > 100000000) {
    return { error: "Ingresá un precio válido en pesos argentinos." };
  }
  if (discountPrice !== null && (!Number.isFinite(discountPrice) || discountPrice <= 0 || discountPrice >= price)) {
    return { error: "El precio de oferta debe ser mayor que cero y menor que el precio normal." };
  }
  if (description.length > 2000) return { error: "La descripción no puede superar 2000 caracteres." };
  if (!variants) return { error: "Revisá talles, colores, cantidades y que no haya variantes repetidas." };
  if (imageUrls.length > 8) return { error: "Podés agregar hasta 8 URLs de fotos." };

  for (const imageUrl of imageUrls) {
    try {
      if (new URL(imageUrl).protocol !== "https:") return { error: "Las fotos deben usar una URL HTTPS." };
    } catch {
      return { error: "Una de las URLs de foto no es válida." };
    }
  }

  const images = imageUrls.map((url, index) => ({
    url,
    alt_text: `${name}, foto ${index + 1}`,
    is_cover: index === 0,
    sort_order: index,
  }));
  const slug = `${slugify(name) || "producto"}-${randomUUID().slice(0, 8)}`;
  const isNew = formData.get("isNew") === "on";
  const isFeatured = formData.get("isFeatured") === "on";

  try {
    const sql = getDatabase();
    const created = await sql`
      with selected_category as (
        select id
        from public.categories
        where slug = ${categorySlug} and is_active = true
      ),
      next_position as (
        select coalesce(max(display_order) + 1, 0) as display_order
        from public.products
      ),
      created_product as (
        insert into public.products (
          category_id, name, slug, description, price_ars, discount_price_ars,
          is_new, is_featured, display_order
        )
        select id, ${name}, ${slug}, ${description}, ${price}, ${discountPrice}, ${isNew}, ${isFeatured}, next_position.display_order
        from selected_category cross join next_position
        returning id
      ),
      created_variants as (
        insert into public.product_variants (
          product_id, size_label, color_name, stock_quantity
        )
        select created_product.id, variant.size, variant.color, variant.stock
        from created_product
        cross join jsonb_to_recordset(${JSON.stringify(variants)}::jsonb)
          as variant(size text, color text, stock integer)
        returning id, stock_quantity
      ),
      initial_stock_movements as (
        insert into public.stock_movements (variant_id, movement_type, quantity_delta, note)
        select id, 'entry', stock_quantity, 'Stock inicial'
        from created_variants
        where stock_quantity > 0
        returning id
      ),
      created_images as (
        insert into public.product_images (
          product_id, image_url, alt_text, sort_order, is_cover
        )
        select created_product.id, image.url, image.alt_text, image.sort_order, image.is_cover
        from created_product
        cross join jsonb_to_recordset(${JSON.stringify(images)}::jsonb)
          as image(url text, alt_text text, sort_order integer, is_cover boolean)
        returning id
      )
      select id from created_product
    `;

    if (created.length === 0) return { error: "No encontramos esa categoría activa." };
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: "Producto guardado en el catálogo." };
  } catch (error) {
    console.error("No se pudo crear el producto.", error);
    return { error: "No se pudo guardar. Verificá los datos y las variantes e intentá de nuevo." };
  }
}

function parseEditableVariants(value: string): EditableVariantInput[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 30) return null;

    const variants: EditableVariantInput[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) return null;
      const row = item as Record<string, unknown>;
      if (typeof row.size !== "string" || typeof row.color !== "string") return null;
      if (row.id !== null && typeof row.id !== "string") return null;
      if (typeof row.isActive !== "boolean") return null;

      const id = row.id as string | null;
      if (id && !/^[0-9a-f-]{36}$/i.test(id)) return null;
      const size = row.size.trim();
      const color = row.color.trim();
      const stock = Number(row.stock);
      if (!size || size.length > 32 || !color || color.length > 48) return null;
      if (!Number.isInteger(stock) || stock < 0 || stock > 10000) return null;

      const key = `${size.toLocaleLowerCase("es-AR")}:${color.toLocaleLowerCase("es-AR")}`;
      if (seen.has(key)) return null;
      seen.add(key);
      variants.push({ id, size, color, stock, isActive: row.isActive });
    }

    return variants;
  } catch {
    return null;
  }
}

export async function updateProductAction(
  _previousState: ProductActionState | null,
  formData: FormData,
): Promise<ProductActionState> {
  const access = await getOwnerAccess();
  if (access.status !== "owner") {
    return { error: "Iniciá sesión con la cuenta autorizada para administrar el catálogo." };
  }

  const productId = readText(formData, "productId");
  const name = readText(formData, "name");
  const categorySlug = readText(formData, "category");
  const description = readText(formData, "description");
  const rawPrice = readText(formData, "price").replace(",", ".");
  const price = Number(rawPrice);
  const rawDiscountPrice = readText(formData, "discountPrice").replace(",", ".");
  const discountPrice = rawDiscountPrice === "" ? null : Number(rawDiscountPrice);
  const variants = parseEditableVariants(readText(formData, "variants"));
  const imageUrls = readText(formData, "imageUrls")
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);

  if (!/^[0-9a-f-]{36}$/i.test(productId)) return { error: "Producto inválido." };
  if (name.length < 2 || name.length > 120) return { error: "El nombre debe tener entre 2 y 120 caracteres." };
  if (!categorySlug) return { error: "Elegí una categoría." };
  if (!Number.isFinite(price) || price <= 0 || price > 100000000) {
    return { error: "Ingresá un precio válido en pesos argentinos." };
  }
  if (discountPrice !== null && (!Number.isFinite(discountPrice) || discountPrice <= 0 || discountPrice >= price)) {
    return { error: "El precio de oferta debe ser mayor que cero y menor que el precio normal." };
  }
  if (description.length > 2000) return { error: "La descripción no puede superar 2000 caracteres." };
  if (!variants) return { error: "Revisá talles, colores, cantidades y que no haya variantes repetidas." };
  if (imageUrls.length > 8) return { error: "Podés agregar hasta 8 URLs de fotos." };

  for (const imageUrl of imageUrls) {
    try {
      if (new URL(imageUrl).protocol !== "https:") return { error: "Las fotos deben usar una URL HTTPS." };
    } catch {
      return { error: "Una de las URLs de foto no es válida." };
    }
  }

  try {
    const sql = getDatabase();
    const existingVariants = await sql`
      select id
      from public.product_variants
      where product_id = ${productId}
    `;
    const existingIds = new Set(existingVariants.map((variant) => variant.id));
    if (variants.some((variant) => variant.id && !existingIds.has(variant.id))) {
      return { error: "Una variante no corresponde a este producto." };
    }

    const statements = [sql`
      update public.products as product
      set
        category_id = category.id,
        name = ${name},
        description = ${description},
        price_ars = ${price},
        discount_price_ars = ${discountPrice},
        is_new = ${formData.get("isNew") === "on"},
        is_featured = ${formData.get("isFeatured") === "on"},
        is_active = ${formData.get("isActive") === "on"},
        updated_at = now()
      from public.categories as category
      where product.id = ${productId}
        and category.slug = ${categorySlug}
        and category.is_active = true
      returning product.id
    `];

    for (const variant of variants) {
      if (variant.id) {
        statements.push(sql`
          with previous as materialized (
            select id, stock_quantity
            from public.product_variants
            where id = ${variant.id} and product_id = ${productId}
          ),
          updated as (
            update public.product_variants as current_variant
            set
              size_label = ${variant.size},
              color_name = ${variant.color},
              stock_quantity = ${variant.stock},
              is_active = ${variant.isActive}
            from previous
            where current_variant.id = previous.id
            returning current_variant.id, current_variant.stock_quantity
          ),
          stock_adjustment as (
            insert into public.stock_movements (variant_id, movement_type, quantity_delta, note)
            select updated.id, 'adjustment', updated.stock_quantity - previous.stock_quantity,
              'Actualización desde el panel'
            from updated
            inner join previous on previous.id = updated.id
            where updated.stock_quantity <> previous.stock_quantity
            returning id
          )
          select id from updated
        `);
      } else {
        statements.push(sql`
          with inserted as (
            insert into public.product_variants (
              product_id, size_label, color_name, stock_quantity
            ) values (
              ${productId}, ${variant.size}, ${variant.color}, ${variant.stock}
            )
            returning id, stock_quantity
          ),
          initial_movement as (
            insert into public.stock_movements (variant_id, movement_type, quantity_delta, note)
            select id, 'entry', stock_quantity, 'Variante agregada desde el panel'
            from inserted
            where stock_quantity > 0
            returning id
          )
          select id from inserted
        `);
      }
    }

    statements.push(sql`delete from public.product_images where product_id = ${productId}`);
    for (const [index, imageUrl] of imageUrls.entries()) {
      statements.push(sql`
        insert into public.product_images (product_id, image_url, alt_text, sort_order, is_cover)
        values (${productId}, ${imageUrl}, ${`${name}, foto ${index + 1}`}, ${index}, ${index === 0})
      `);
    }

    const results = await sql.transaction(statements);
    if (results[0].length === 0) return { error: "No encontramos el producto o la categoría." };
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: "Cambios guardados." };
  } catch (error) {
    console.error("No se pudo actualizar el producto.", error);
    return { error: "No se pudieron guardar los cambios. Verificá que no haya talles y colores repetidos." };
  }
}

export async function updateSiteContentAction(
  _previousState: ProductActionState | null,
  formData: FormData,
): Promise<ProductActionState> {
  const access = await getOwnerAccess();
  if (access.status !== "owner") {
    return { error: "Iniciá sesión con la cuenta autorizada para administrar la página." };
  }

  const entries = Object.keys(DEFAULT_SITE_CONTENT).map((key) => ({
    key,
    value: readText(formData, key as keyof SiteContent),
  }));
  const tooLong = entries.find((entry) =>
    entry.value.length > (entry.key === "hero_image_url" ? 16000 : 300),
  );
  if (tooLong) return { error: "Los textos admiten hasta 300 caracteres y la lista de fotos tiene un límite propio." };

  const heroImageUrls = entries
    .find((entry) => entry.key === "hero_image_url")?.value
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean) ?? [];
  if (heroImageUrls.length > 8) return { error: "La portada admite hasta 8 fotos." };
  for (const imageUrl of heroImageUrls) {
    try {
      if (new URL(imageUrl).protocol !== "https:" || imageUrl.length > 2000) {
        return { error: "Las fotos de portada deben tener URLs HTTPS válidas." };
      }
    } catch {
      return { error: "Las fotos de portada deben tener URLs HTTPS válidas." };
    }
  }

  try {
    const sql = getDatabase();
    await sql`
      insert into public.site_settings (key, value)
      select setting.key, setting.value
      from jsonb_to_recordset(${JSON.stringify(entries)}::jsonb) as setting(key text, value text)
      on conflict (key) do update
      set value = excluded.value, updated_at = now()
    `;
    revalidatePath("/");
    revalidatePath("/admin");
    return { success: "Textos de la página actualizados." };
  } catch (error) {
    console.error("No se pudo guardar el contenido de la página.", error);
    return { error: "No se pudo guardar. Verificá que la migración de contenido esté aplicada en Neon." };
  }
}

export async function setProductActiveAction(
  _previousState: ProductActionState | null,
  formData: FormData,
): Promise<ProductActionState> {
  const access = await getOwnerAccess();
  if (access.status !== "owner") return { error: "Iniciá sesión como dueña para cambiar el catálogo." };

  const productId = readText(formData, "productId");
  const isActive = readText(formData, "isActive") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return { error: "Producto inválido." };

  try {
    const sql = getDatabase();
    const updated = await sql`
      update public.products
      set is_active = ${isActive}, updated_at = now()
      where id = ${productId}
      returning id
    `;
    if (updated.length === 0) return { error: "No encontramos ese producto." };
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: isActive ? "Producto visible en el catálogo." : "Producto archivado; se puede recuperar." };
  } catch (error) {
    console.error("No se pudo cambiar el estado del producto.", error);
    return { error: "No se pudo actualizar el producto." };
  }
}

function getManagedCloudinaryPublicId(imageUrl: string, cloudName: string) {
  try {
    const url = new URL(imageUrl);
    if (url.hostname !== "res.cloudinary.com") return null;

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments[0] !== cloudName || segments[1] !== "image" || segments[2] !== "upload") {
      return null;
    }

    const assetSegments = segments.slice(3);
    if (assetSegments[0]?.match(/^v\d+$/)) assetSegments.shift();
    const fileName = assetSegments.at(-1);
    if (!fileName || !fileName.includes(".")) return null;

    assetSegments[assetSegments.length - 1] = fileName.replace(/\.[^.]+$/, "");
    const publicId = assetSegments.join("/");
    return publicId.startsWith("tuflitas/products/") ? publicId : null;
  } catch {
    return null;
  }
}

export async function archiveProductAndDeleteImagesAction(
  _previousState: ProductActionState | null,
  formData: FormData,
): Promise<ProductActionState> {
  const access = await getOwnerAccess();
  if (access.status !== "owner") {
    return { error: "Iniciá sesión con la cuenta autorizada para administrar el catálogo." };
  }

  const productId = readText(formData, "productId");
  const confirmation = readText(formData, "confirmation");
  if (!/^[0-9a-f-]{36}$/i.test(productId)) return { error: "Producto inválido." };

  try {
    const sql = getDatabase();
    const rows = await sql`
      select product.name, image.image_url as "imageUrl"
      from public.products as product
      left join public.product_images as image on image.product_id = product.id
      where product.id = ${productId}
    `;
    if (rows.length === 0) return { error: "No encontramos ese producto." };

    const productName = rows[0].name as string;
    if (confirmation !== productName) {
      return { error: "El nombre de confirmación no coincide con el producto." };
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const publicIds = [...new Set(rows
      .map((row) => row.imageUrl as string | null)
      .filter((url): url is string => Boolean(url))
      .map((url) => cloudName ? getManagedCloudinaryPublicId(url, cloudName) : null)
      .filter((publicId): publicId is string => Boolean(publicId)))];

    if (publicIds.length > 0 && (!cloudName || !apiKey || !apiSecret)) {
      return { error: "Falta la configuración de Cloudinary; no se archivó ni se borró ninguna foto." };
    }

    const archived = await sql`
      update public.products
      set is_active = false, updated_at = now()
      where id = ${productId}
      returning id
    `;
    if (archived.length === 0) return { error: "No encontramos ese producto." };
    revalidatePath("/");

    if (publicIds.length > 0 && cloudName && apiKey && apiSecret) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
      try {
        const results = await Promise.all(publicIds.map((publicId) =>
          cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: "image" }),
        ));
        if (results.some((result) => result.result !== "ok" && result.result !== "not found")) {
          throw new Error("Cloudinary did not confirm deletion for every managed image.");
        }
      } catch (error) {
        console.error("El producto se archivó, pero no se pudieron borrar todas sus fotos.", error);
        return { error: "El producto quedó archivado. No se pudieron borrar todas las fotos; volvé a intentar." };
      }
    }

    await sql`delete from public.product_images where product_id = ${productId}`;
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: "Producto retirado del catálogo. Se borraron las fotos de Cloudinary y se conservó el historial." };
  } catch (error) {
    console.error("No se pudo retirar el producto.", error);
    return { error: "No se pudo retirar el producto. Sus datos se conservaron." };
  }
}

export async function moveProductAction(formData: FormData) {
  const access = await getOwnerAccess();
  if (access.status !== "owner") return;

  const productId = readText(formData, "productId");
  const direction = readText(formData, "direction");
  if (!/^[0-9a-f-]{36}$/i.test(productId) || !["up", "down"].includes(direction)) return;

  try {
    const sql = getDatabase();
    const products = await sql`
      select id
      from public.products
      where is_active = true
      order by display_order asc, created_at desc, name asc
    `;
    const currentIndex = products.findIndex((product) => product.id === productId);
    const targetIndex = currentIndex + (direction === "up" ? -1 : 1);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= products.length) return;

    const ordered = [...products];
    [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];
    await sql.transaction(ordered.map((product, index) => sql`
      update public.products
      set display_order = ${index}
      where id = ${product.id} and is_active = true
    `));
    revalidatePath("/admin");
    revalidatePath("/");
  } catch (error) {
    console.error("No se pudo mover el producto en el catálogo.", error);
  }
}

export async function createCategoryAction(
  _previousState: ProductActionState | null,
  formData: FormData,
): Promise<ProductActionState> {
  const access = await getOwnerAccess();
  if (access.status !== "owner") return { error: "Iniciá sesión como dueña para administrar categorías." };

  const name = readText(formData, "name");
  const slug = slugify(name);
  if (name.length < 2 || name.length > 60 || !slug) {
    return { error: "El nombre de categoría debe tener entre 2 y 60 caracteres." };
  }

  try {
    const sql = getDatabase();
    const created = await sql`
      insert into public.categories (name, slug, sort_order)
      values (
        ${name},
        ${slug},
        (select coalesce(max(sort_order) + 1, 0) from public.categories)
      )
      on conflict do nothing
      returning id
    `;
    if (created.length === 0) return { error: "Ya existe una categoría con ese nombre." };
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: "Categoría creada." };
  } catch (error) {
    console.error("No se pudo crear la categoría.", error);
    return { error: "No se pudo crear la categoría." };
  }
}

export async function updateCategoryAction(
  _previousState: ProductActionState | null,
  formData: FormData,
): Promise<ProductActionState> {
  const access = await getOwnerAccess();
  if (access.status !== "owner") return { error: "Iniciá sesión como dueña para administrar categorías." };

  const categoryId = readText(formData, "categoryId");
  const name = readText(formData, "name");
  const slug = slugify(name);
  const isActive = formData.get("isActive") === "on";
  if (!/^[0-9a-f-]{36}$/i.test(categoryId)) return { error: "Categoría inválida." };
  if (name.length < 2 || name.length > 60 || !slug) {
    return { error: "El nombre de categoría debe tener entre 2 y 60 caracteres." };
  }

  try {
    const sql = getDatabase();
    const updated = await sql`
      update public.categories
      set name = ${name}, slug = ${slug}, is_active = ${isActive}
      where id = ${categoryId}
      returning id
    `;
    if (updated.length === 0) return { error: "No encontramos esa categoría." };
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: isActive ? "Categoría actualizada." : "Categoría archivada; sus productos se conservaron." };
  } catch (error) {
    console.error("No se pudo actualizar la categoría.", error);
    return { error: "No se pudo actualizar. Quizá ya existe otra categoría con ese nombre." };
  }
}

export async function moveCategoryAction(formData: FormData) {
  const access = await getOwnerAccess();
  if (access.status !== "owner") return;

  const categoryId = readText(formData, "categoryId");
  const direction = readText(formData, "direction");
  if (!/^[0-9a-f-]{36}$/i.test(categoryId) || !["up", "down"].includes(direction)) return;

  try {
    const sql = getDatabase();
    const categories = await sql`
      select id
      from public.categories
      where is_active = true
      order by sort_order asc, name asc
    `;
    const currentIndex = categories.findIndex((category) => category.id === categoryId);
    const targetIndex = currentIndex + (direction === "up" ? -1 : 1);
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= categories.length) return;

    const ordered = [...categories];
    [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];
    await sql.transaction(ordered.map((category, index) => sql`
      update public.categories
      set sort_order = ${index}
      where id = ${category.id} and is_active = true
    `));
    revalidatePath("/admin");
    revalidatePath("/");
  } catch (error) {
    console.error("No se pudo ordenar las categorías.", error);
  }
}

export async function recordStockMovementAction(
  _previousState: ProductActionState | null,
  formData: FormData,
): Promise<ProductActionState> {
  const access = await getOwnerAccess();
  if (access.status !== "owner") return { error: "Iniciá sesión como dueña para cambiar el stock." };

  const variantId = readText(formData, "variantId");
  const movementType = readText(formData, "movementType");
  const note = readText(formData, "note");
  const enteredQuantity = Number(readText(formData, "quantity"));
  if (!/^[0-9a-f-]{36}$/i.test(variantId)) return { error: "Elegí una variante del catálogo." };
  if (!(["sale", "return", "adjustment"] as const).includes(movementType as "sale" | "return" | "adjustment")) {
    return { error: "Elegí el tipo de movimiento." };
  }
  if (!Number.isInteger(enteredQuantity) || enteredQuantity === 0 || Math.abs(enteredQuantity) > 10000) {
    return { error: "Ingresá una cantidad entera distinta de cero, hasta 10000 unidades." };
  }
  if (note.length > 240) return { error: "La nota no puede superar 240 caracteres." };

  const delta = movementType === "sale"
    ? -Math.abs(enteredQuantity)
    : movementType === "return"
      ? Math.abs(enteredQuantity)
      : enteredQuantity;

  try {
    const sql = getDatabase();
    const changed = await sql`
      with updated_variant as (
        update public.product_variants
        set stock_quantity = stock_quantity + ${delta}
        where id = ${variantId}
          and is_active = true
          and stock_quantity + ${delta} >= 0
        returning id
      ),
      movement as (
        insert into public.stock_movements (variant_id, movement_type, quantity_delta, note)
        select id, ${movementType}, ${delta}, ${note}
        from updated_variant
        returning id
      )
      select id from movement
    `;
    if (changed.length === 0) return { error: "No hay stock suficiente o la variante está archivada." };
    revalidatePath("/admin");
    revalidatePath("/");
    return { success: "Movimiento registrado y stock actualizado." };
  } catch (error) {
    console.error("No se pudo registrar el movimiento de stock.", error);
    return { error: "No se pudo actualizar el stock." };
  }
}