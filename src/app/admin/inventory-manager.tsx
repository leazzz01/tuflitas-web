"use client";

import { useEffect, useState } from "react";
import { moveProductAction } from "./actions";
import type { AdminCategory } from "./category-manager";
import { ProductEditForm, type EditableProduct } from "./product-edit-form";
import { optimizedImageUrl } from "@/lib/cloudinary-image";

const PAGE_SIZE = 15;
const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");
}

function unitsOf(product: EditableProduct) {
  return product.variants
    .filter((variant) => variant.isActive)
    .reduce((total, variant) => total + variant.stock, 0);
}

export function InventoryManager({
  categories,
  products,
}: {
  categories: AdminCategory[];
  products: EditableProduct[];
}) {
  const [search, setSearch] = useState("");
  const [categorySlug, setCategorySlug] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const term = normalize(search.trim());
  const filtered = products.filter((product) =>
    (categorySlug === "all" || product.categorySlug === categorySlug)
    && (!term || normalize(product.name).includes(term)),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selected = products.find((product) => product.id === selectedId) ?? null;
  const activeProducts = products.filter((product) => product.isActive);
  const selectedPosition = selected ? activeProducts.findIndex((product) => product.id === selected.id) : -1;
  const isModalOpen = selected !== null;

  useEffect(() => {
    if (!isModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedId(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

  return (
    <>
      <div className="inventory-toolbar">
        <label className="inventory-search">
          <span className="sr-only">Buscar por nombre</span>
          <input
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nombre"
            type="search"
            value={search}
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por categoría</span>
          <select
            onChange={(event) => {
              setCategorySlug(event.target.value);
              setPage(1);
            }}
            value={categorySlug}
          >
            <option value="all">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>{category.name}</option>
            ))}
          </select>
        </label>
        <span className="inventory-count">{filtered.length} de {products.length} productos</span>
      </div>

      {products.length === 0 ? (
        <p className="inventory-empty">Todavía no hay productos cargados.</p>
      ) : filtered.length === 0 ? (
        <p className="inventory-empty">No hay productos que coincidan con esos filtros.</p>
      ) : (
        <ul className="inventory-grid">
          {visible.map((product) => {
            const cover = product.images[0]?.url;

            return (
              <li key={product.id}>
                <button
                  aria-label={`Editar ${product.name}`}
                  className={product.isActive ? "inventory-card" : "inventory-card is-archived"}
                  onClick={() => setSelectedId(product.id)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="inventory-card-image"
                    style={cover ? { backgroundImage: `url("${optimizedImageUrl(cover, 400)}")` } : undefined}
                  >
                    {!cover && "Sin foto"}
                  </span>
                  <span className="inventory-card-name">{product.name}</span>
                  <span className="inventory-card-meta">
                    {product.category}{product.isActive ? "" : " · Archivado"}
                  </span>
                  <span className="inventory-card-meta">
                    {unitsOf(product)} unidades · {currency.format(product.discountPrice ?? product.price)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav aria-label="Paginación del inventario" className="inventory-pagination">
          <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} type="button">
            Anterior
          </button>
          <span>Página {currentPage} de {totalPages}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} type="button">
            Siguiente
          </button>
        </nav>
      )}

      {selected && (
        <div
          className="inventory-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedId(null);
          }}
        >
          <section
            aria-label={`Editar ${selected.name}`}
            aria-modal="true"
            className="inventory-modal"
            role="dialog"
          >
            <header className="inventory-modal-header">
              <div>
                <p className="eyebrow">Editar producto</p>
                <h2>{selected.name}</h2>
              </div>
              <button
                aria-label="Cerrar"
                className="inventory-modal-close"
                onClick={() => setSelectedId(null)}
                type="button"
              >
                ×
              </button>
            </header>
            {selected.isActive && (
              <div aria-label={`Orden de ${selected.name} en la tienda`} className="inventory-order" role="group">
                <span>Orden en la tienda</span>
                <form action={moveProductAction}>
                  <input name="productId" type="hidden" value={selected.id} />
                  <input name="direction" type="hidden" value="up" />
                  <button disabled={selectedPosition <= 0} type="submit">↑ Subir</button>
                </form>
                <form action={moveProductAction}>
                  <input name="productId" type="hidden" value={selected.id} />
                  <input name="direction" type="hidden" value="down" />
                  <button disabled={selectedPosition >= activeProducts.length - 1} type="submit">↓ Bajar</button>
                </form>
              </div>
            )}
            <ProductEditForm categories={categories} key={selected.id} product={selected} />
          </section>
        </div>
      )}
    </>
  );
}
