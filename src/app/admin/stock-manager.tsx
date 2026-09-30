"use client";

import { useActionState, useState } from "react";
import { recordStockMovementAction } from "./actions";

export type StockVariantOption = {
  id: string;
  productName: string;
  size: string;
  color: string;
  stock: number;
};

export type StockMovementRow = {
  id: string;
  productName: string;
  size: string;
  color: string;
  movementType: "entry" | "sale" | "return" | "adjustment";
  quantityDelta: number;
  note: string;
  createdAt: string;
};

const movementLabels: Record<StockMovementRow["movementType"], string> = {
  entry: "Entrada",
  sale: "Venta",
  return: "Devolución",
  adjustment: "Ajuste",
};

export function StockManager({
  variants,
  movements,
}: {
  variants: StockVariantOption[];
  movements: StockMovementRow[];
}) {
  const [state, formAction, pending] = useActionState(recordStockMovementAction, null);
  const [movementType, setMovementType] = useState("sale");
  const dateFormatter = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="stock-manager">
      <section className="stock-entry-section" aria-labelledby="stock-entry-title">
        <h2 id="stock-entry-title">Registrar movimiento</h2>
        {variants.length === 0 ? (
          <p className="inventory-empty">Cargá un producto con variantes para empezar a mover stock.</p>
        ) : (
          <form action={formAction} className="stock-movement-form">
            <label>
              Producto, talle y color
              <select defaultValue="" name="variantId" required>
                <option disabled value="">Elegir variante</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.productName} · {variant.size} · {variant.color} · {variant.stock} unidades
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tipo de movimiento
              <select onChange={(event) => setMovementType(event.target.value)} name="movementType" value={movementType}>
                <option value="sale">Venta (descuenta stock)</option>
                <option value="return">Devolución (suma stock)</option>
                <option value="adjustment">Ajuste manual (+ suma, − resta)</option>
              </select>
            </label>
            <label>
              {movementType === "adjustment" ? "Variación de unidades (+/−)" : "Cantidad de unidades"}
              <input
                max={movementType === "adjustment" ? "10000" : undefined}
                min={movementType === "adjustment" ? "-10000" : "1"}
                name="quantity"
                required
                type="number"
              />
            </label>
            <label>
              Nota (opcional)
              <input maxLength={240} name="note" placeholder="Ej.: Venta en feria" />
            </label>
            {state?.error && <p className="product-form-error" role="alert">{state.error}</p>}
            {state?.success && <p className="product-form-success" role="status">{state.success}</p>}
            <button className="save-product-button" disabled={pending} type="submit">
              {pending ? "Registrando…" : "Registrar movimiento"}
            </button>
          </form>
        )}
      </section>

      <section className="stock-history-section" aria-labelledby="stock-history-title">
        <div className="admin-section-heading">
          <h2 id="stock-history-title">Movimientos recientes</h2>
          <span>{movements.length} registros</span>
        </div>
        {movements.length === 0 ? (
          <p className="inventory-empty">Todavía no hay movimientos registrados.</p>
        ) : (
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr><th>Fecha</th><th>Producto</th><th>Movimiento</th><th>Cambio</th><th>Nota</th></tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{dateFormatter.format(new Date(movement.createdAt))}</td>
                    <td>{movement.productName} · {movement.size} · {movement.color}</td>
                    <td>{movementLabels[movement.movementType]}</td>
                    <td>{movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta}</td>
                    <td>{movement.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

