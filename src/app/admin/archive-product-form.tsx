"use client";

import { useActionState, useState } from "react";
import { archiveProductAndDeleteImagesAction } from "./actions";

export function ArchiveProductForm({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [state, formAction, pending] = useActionState(archiveProductAndDeleteImagesAction, null);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="archive-product-control">
      {state?.success ? (
        <p className="product-form-success" role="status">{state.success}</p>
      ) : !confirming ? (
        <button className="archive-product-trigger" onClick={() => setConfirming(true)} type="button">
          Retirar del catálogo y borrar fotos
        </button>
      ) : (
        <form action={formAction} className="archive-product-confirm">
          <input name="productId" type="hidden" value={productId} />
          <p>
            El producto dejará de aparecer en la tienda y se borrarán sus fotos de Cloudinary. El historial de stock se conservará.
            Para confirmar, escribí <strong>{productName}</strong>.
          </p>
          <label>
            Confirmar nombre
            <input autoComplete="off" name="confirmation" required />
          </label>
          {state?.error && <p className="product-form-error" role="alert">{state.error}</p>}
          <div className="archive-product-actions">
            <button className="archive-product-confirm-button" disabled={pending} type="submit">
              {pending ? "Retirando…" : "Confirmar retiro"}
            </button>
            <button className="clear-product-button" onClick={() => setConfirming(false)} type="button">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}