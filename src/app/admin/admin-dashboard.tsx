"use client";

import { useState } from "react";
import { ProductForm } from "./product-form";
import { ProductEditForm, type EditableProduct } from "./product-edit-form";
import { SiteContentForm } from "./site-content-form";
import { CategoryManager, type AdminCategory } from "./category-manager";
import { StockManager, type StockMovementRow, type StockVariantOption } from "./stock-manager";
import { moveProductAction } from "./actions";
import type { SiteContent } from "@/lib/site-content";

type TopViewedProduct = {
  productId: string;
  productName: string;
  imageUrl: string | null;
  views: number;
  cartAdditions: number;
};

export function AdminDashboard({
  categories,
  products,
  stockVariants,
  movements,
  topViewedProducts,
  pageVisitsLast30Days,
  pageVisitsAvailable,
  content,
  siteContentReady,
}: {
  categories: AdminCategory[];
  products: EditableProduct[];
  stockVariants: StockVariantOption[];
  movements: StockMovementRow[];
  topViewedProducts: TopViewedProduct[];
  pageVisitsLast30Days: number;
  pageVisitsAvailable: boolean;
  content: SiteContent;
  siteContentReady: boolean;
}) {
  const [section, setSection] = useState<"products" | "categories" | "stock" | "metrics" | "page">("products");
  const activeProducts = products.filter((product) => product.isActive);
  const activeCategories = categories.filter((category) => category.isActive);

  return (
    <>
      <div aria-label="Secciones de administración" className="admin-tabs" role="tablist">
        <button
          aria-selected={section === "products"}
          className={section === "products" ? "admin-tab is-active" : "admin-tab"}
          onClick={() => setSection("products")}
          role="tab"
          type="button"
        >
          Productos
        </button>
        <button
          aria-selected={section === "categories"}
          className={section === "categories" ? "admin-tab is-active" : "admin-tab"}
          onClick={() => setSection("categories")}
          role="tab"
          type="button"
        >
          Categorías
        </button>
        <button
          aria-selected={section === "stock"}
          className={section === "stock" ? "admin-tab is-active" : "admin-tab"}
          onClick={() => setSection("stock")}
          role="tab"
          type="button"
        >
          Stock y movimientos
        </button>
        <button
          aria-selected={section === "metrics"}
          className={section === "metrics" ? "admin-tab is-active" : "admin-tab"}
          onClick={() => setSection("metrics")}
          role="tab"
          type="button"
        >
          Métricas
        </button>
        <button
          aria-selected={section === "page"}
          className={section === "page" ? "admin-tab is-active" : "admin-tab"}
          onClick={() => setSection("page")}
          role="tab"
          type="button"
        >
          Página principal
        </button>
      </div>

      {section === "products" ? (
        <div aria-label="Administrar productos" role="tabpanel">
          <section className="admin-section" aria-labelledby="new-product-title">
            <h2 id="new-product-title">Nuevo producto</h2>
            <ProductForm categories={activeCategories} />
          </section>

          <section className="admin-section" aria-labelledby="inventory-title">
            <div className="admin-section-heading">
              <h2 id="inventory-title">Inventario</h2>
              <span>{products.length} productos</span>
            </div>
            {products.length === 0 ? (
              <p className="inventory-empty">Todavía no hay productos cargados.</p>
            ) : (
              <div className="product-edit-list">
                {products.map((product) => {
                  const position = activeProducts.findIndex((item) => item.id === product.id);
                  const coverImage = product.images[0]?.url;

                  return (
                    <div className={product.isActive ? "product-admin-row" : "product-admin-row is-archived"} key={product.id}>
                      <details className="product-edit-item">
                        <summary className="product-edit-summary">
                          <span
                            aria-label={coverImage ? `Foto de ${product.name}` : undefined}
                            className={coverImage ? "product-edit-thumbnail" : "product-edit-thumbnail is-empty"}
                            role={coverImage ? "img" : undefined}
                            style={coverImage ? { backgroundImage: `url("${coverImage}")` } : undefined}
                          >
                            {!coverImage && <span>Sin foto</span>}
                          </span>
                          <span className="product-edit-summary-copy">
                            <span className="product-edit-name">{product.name}</span>
                            <span>{product.category}{product.isActive ? "" : " · Archivado"}</span>
                          </span>
                          <span>{product.variants.filter((variant) => variant.isActive).reduce((total, variant) => total + variant.stock, 0)} unidades</span>
                        </summary>
                        <ProductEditForm categories={categories} product={product} />
                      </details>
                      {product.isActive && (
                        <div className="product-order-controls" aria-label={`Orden de ${product.name}`}>
                          <form action={moveProductAction}>
                            <input name="productId" type="hidden" value={product.id} />
                            <input name="direction" type="hidden" value="up" />
                            <button aria-label={`Subir ${product.name}`} disabled={position <= 0} type="submit">↑</button>
                          </form>
                          <form action={moveProductAction}>
                            <input name="productId" type="hidden" value={product.id} />
                            <input name="direction" type="hidden" value="down" />
                            <button aria-label={`Bajar ${product.name}`} disabled={position >= activeProducts.length - 1} type="submit">↓</button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : section === "categories" ? (
        <section aria-label="Administrar categorías" className="admin-section" role="tabpanel">
          <h2>Categorías de productos</h2>
          <p className="admin-helper-text">Ocultá una categoría para quitarla de la tienda sin borrar los productos asociados.</p>
          <CategoryManager categories={categories} />
        </section>
      ) : section === "stock" ? (
        <section aria-label="Administrar movimientos de stock" className="admin-section" role="tabpanel">
          <h2>Stock e historial</h2>
          <p className="admin-helper-text">Registrá ventas, devoluciones o correcciones; cada cambio queda en el historial.</p>
          <StockManager movements={movements} variants={stockVariants} />
        </section>
      ) : section === "metrics" ? (
        <section aria-label="Métricas del catálogo" className="admin-section" role="tabpanel">
          <div aria-label="Visitas a la página" className="page-visits-summary" role="group">
            <div>
              <span>Visitas a la página</span>
              <strong>{pageVisitsAvailable ? pageVisitsLast30Days.toLocaleString("es-AR") : "—"}</strong>
            </div>
            <span>{pageVisitsAvailable ? "Últimos 30 días" : "Aplicá la migración 006 para activar esta métrica"}</span>
          </div>
          <div className="admin-section-heading">
            <h2>Productos más vistos</h2>
            <span>Últimos 30 días</span>
          </div>
          {topViewedProducts.length === 0 ? (
            <p className="inventory-empty">Todavía no hay visitas registradas. Las vistas a productos se irán contando desde el catálogo.</p>
          ) : (
            <ol className="viewed-products-list">
              {topViewedProducts.map((product, index) => {
                const maxViews = topViewedProducts[0].views || 1;
                const barWidth = Math.max(4, Math.round((product.views / maxViews) * 100));

                return (
                  <li className="viewed-product-row" key={product.productId}>
                    <span className="viewed-product-rank">{index + 1}</span>
                    <span
                      aria-label={product.imageUrl ? `Foto de ${product.productName}` : `Sin foto de ${product.productName}`}
                      className="viewed-product-image"
                      role="img"
                      style={product.imageUrl ? { backgroundImage: `url("${product.imageUrl}")` } : undefined}
                    >
                      {!product.imageUrl && "Sin foto"}
                    </span>
                    <div className="viewed-product-main">
                      <div className="viewed-product-heading">
                        <strong>{product.productName}</strong>
                        <span>{product.views} vistas · {product.cartAdditions} agregados</span>
                      </div>
                      <div aria-label={`${product.views} vistas`} className="viewed-product-track">
                        <span style={{ width: `${barWidth}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="metric-privacy-note">Las visitas a la página y a cada producto se cuentan una vez por pestaña durante la sesión; no guardamos datos personales.</p>
        </section>
      ) : (
        <section aria-label="Editar página principal" className="admin-section" role="tabpanel">
          <h2>Textos de la página principal</h2>
          {siteContentReady ? (
            <SiteContentForm content={content} />
          ) : (
            <p className="admin-inline-error">
              Falta aplicar la migración <code>002_site_content.sql</code> en Neon para guardar estos textos.
            </p>
          )}
        </section>
      )}
    </>
  );
}