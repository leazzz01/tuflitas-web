"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { SiteContent } from "@/lib/site-content";
import { optimizedImageUrl } from "@/lib/cloudinary-image";

export function HomeHero({
  content,
  preview = false,
  previewImageUrl,
}: {
  content: SiteContent;
  preview?: boolean;
  previewImageUrl?: string;
}) {
  const imageUrls = content.hero_image_url.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
  if (previewImageUrl && !imageUrls.includes(previewImageUrl)) imageUrls.push(previewImageUrl);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const currentIndex = imageUrls.length ? activeImageIndex % imageUrls.length : 0;
  const imageUrl = imageUrls[currentIndex];

  useEffect(() => {
    if (imageUrls.length < 2) return;
    const interval = window.setInterval(() => {
      setSlideDirection(1);
      setActiveImageIndex((index) => (index + 1) % imageUrls.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [imageUrls.length]);

  function moveImage(direction: 1 | -1) {
    if (imageUrls.length < 2) return;
    setSlideDirection(direction);
    setActiveImageIndex((index) => (index + direction + imageUrls.length) % imageUrls.length);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (imageUrls.length < 2) return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!start || imageUrls.length < 2) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    moveImage(deltaX < 0 ? 1 : -1);
  }

  return (
    <section className={preview ? "hero hero-preview" : "hero"} id={preview ? undefined : "inicio"}>
      <div className="hero-copy">
        <p className="eyebrow">{content.welcome_eyebrow}</p>
        <h1>{content.welcome_title}</h1>
        <p className="hero-description">{content.welcome_description}</p>
        <div className="welcome-facts">
          <div>
            <span>01</span>
            <p><strong>{content.welcome_fact_1_title}</strong>{content.welcome_fact_1_text}</p>
          </div>
          <div>
            <span>02</span>
            <p><strong>{content.welcome_fact_2_title}</strong>{content.welcome_fact_2_text}</p>
          </div>
        </div>
        <a className="hero-link" href={preview ? "#" : "#catalogo"}>
          {content.hero_cta} <span aria-hidden="true">↘</span>
        </a>
        <span className="hero-index">{content.hero_footer}</span>
      </div>
      <div
        className={imageUrl ? "hero-image" : "hero-image hero-image-empty"}
      >
        {imageUrl ? (
          <div
            aria-label={`${content.hero_image_alt}, foto ${currentIndex + 1} de ${imageUrls.length}`}
            className="hero-image-frame"
            key={`${currentIndex}-${imageUrl}`}
            onPointerCancel={() => {
              swipeStart.current = null;
            }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            role="img"
            style={{
              backgroundImage: `url("${optimizedImageUrl(imageUrl, preview ? 900 : 1600)}")`,
              "--hero-slide-offset": `${slideDirection * 18}px`,
            } as CSSProperties}
          />
        ) : (
          <div className="hero-image-placeholder">
            <span>Imagen de portada</span>
            <p>Elegí una foto para presentar los nuevos ingresos.</p>
          </div>
        )}
        {imageUrls.length > 1 && (
          <>
            <button
              aria-label="Foto anterior de la portada"
              className="hero-image-arrow hero-image-previous"
              onClick={() => moveImage(-1)}
              type="button"
            >
              ‹
            </button>
            <button
              aria-label="Foto siguiente de la portada"
              className="hero-image-arrow hero-image-next"
              onClick={() => moveImage(1)}
              type="button"
            >
              ›
            </button>
            <div aria-label="Elegir foto de portada" className="hero-image-pagination">
              {imageUrls.map((url, index) => (
                <button
                  aria-label={index === 0 ? "Mostrar portada" : `Mostrar foto de rotación ${index + 1}`}
                  aria-pressed={index === currentIndex}
                  className={index === currentIndex ? "hero-image-dot is-active" : "hero-image-dot"}
                  key={`${url}-${index}`}
                  onClick={() => {
                    setSlideDirection(index >= currentIndex ? 1 : -1);
                    setActiveImageIndex(index);
                  }}
                  type="button"
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}