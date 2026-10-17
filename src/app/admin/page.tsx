import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOwnerAccess } from "@/lib/auth/owner";
import { getDatabase } from "@/lib/db";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";
import { signOutAction } from "@/app/auth/actions";
import { ThemeToggle } from "../theme-toggle";
import { AdminDashboard } from "./admin-dashboard";
import type { EditableProduct } from "./product-edit-form";
import type { StockMovementRow, StockVariantOption } from "./stock-manager";

type ProductMetric = {
  productId: string;
  productName: string;
  imageUrl: string | null;
  views: number;
  cartAdditions: number;
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const access = await getOwnerAccess();

  if (access.status === "signed-out") redirect("/auth/sign-in");
  if (access.status === "not-owner") notFound();

  if (access.status === "not-configured") {
    return (
      <main className="admin-page">
        <section className="admin-content">
          <p className="eyebrow">Configuración pendiente</p>
          <h1>Preparar el acceso de la dueña</h1>
          <p>Falta completar las variables privadas de Neon Auth y definir el email autorizado en <code>.env.local</code>.</p>
        </section>
      </main>
    );
  }

  let categories: {
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
    isActive: boolean;
  }[] = [];
  let products: EditableProduct[] = [];
  let movements: StockMovementRow[] = [];
  let topViewedProducts: ProductMetric[] = [];
  let pageVisitsLast30Days = 0;
  let pageVisitsAvailable = false;
  const content: SiteContent = { ...DEFAULT_SITE_CONTENT };
  let catalogError = false;
  let siteContentReady = false;

  try {
    const sql = getDatabase();
    const [categoryRows, productRows, movementRows, metricRows] = await Promise.all([
      sql`
        select id, name, slug, sort_order as "sortOrder", is_active as "isActive"
        from public.categories
        order by sort_order asc, name asc
      `,
      sql`
        select
          product.id,
          product.name,
          product.description,
          category.name as category,
          category.slug as "categorySlug",
          product.price_ars,
          product.discount_price_ars as "discountPrice",
          product.is_active as "isActive",
          product.display_order as "displayOrder",
          product.is_new as "isNew",
          product.is_featured as "isFeatured",
          coalesce(variant_data.variants, '[]'::jsonb) as variants,
          coalesce(image_data.images, '[]'::jsonb) as images
        from public.products as product
        inner join public.categories as category
          on category.id = product.category_id
        left join lateral (
          select jsonb_agg(
            jsonb_build_object(
              'id', variant.id,
              'size', variant.size_label,
              'color', variant.color_name,
              'stock', variant.stock_quantity,
              'isActive', variant.is_active
            ) order by variant.size_label, variant.color_name
          ) as variants
          from public.product_variants as variant
          where variant.product_id = product.id
        ) as variant_data on true
        left join lateral (
          select jsonb_agg(
            jsonb_build_object('url', image.image_url)
            order by image.is_cover desc, image.sort_order, image.created_at
          ) as images
          from public.product_images as image
          where image.product_id = product.id
        ) as image_data on true
        order by product.is_active desc, product.display_order asc, product.created_at desc
        limit 50
      `,
      sql`
        select
          movement.id,
          product.name as "productName",
          variant.size_label as size,
          variant.color_name as color,
          movement.movement_type as "movementType",
          movement.quantity_delta as "quantityDelta",
          movement.note,
          movement.created_at as "createdAt"
        from public.stock_movements as movement
        inner join public.product_variants as variant on variant.id = movement.variant_id
        inner join public.products as product on product.id = variant.product_id
        order by movement.created_at desc
        limit 50
      `,
      sql`
        select
          product.id as "productId",
          product.name as "productName",
          cover_image.image_url as "imageUrl",
          coalesce(sum(metric.views), 0)::integer as views,
          coalesce(sum(metric.cart_additions), 0)::integer as "cartAdditions"
        from public.products as product
        left join public.product_daily_metrics as metric
          on metric.product_id = product.id
          and metric.metric_date >= current_date - 29
        left join lateral (
          select image.image_url
          from public.product_images as image
          where image.product_id = product.id
          order by image.is_cover desc, image.sort_order asc, image.created_at asc
          limit 1
        ) as cover_image on true
        where product.is_active = true
        group by product.id, product.name, cover_image.image_url
        having coalesce(sum(metric.views), 0) > 0
          or coalesce(sum(metric.cart_additions), 0) > 0
        order by views desc, "cartAdditions" desc, product.name asc
        limit 10
      `,
    ]);

    categories = categoryRows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      sortOrder: Number(row.sortOrder),
      isActive: row.isActive,
    }));
    products = productRows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      categorySlug: row.categorySlug,
      price: Number(row.price_ars),
      discountPrice: row.discountPrice === null ? null : Number(row.discountPrice),
      isActive: row.isActive,
      displayOrder: Number(row.displayOrder),
      isNew: row.isNew,
      isFeatured: row.isFeatured,
      variants: row.variants ?? [],
      images: row.images ?? [],
    }));
    movements = movementRows.map((row) => ({
      id: row.id,
      productName: row.productName,
      size: row.size,
      color: row.color,
      movementType: row.movementType,
      quantityDelta: Number(row.quantityDelta),
      note: row.note,
      createdAt: new Date(row.createdAt).toISOString(),
    }));
    topViewedProducts = metricRows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      imageUrl: row.imageUrl ?? null,
      views: Number(row.views),
      cartAdditions: Number(row.cartAdditions),
    }));

    try {
      const pageMetricRows = await sql`
        select coalesce(sum(page_visits), 0)::integer as visits
        from public.site_daily_metrics
        where metric_date >= current_date - 29
      `;
      pageVisitsLast30Days = Number(pageMetricRows[0]?.visits ?? 0);
      pageVisitsAvailable = true;
    } catch (error) {
      console.error("No se pudieron cargar las visitas de la página.", error);
    }

    try {
      const settingsRows = await sql`select key, value from public.site_settings`;
      for (const row of settingsRows) {
        if (row.key in content) content[row.key as keyof SiteContent] = row.value;
      }
      siteContentReady = true;
    } catch {
      siteContentReady = false;
    }
  } catch (error) {
    console.error("No se pudo cargar el inventario del panel.", error);
    catalogError = true;
  }

  const stockVariants: StockVariantOption[] = products
    .filter((product) => product.isActive)
    .flatMap((product) => product.variants
      .filter((variant) => variant.isActive)
      .map((variant) => ({
        id: variant.id,
        productName: product.name,
        size: variant.size,
        color: variant.color,
        stock: variant.stock,
      })));

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link className="brand-mark" href="/">Tuflitas</Link>
        <div className="admin-header-actions">
          <ThemeToggle />
          <form action={signOutAction}>
            <button className="admin-signout" type="submit">Cerrar sesión</button>
          </form>
        </div>
      </header>
      <section className="admin-content">
        <p className="eyebrow">Administración · {access.email}</p>
        <h1>Catálogo de Tuflitas</h1>
        <p>Editá los productos y el contenido público sin entrar a la base de datos.</p>
        {catalogError ? (
          <p className="admin-inline-error">No se pudo cargar el catálogo. Recargá el panel para volver a intentar.</p>
        ) : (
          <AdminDashboard
            categories={categories}
            content={content}
            movements={movements}
            pageVisitsAvailable={pageVisitsAvailable}
            pageVisitsLast30Days={pageVisitsLast30Days}
            products={products}
            siteContentReady={siteContentReady}
            stockVariants={stockVariants}
            topViewedProducts={topViewedProducts}
          />
        )}
      </section>
    </main>
  );
}