"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateSiteContentAction } from "./actions";
import { HomeHero } from "../home-hero";
import { ProductImagesInput } from "./product-images-input";
import type { SiteContent } from "@/lib/site-content";

type ContentField = {
  key: keyof SiteContent;
  label: string;
  multiline?: boolean;
};

const groups: { title: string; fields: ContentField[] }[] = [
  {
    title: "Aviso superior",
    fields: [
      { key: "announcement_primary", label: "Mensaje principal" },
      { key: "announcement_secondary", label: "Mensaje secundario" },
    ],
  },
  {
    title: "Portada",
    fields: [
      { key: "welcome_eyebrow", label: "Texto pequeño" },
      { key: "welcome_title", label: "Título de bienvenida" },
      { key: "welcome_description", label: "Descripción", multiline: true },
      { key: "welcome_fact_1_title", label: "Dato 1, título" },
      { key: "welcome_fact_1_text", label: "Dato 1, descripción" },
      { key: "welcome_fact_2_title", label: "Dato 2, título" },
      { key: "welcome_fact_2_text", label: "Dato 2, descripción" },
      { key: "hero_cta", label: "Texto del enlace" },
      { key: "hero_footer", label: "Texto inferior" },
      { key: "hero_image_alt", label: "Texto alternativo de la imagen" },
    ],
  },
  {
    title: "Catálogo",
    fields: [
      { key: "catalog_eyebrow", label: "Texto pequeño" },
      { key: "catalog_title", label: "Título" },
      { key: "catalog_note", label: "Nota" },
      { key: "catalog_disclaimer", label: "Texto inferior" },
    ],
  },
];

export function SiteContentForm({ content }: { content: SiteContent }) {
  const [state, formAction, pending] = useActionState(updateSiteContentAction, null);
  const [draft, setDraft] = useState<SiteContent>({ ...content });
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null);

  function updateContent(key: keyof SiteContent, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="site-content-editor-layout">
      <form action={formAction} className="site-content-form">
        {groups.map((group) => (
          <fieldset className="content-fieldset" key={group.title}>
            <legend>{group.title}</legend>
            <div className="content-fields">
              {group.fields.map((field) => (
                <label className={field.multiline ? "content-field content-field-wide" : "content-field"} key={field.key}>
                  {field.label}
                  {field.multiline ? (
                    <textarea
                      maxLength={300}
                      name={field.key}
                      onChange={(event) => updateContent(field.key, event.target.value)}
                      rows={3}
                      value={draft[field.key]}
                    />
                  ) : (
                    <input
                      maxLength={300}
                      name={field.key}
                      onChange={(event) => updateContent(field.key, event.target.value)}
                      value={draft[field.key]}
                    />
                  )}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <ProductImagesInput
          defaultUrls={content.hero_image_url}
          helperText="La primera foto será la portada; las demás rotarán cada 5 segundos. Podés reordenar la lista."
          label="Fotos de portada"
          maxFiles={8}
          name="hero_image_url"
          onPreviewChange={setLocalImagePreview}
          onUrlsChange={(value) => updateContent("hero_image_url", value)}
        />
        {state?.error && <p className="product-form-error" role="alert">{state.error}</p>}
        {state?.success && <p className="product-form-success" role="status">{state.success}</p>}
        <button className="save-product-button" disabled={pending} type="submit">
          {pending ? "Guardando…" : "Guardar cambios de la página"}
        </button>
      </form>

      <aside className="site-live-preview" aria-label="Vista previa de la página pública">
        <div className="site-live-preview-heading">
          <h3>Vista previa</h3>
          <span>Se actualiza mientras editás</span>
        </div>
        <div className="site-preview-frame">
          <div className="announcement-bar">
            <span>{draft.announcement_primary}</span>
            <span className="announcement-location">{draft.announcement_secondary}</span>
          </div>
          <HomeHero
            content={draft}
            key={`${draft.hero_image_url}-${localImagePreview ?? ""}`}
            preview
            previewImageUrl={localImagePreview ?? undefined}
          />
        </div>
        <p className="site-preview-note">Estos cambios se publican cuando presiones Guardar.</p>
      </aside>
    </div>
  );
}