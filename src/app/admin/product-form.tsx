"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { createProductAction, type ProductActionState } from "./actions";
import { ProductImagesInput } from "./product-images-input";

type CategoryOption = {
  name: string;
  slug: string;
};

type VariantRow = {
  id: number;
  size: string;
  color: string;
  stock: string;
};

export function ProductForm({ categories }: { categories: CategoryOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [variants, setVariants] = useState<VariantRow[]>([
    { id: 1, size: "Único", color: "Único", stock: "0" },
  ]);
  const [nextVariantId, setNextVariantId] = useState(2);
  const [photoInputKey, setPhotoInputKey] = useState(0);

  function clearForm() {
    formRef.current?.reset();
    setVariants([{ id: 1, size: "Único", color: "Único", stock: "0" }]);
    setNextVariantId(2);
    setPhotoInputKey((current) => current + 1);
  }

  const [state, formAction, pending] = useActionState(async (previousState: ProductActionState | null, formData: FormData) => {
    const result = await createProductAction(previousState, formData);
    if (result.success) clearForm();
    return result;
  }, null);

  const variantsJson = JSON.stringify(
    variants.map(({ size, color, stock }) => ({ size, color, stock: Number(stock) })),
  );

  function updateVariant(id: number, field: keyof Omit<VariantRow, "id">, value: string) {
    setVariants((current) => current.map((variant) =>
      variant.id === id ? { ...variant, [field]: value } : variant,
    ));
  }

  function addVariant() {
    setVariants((current) => [...current, { id: nextVariantId, size: "", color: "", stock: "0" }]);
    setNextVariantId((current) => current + 1);
  }

  function removeVariant(id: number) {
    setVariants((current) => current.length > 1 ? current.filter((variant) => variant.id !== id) : current);
  }

  return (
    <form action={formAction} className="product-form" ref={formRef}>
      <div className="product-form-grid">
        <label>
          Nombre del producto
          <input maxLength={120} name="name" placeholder="Ej.: Pijama soft" required />
        </label>
        <label>
          Categoría
          <select defaultValue="" name="category" required>
            <option disabled value="">Elegir categoría</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>{category.name}</option>
            ))}
          </select>
        </label>
        <label>
          Precio en pesos argentinos
          <input min="1" name="price" placeholder="35000" required step="0.01" type="number" />
        </label>
        <label>
          Precio de oferta (opcional)
          <input min="1" name="discountPrice" placeholder="Dejá vacío si no hay oferta" step="0.01" type="number" />
          <span className="field-hint">Debe ser menor al precio normal.</span>
        </label>
        <label className="product-description-field">
          Descripción
          <textarea maxLength={2000} name="description" placeholder="Materiales, detalles y cuidados" rows={3} />
        </label>
      </div>

      <fieldset className="variant-fieldset">
        <legend>Talles, colores y stock</legend>
        <input name="variants" type="hidden" value={variantsJson} />
        <div className="variant-list">
          {variants.map((variant, index) => (
            <div className="variant-row" key={variant.id}>
              <label>
                <span>Talle {index + 1}</span>
                <input
                  maxLength={32}
                  onChange={(event) => updateVariant(variant.id, "size", event.target.value)}
                  placeholder="Único, M, 37/38"
                  required
                  value={variant.size}
                />
              </label>
              <label>
                <span>Color</span>
                <input
                  maxLength={48}
                  onChange={(event) => updateVariant(variant.id, "color", event.target.value)}
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
                  onChange={(event) => updateVariant(variant.id, "stock", event.target.value)}
                  required
                  type="number"
                  value={variant.stock}
                />
              </label>
              <button
                aria-label={`Quitar variante ${index + 1}`}
                className="remove-variant-button"
                disabled={variants.length === 1}
                onClick={() => removeVariant(variant.id)}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="add-variant-button" onClick={addVariant} type="button">
          Agregar talle o color
        </button>
      </fieldset>

      <ProductImagesInput key={photoInputKey} />

      <div className="product-flags">
        <label><input name="isNew" type="checkbox" /> Marcar como nuevo ingreso</label>
        <label><input name="isFeatured" type="checkbox" /> Recomendar en el catálogo</label>
      </div>

      {state?.error && <p className="product-form-error" role="alert">{state.error}</p>}
      {state?.success && <p className="product-form-success" role="status">{state.success}</p>}
      <div className="product-form-footer">
        <button className="save-product-button" disabled={pending} type="submit">
          {pending ? "Guardando…" : "Guardar producto"}
        </button>
        <button className="clear-product-button" onClick={clearForm} type="button">Limpiar</button>
      </div>
    </form>
  );
}