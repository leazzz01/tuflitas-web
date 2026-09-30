"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { SiFacebook, SiInstagram, SiTiktok } from "react-icons/si";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/site-content";
import { HomeHero } from "./home-hero";

type Category = {
  name: string;
  slug: string;
};

type SortOrder = "featured" | "low-high" | "high-low";

type ProductVariant = {
  id: string;
  size: string;
  color: string;
  stockQuantity: number;
};

type ProductImage = {
  id: string;
  url: string;
  altText: string;
  isCover: boolean;
  sortOrder: number;
};

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  categorySlug: string;
  price: number;
  discountPrice: number | null;
  isFeatured: boolean;
  isNew: boolean;
  variants: ProductVariant[];
  images: ProductImage[];
};

type CartLine = {
  product: Product;
  variant: ProductVariant;
  quantity: number;
};

const whatsappNumber = "543878648215";
const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function effectivePrice(product: Product) {
  return product.discountPrice ?? product.price;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "error">("loading");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("featured");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const gallerySwipeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      try {
        const [categoriesResponse, productsResponse, contentResponse] = await Promise.all([
          fetch("/api/categories", { cache: "no-store", signal: controller.signal }),
          fetch("/api/products", { cache: "no-store", signal: controller.signal }),
          fetch("/api/site-content", { cache: "no-store", signal: controller.signal }),
        ]);

        if (!categoriesResponse.ok || !productsResponse.ok || !contentResponse.ok) {
          throw new Error("Catalog request failed");
        }

        const [categoryData, productData, contentData] = await Promise.all([
          categoriesResponse.json() as Promise<{ categories: Category[] }>,
          productsResponse.json() as Promise<{ products: Product[] }>,
          contentResponse.json() as Promise<{ content: SiteContent }>,
        ]);

        setCategories(categoryData.categories);
        setProducts(productData.products);
        setSiteContent(contentData.content);
        setCatalogStatus("ready");
      } catch {
        if (!controller.signal.aborted) setCatalogStatus("error");
      }
    }

    void loadCatalog();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const key = "tuflitas:page-visit:v2";
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "pending");
    } catch {
      // Continue without client-side de-duplication when storage is unavailable.
    }

    void fetch("/api/site-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "page_visit" }),
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Page visit was not recorded");
        try {
          sessionStorage.setItem(key, "1");
        } catch {
          // Continue without client-side de-duplication when storage is unavailable.
        }
      })
      .catch(() => {
        try {
          sessionStorage.removeItem(key);
        } catch {
          // Continue without client-side de-duplication when storage is unavailable.
        }
      });
  }, []);

  useEffect(() => {
    if (!activeProduct) return;
    const product = activeProduct;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveProduct(null);
      if (event.key === "ArrowRight" && product.images.length > 1) {
        setActiveImageIndex((index) => (index + 1) % product.images.length);
      }
      if (event.key === "ArrowLeft" && product.images.length > 1) {
        setActiveImageIndex((index) => (index - 1 + product.images.length) % product.images.length);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeProduct]);

  const filteredProducts = useMemo(() => {
    const searchTerm = search.trim().toLocaleLowerCase("es-AR");
    const result = products.filter((product) => {
      const matchesCategory = category === "all" || product.categorySlug === category;
      const matchesSearch = `${product.name} ${product.category} ${product.description}`
        .toLocaleLowerCase("es-AR")
        .includes(searchTerm);
      return matchesCategory && matchesSearch;
    });

    if (sortOrder === "low-high") return result.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    if (sortOrder === "high-low") return result.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    return result;
  }, [category, products, search, sortOrder]);
  const categoryOptions = [{ name: "Todo", slug: "all" }, ...categories];

  const cartCount = cart.reduce((total, line) => total + line.quantity, 0);
  const cartTotal = cart.reduce(
    (total, line) => total + effectivePrice(line.product) * line.quantity,
    0,
  );
  const orderLines = cart
    .map(
      (line) =>
        `${line.quantity} x ${line.product.name} · talle ${line.variant.size} · color ${line.variant.color} · ${currency.format(effectivePrice(line.product) * line.quantity)}`,
    )
    .join("\n");
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hola, quiero consultar por este pedido:\n${orderLines}\nTotal: ${currency.format(cartTotal)}`,
  )}`;

  function trackProductMetric(productId: string, event: "view" | "cart_addition") {
    if (event === "view") {
      try {
        const key = `tuflitas:viewed:${productId}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        // Continue without client-side de-duplication when storage is unavailable.
      }
    }

    void fetch(`/api/products/${productId}/metrics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
      keepalive: true,
    }).catch(() => undefined);
  }

  function openProduct(product: Product) {
    setActiveProduct(product);
    setActiveImageIndex(0);
    trackProductMetric(product.id, "view");
  }

  function addToCart(product: Product, variant: ProductVariant) {
    if (variant.stockQuantity < 1) return;
    const existingLine = cart.find(
      (line) => line.product.id === product.id && line.variant.id === variant.id,
    );
    if (existingLine && existingLine.quantity >= variant.stockQuantity) return;

    setCart((current) => {
      const matchingLine = current.find(
        (line) => line.product.id === product.id && line.variant.id === variant.id,
      );
      if (matchingLine) {
        return current.map((line) =>
          line === matchingLine ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { product, variant, quantity: 1 }];
    });
    trackProductMetric(product.id, "cart_addition");
    setActiveProduct(null);
    setCartOpen(true);
  }

  function updateQuantity(productId: string, variantId: string, change: number) {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === productId && line.variant.id === variantId
            ? {
                ...line,
                quantity: Math.min(line.variant.stockQuantity, line.quantity + change),
              }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  return (
    <main>
      <div className="announcement-bar">
        <span>{siteContent.announcement_primary}</span>
        <span className="announcement-location">{siteContent.announcement_secondary}</span>
      </div>

      <header className="site-header">
        <a className="brand-mark" href="#inicio" aria-label="Tuflitas, inicio">
          tuflitas<span>.</span>
        </a>
        <nav className="main-nav" aria-label="Categorías principales">
          {categories.map((item) => (
            <a href="#catalogo" key={item.slug} onClick={() => setCategory(item.slug)}>
              {item.name}
            </a>
          ))}
        </nav>
        <button className="bag-button" type="button" onClick={() => setCartOpen(true)}>
          Mi bolsa <span>{cartCount}</span>
        </button>
      </header>

      <HomeHero content={siteContent} />

      <section className="catalog-section" id="catalogo">
        <div className="catalog-heading">
          <div>
            <p className="eyebrow">{siteContent.catalog_eyebrow}</p>
            <h2>{siteContent.catalog_title}</h2>
          </div>
          <p className="sample-note">{siteContent.catalog_note}</p>
        </div>

        <div className="catalog-toolbar">
          <div className="category-tabs" role="group" aria-label="Filtrar por categoría">
            {categoryOptions.map((item) => (
              <button
                className={category === item.slug ? "category-tab is-active" : "category-tab"}
                key={item.slug}
                onClick={() => setCategory(item.slug)}
                type="button"
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="catalog-controls">
            <label className="search-control">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Buscar productos"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar"
                type="search"
                value={search}
              />
            </label>
            <label className="sort-control">
              <span className="sr-only">Ordenar productos</span>
              <select
                onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                value={sortOrder}
              >
                <option value="featured">Recomendados</option>
                <option value="low-high">Menor precio</option>
                <option value="high-low">Mayor precio</option>
              </select>
            </label>
          </div>
        </div>

        <div className="product-grid">
          {catalogStatus === "loading" && (
            <p className="empty-results">Estamos buscando los ingresos de Tuflitas…</p>
          )}
          {catalogStatus === "error" && (
            <p className="empty-results">No pudimos cargar el catálogo. Probá recargar la página.</p>
          )}
          {catalogStatus === "ready" && filteredProducts.map((product, index) => {
            const availableVariants = product.variants.filter((variant) => variant.stockQuantity > 0);
            const selectedVariant = availableVariants.find(
              (variant) => variant.id === selectedVariants[product.id],
            ) ?? availableVariants[0];
            const coverImage = product.images.find((image) => image.isCover) ?? product.images[0];
            const productLabel = product.isNew ? "Ingresó" : product.isFeatured ? "Recomendado" : null;

            return (
              <article className="product-card" key={product.id}>
                <button
                  aria-label={`Ver fotos y detalles de ${product.name}`}
                  className="product-image-button"
                  onClick={() => openProduct(product)}
                  type="button"
                >
                  <span
                    className={coverImage ? "product-image" : "product-image product-image-empty"}
                    role={coverImage ? "img" : undefined}
                    aria-label={coverImage ? coverImage.altText || product.name : undefined}
                    style={{
                      backgroundColor: "var(--beige-soft)",
                      backgroundImage: coverImage ? `url("${coverImage.url}")` : "none",
                    }}
                  >
                    {!coverImage && <span className="no-product-image">Foto próximamente</span>}
                    {productLabel && <span className="product-label">{productLabel}</span>}
                    <span className="product-number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="product-image-hint">Ver producto</span>
                  </span>
                </button>
                <div className="product-details">
                  <div className="product-title-row">
                    <div>
                      <p className="product-category">{product.category}</p>
                      <h3>
                        <button className="product-title-button" onClick={() => openProduct(product)} type="button">
                          {product.name}
                        </button>
                      </h3>
                    </div>
                    <p className={product.discountPrice === null ? "product-price" : "product-price has-discount"}>
                      {product.discountPrice !== null && (
                        <>
                          <span className="discount-label">Oferta</span>
                          <del>{currency.format(product.price)}</del>
                        </>
                      )}
                      <strong>{currency.format(effectivePrice(product))}</strong>
                    </p>
                  </div>
                  {product.description && <p className="product-description">{product.description}</p>}
                  <div className="product-actions">
                    <label className="size-picker">
                      <span>Talle</span>
                      <select
                        aria-label={`Elegir talle para ${product.name}`}
                        onChange={(event) => setSelectedVariants((current) => ({
                          ...current,
                          [product.id]: event.target.value,
                        }))}
                        value={selectedVariant?.id ?? ""}
                      >
                        {product.variants.length === 0 && <option value="">Sin variantes</option>}
                        {product.variants.map((variant) => (
                          <option disabled={variant.stockQuantity < 1} key={variant.id} value={variant.id}>
                            {variant.size} · {variant.color}{variant.stockQuantity < 1 ? " · Agotado" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="add-button"
                      disabled={!selectedVariant}
                      onClick={() => selectedVariant && addToCart(product, selectedVariant)}
                      type="button"
                      aria-label={selectedVariant
                        ? `Agregar ${product.name} talle ${selectedVariant.size} a la bolsa`
                        : `${product.name} agotado`}
                    >
                      {selectedVariant ? <>Agregar <span aria-hidden="true">+</span></> : "Agotado"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {catalogStatus === "ready" && filteredProducts.length === 0 && (
            <p className="empty-results">
              {products.length === 0
                ? "Pronto vas a encontrar acá los nuevos ingresos de Tuflitas."
                : "No encontramos productos con esa búsqueda."}
            </p>
          )}
        </div>
        <p className="catalog-disclaimer">
          {siteContent.catalog_disclaimer}
        </p>
      </section>

      <footer className="site-footer">
        <a className="brand-mark" href="#inicio">tuflitas<span>.</span></a>
        <p>Cositas hermosas para disfrutar en casa.</p>
        <a className="site-footer-whatsapp" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">WhatsApp · Salta</a>
        <nav aria-label="Redes sociales" className="social-links">
          <a
            aria-label="Instagram de Tuflitas"
            className="social-link"
            href="https://www.instagram.com/tuflitas.salta/"
            rel="noreferrer"
            target="_blank"
            title="Instagram"
          >
            <SiInstagram aria-hidden="true" />
          </a>
          <a
            aria-label="Facebook de Tuflitas"
            className="social-link"
            href="https://www.facebook.com/tuflitas.salta23/"
            rel="noreferrer"
            target="_blank"
            title="Facebook"
          >
            <SiFacebook aria-hidden="true" />
          </a>
          <a
            aria-label="TikTok de Tuflitas"
            className="social-link"
            href="https://www.tiktok.com/@tuflitas"
            rel="noreferrer"
            target="_blank"
            title="TikTok"
          >
            <SiTiktok aria-hidden="true" />
          </a>
        </nav>
      </footer>

      {activeProduct && (() => {
        const images = activeProduct.images;
        const currentImage = images[activeImageIndex];
        const availableVariants = activeProduct.variants.filter((variant) => variant.stockQuantity > 0);
        const selectedVariant = availableVariants.find(
          (variant) => variant.id === selectedVariants[activeProduct.id],
        ) ?? availableVariants[0];

        return (
          <div
            className="product-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setActiveProduct(null);
            }}
          >
            <section
              aria-label={`Detalles de ${activeProduct.name}`}
              aria-modal="true"
              className="product-modal"
              role="dialog"
            >
              <button
                aria-label="Cerrar producto"
                className="product-modal-close"
                onClick={() => setActiveProduct(null)}
                type="button"
              >
                ×
              </button>
              <div className="product-modal-gallery">
                <div
                  aria-label={currentImage?.altText || activeProduct.name}
                  className={currentImage ? "product-modal-image" : "product-modal-image product-modal-image-empty"}
                  onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
                    if (images.length < 2) return;
                    gallerySwipeStart.current = { x: event.clientX, y: event.clientY };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerUp={(event: PointerEvent<HTMLDivElement>) => {
                    const start = gallerySwipeStart.current;
                    gallerySwipeStart.current = null;
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                    if (!start || images.length < 2) return;

                    const deltaX = event.clientX - start.x;
                    const deltaY = event.clientY - start.y;
                    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;

                    const direction = deltaX < 0 ? 1 : -1;
                    setActiveImageIndex((index) => (index + direction + images.length) % images.length);
                  }}
                  onPointerCancel={() => {
                    gallerySwipeStart.current = null;
                  }}
                  role={currentImage ? "img" : undefined}
                  style={currentImage ? { backgroundImage: `url("${currentImage.url}")` } : undefined}
                >
                  {!currentImage && <span>Foto próximamente</span>}
                </div>
                {images.length > 1 && (
                  <>
                    <button
                      aria-label="Foto anterior"
                      className="product-gallery-arrow product-gallery-previous"
                      onClick={() => setActiveImageIndex((index) => (index - 1 + images.length) % images.length)}
                      type="button"
                    >
                      ‹
                    </button>
                    <button
                      aria-label="Foto siguiente"
                      className="product-gallery-arrow product-gallery-next"
                      onClick={() => setActiveImageIndex((index) => (index + 1) % images.length)}
                      type="button"
                    >
                      ›
                    </button>
                    <div className="product-gallery-thumbnails" aria-label="Elegir foto">
                      {images.map((image, imageIndex) => (
                        <button
                          aria-label={`Mostrar foto ${imageIndex + 1}`}
                          aria-pressed={imageIndex === activeImageIndex}
                          className={imageIndex === activeImageIndex ? "gallery-thumbnail is-active" : "gallery-thumbnail"}
                          key={image.id}
                          onClick={() => setActiveImageIndex(imageIndex)}
                          style={{ backgroundImage: `url("${image.url}")` }}
                          type="button"
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="product-modal-details">
                <p className="product-category">{activeProduct.category}</p>
                <h2>{activeProduct.name}</h2>
                {activeProduct.discountPrice !== null ? (
                  <p className="product-price has-discount">
                    <span className="discount-label">Oferta</span>
                    <del>{currency.format(activeProduct.price)}</del>
                    <strong>{currency.format(effectivePrice(activeProduct))}</strong>
                  </p>
                ) : (
                  <p className="product-price"><strong>{currency.format(activeProduct.price)}</strong></p>
                )}
                {activeProduct.description && <p className="product-modal-description">{activeProduct.description}</p>}
                <label className="modal-variant-picker">
                  Talle y color
                  <select
                    aria-label={`Elegir talle y color de ${activeProduct.name}`}
                    onChange={(event) => setSelectedVariants((current) => ({
                      ...current,
                      [activeProduct.id]: event.target.value,
                    }))}
                    value={selectedVariant?.id ?? ""}
                  >
                    {activeProduct.variants.length === 0 && <option value="">Sin variantes</option>}
                    {activeProduct.variants.map((variant) => (
                      <option disabled={variant.stockQuantity < 1} key={variant.id} value={variant.id}>
                        {variant.size} · {variant.color}{variant.stockQuantity < 1 ? " · Agotado" : ` · ${variant.stockQuantity} disponibles`}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="modal-add-button"
                  disabled={!selectedVariant}
                  onClick={() => selectedVariant && addToCart(activeProduct, selectedVariant)}
                  type="button"
                >
                  {selectedVariant ? "Agregar a mi bolsa" : "Agotado"}
                </button>
                <p className="product-modal-stock-note">Salta Capital · Entregas a coordinar</p>
              </div>
            </section>
          </div>
        );
      })()}

      {cartOpen && (
        <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
          <aside
            className="cart-drawer"
            aria-label="Tu bolsa"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Tu selección</p>
                <h2>Mi bolsa <span>({cartCount})</span></h2>
              </div>
              <button
                className="close-drawer"
                type="button"
                aria-label="Cerrar bolsa"
                onClick={() => setCartOpen(false)}
              >
                ×
              </button>
            </div>
            {cart.length === 0 ? (
              <div className="empty-cart">
                <p>Tu bolsa está esperando algo suave.</p>
                <button type="button" onClick={() => setCartOpen(false)}>Volver al catálogo</button>
              </div>
            ) : (
              <>
                <div className="cart-lines">
                  {cart.map((line) => {
                    const image = line.product.images.find((item) => item.isCover)
                      ?? line.product.images[0];

                    return (
                    <div className="cart-line" key={`${line.product.id}-${line.variant.id}`}>
                      <div
                        className="cart-thumb"
                        role={image ? "img" : undefined}
                        aria-label={image ? image.altText || line.product.name : undefined}
                        style={{
                          backgroundColor: "var(--beige-soft)",
                          backgroundImage: image ? `url("${image.url}")` : "none",
                        }}
                      />
                      <div className="cart-line-copy">
                        <p>{line.product.name}</p>
                        <span>Talle {line.variant.size} · {line.variant.color} · {currency.format(effectivePrice(line.product))}</span>
                        <div className="quantity-control" aria-label={`Cantidad de ${line.product.name}`}>
                          <button
                            type="button"
                            aria-label="Quitar una unidad"
                            onClick={() => updateQuantity(line.product.id, line.variant.id, -1)}
                          >−</button>
                          <span>{line.quantity}</span>
                          <button
                            type="button"
                            aria-label="Agregar una unidad"
                            disabled={line.quantity >= line.variant.stockQuantity}
                            onClick={() => updateQuantity(line.product.id, line.variant.id, 1)}
                          >+</button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
                <div className="cart-summary">
                  <div className="cart-total"><span>Total</span><strong>{currency.format(cartTotal)}</strong></div>
                  <a className="copy-order-button" href={whatsappUrl} target="_blank" rel="noreferrer">
                    Consultar por WhatsApp
                  </a>
                  <p className="copy-hint" role="status">
                    Se abrirá el chat de Tuflitas con tu pedido preparado.
                  </p>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
