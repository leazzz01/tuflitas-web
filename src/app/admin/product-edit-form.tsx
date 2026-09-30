"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateProductAction } from "./actions";
import { ProductImagesInput } from "./product-images-input";
import { ArchiveProductForm } from "./archive-product-form";

type CategoryOption = {
  name: string;
  slug: string;
  isActive?: boolean;
};

export type EditableProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  categorySlug: string;
  price: number;
  discountPrice: number | null;
  isActive: boolean;
  displayOrder: number;
  isNew: boolean;
  isFeatured: boolean;
  variants: {
    id: string;
    size: string;
    color: string;
    stock: number;
    isActive: boolean;
  }[];
  images: {
    url: string;
  }[];
};

type VariantRow = {
  id: string | null;
  key: string;
  size: string;
  color: string;
  stock: string;
  isActive: boolean;
};

export function ProductEditForm({
  product,
  categories,
}: {
  product: EditableProduct;
  categories: CategoryOption[];
}) {
  const [state, formAction, pending] = useActionState(updateProductAction, null);
  const [variants, setVariants] = useState<VariantRow[]>(product.variants.map((variant) => ({
    id: variant.id,
    key: variant.id,
    size: variant.size,
    color: variant.color,
    stock: String(variant.stock),
    isActive: variant.isActive,
  })));
  const [nextVariantKey, setNextVariantKey] = useState(0);
  const variantsJson = JSON.stringify(
    variants.map(({ id, size, color, stock, isActive }) => ({ id, size, color, stock: Number(stock), isActive })),
  );

  function updateVariant(key: string, field: "size" | "color" | "stock" | "isActive", value: string | boolean) {
    setVariants((current) => current.map((variant) =>
      variant.key === key ? { ...variant, [field]: value } : variant,
    ));
  }

  function addVariant() {
    const key = `new-${nextVariantKey}`;
    setVariants((current) => [...current, { id: null, key, size: "", color: "", stock: "0", isActive: true }]);
    setNextVariantKey((current) => current + 1);
  }

  return (
    <div className="product-edit-shell">
    <form action={formAction} className="product-edit-form">
      <input name="productId" type="hidden" value={product.id} />
      <input name="variants" type="hidden" value={variantsJson} />
      <div className="product-form-grid">
        <label>
          Nombre del producto
          <input defaultValue={product.name} maxLength={120} name="name" required />
        </label>
        <label>
          Categoría
          <select defaultValue={product.categorySlug} name="category" required>
            {categories.filter((category) => category.isActive !== false || category.slug === product.categorySlug).map((category) => (
              <option key={category.slug} value={category.slug}>{category.name}</option>
            ))}
          </select>
        </label>
        <label>
          Precio en pesos argentinos
          <input defaultValue={product.price} min="1" name="price" required step="0.01" type="number" />
        </label>
        <label>
          Precio de oferta (opcional)
          <input defaultValue={product.discountPrice ?? ""} min="1" name="discountPrice" step="0.01" type="number" />
          <span className="field-hint">Dejalo vacío para quitar la oferta.</span>
        </label>
        <label className="product-description-field">
          Descripción
          <textarea defaultValue={product.description} maxLength={2000} name="description" rows={3} />
        </label>
      </div>

      <div className="product-flags">
        <label><input defaultChecked={product.isActive} name="isActive" type="checkbox" /> Visible en el catálogo</label>
        <label><input defaultChecked={product.isNew} name="isNew" type="checkbox" /> Nuevo ingreso</label>
        <label><input defaultChecked={product.isFeatured} name="isFeatured" type="checkbox" /> Recomendar en el catálogo</label>
      </div>

      <fieldset className="variant-fieldset">
        <legend>Talles, colores y unidades</legend>
        <div className="variant-list">
          {variants.map((variant, index) => (
            <div className="variant-row" key={variant.key}>
              <label>
                <span>Talle {index + 1}</span>
                <input
                  maxLength={32}
                  onChange={(event) => updateVariant(variant.key, "size", event.target.value)}
                  placeholder="Único, M, 37/38"
                  required
                  value={variant.size}
                />
              </label>
              <label>
                <span>Color</span>
                <input
                  maxLength={48}
                  onChange={(event) => updateVariant(variant.key, "color", event.target.value)}
                  placeholder="Natural"
                  required
                  value={variant.color}
                />
              </label>
              <label>
                <span>Unidades</span>
                <input
                  max="10000"
                  min="0"
                  onChange={(event) => updateVariant(variant.key, "stock", event.target.value)}
                  required
                  type="number"
                  value={variant.stock}
                />
              </label>
              <label className="variant-visibility">
                <input
                  checked={variant.isActive}
                  onChange={(event) => updateVariant(variant.key, "isActive", event.target.checked)}
                  type="checkbox"
                />
                <span>Disponible</span>
              </label>
            </div>
          ))}
        </div>
        <button className="add-variant-button" onClick={addVariant} type="button">
          Agregar talle o color
        </button>
      </fieldset>

      <ProductImagesInput defaultUrls={product.images.map((image) => image.url).join("\n")} />

      {state?.error && <p className="product-form-error" role="alert">{state.error}</p>}
      {state?.success && <p className="product-form-success" role="status">{state.success}</p>}
      <button className="save-product-button" disabled={pending} type="submit">
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
    <ArchiveProductForm productId={product.id} productName={product.name} />
    </div>
  );
}