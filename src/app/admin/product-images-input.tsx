"use client";

import { useEffect, useRef, useState } from "react";
import { optimizedImageUrl } from "@/lib/cloudinary-image";

type SignedUpload = {
  cloudName?: string;
  apiKey?: string;
  timestamp?: number;
  folder?: string;
  signature?: string;
  error?: string;
};

export function ProductImagesInput({
  defaultUrls = "",
  name = "imageUrls",
  maxFiles = 8,
  label = "Fotos del producto",
  helperText = "Elegí hasta 8 imágenes, máximo 8 MB cada una.",
  onUrlsChange,
  onPreviewChange,
}: {
  defaultUrls?: string;
  name?: string;
  maxFiles?: number;
  label?: string;
  helperText?: string;
  onUrlsChange?: (urls: string) => void;
  onPreviewChange?: (url: string | null) => void;
}) {
  const [urls, setUrls] = useState(defaultUrls);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  async function uploadFiles(files: File[]) {
    setError("");
    setStatus("");
    const existingUrls = urls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);

    if (existingUrls.length + files.length > maxFiles) {
      setError(`Podés agregar hasta ${maxFiles} ${maxFiles === 1 ? "imagen" : "fotos"}.`);
      return;
    }

    const invalidFile = files.find((file) =>
      !file.type.startsWith("image/")
      || file.type === "image/svg+xml"
      || file.size > 8 * 1024 * 1024,
    );
    if (invalidFile) {
      setError("Elegí imágenes de hasta 8 MB cada una. SVG y otros archivos no están permitidos.");
      return;
    }
    const previewUrl = files[0] ? URL.createObjectURL(files[0]) : null;
    setLocalPreviewUrl(previewUrl);
    onPreviewChange?.(previewUrl);

    setUploading(true);
    setStatus(`Preparando ${files.length} ${files.length === 1 ? "foto" : "fotos"}…`);
    try {
      const signatureResponse = await fetch("/api/admin/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: files.length }),
      });
      const signature = await signatureResponse.json() as SignedUpload;
      if (!signatureResponse.ok || !signature.cloudName || !signature.apiKey
        || !signature.timestamp || !signature.folder || !signature.signature) {
        throw new Error(signature.error ?? "No se pudo preparar la carga de fotos.");
      }

      setStatus(`Subiendo ${files.length} ${files.length === 1 ? "foto" : "fotos"}…`);
      const uploadedUrls = await Promise.all(files.map(async (file) => {
        const body = new FormData();
        body.append("file", file);
        body.append("api_key", signature.apiKey!);
        body.append("timestamp", String(signature.timestamp));
        body.append("folder", signature.folder!);
        body.append("signature", signature.signature!);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
          { method: "POST", body },
        );
        const result = await response.json() as {
          secure_url?: string;
          error?: { message?: string };
        };
        if (!response.ok || !result.secure_url) {
          throw new Error(result.error?.message ?? "Cloudinary no pudo guardar una foto.");
        }
        return result.secure_url;
      }));

      const nextUrls = [...existingUrls, ...uploadedUrls].join("\n");
      setUrls(nextUrls);
      onUrlsChange?.(nextUrls);
      setLocalPreviewUrl(null);
      onPreviewChange?.(null);
      setStatus(`${uploadedUrls.length} ${uploadedUrls.length === 1 ? "foto cargada" : "fotos cargadas"}.`);
    } catch (cause) {
      setLocalPreviewUrl(null);
      onPreviewChange?.(null);
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las fotos.");
      setStatus("");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(indexToRemove: number) {
    const nextUrls = urls
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean)
      .filter((_, index) => index !== indexToRemove)
      .join("\n");
    setUrls(nextUrls);
    onUrlsChange?.(nextUrls);
    onPreviewChange?.(null);
    setStatus("Foto quitada de la lista. Guardá los cambios para confirmar.");
  }

  function moveImage(index: number, direction: -1 | 1) {
    const imageUrls = urls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean);
    const destination = index + direction;
    if (destination < 0 || destination >= imageUrls.length) return;

    [imageUrls[index], imageUrls[destination]] = [imageUrls[destination], imageUrls[index]];
    const nextUrls = imageUrls.join("\n");
    setUrls(nextUrls);
    onUrlsChange?.(nextUrls);
    onPreviewChange?.(null);
    setStatus(destination === 0 ? "Esta foto será la portada al guardar." : "Orden de fotos actualizado.");
  }

  return (
    <div className="product-photo-section">
      <label className="photo-file-picker">
        <span>{label}</span>
        <input
          accept="image/*"
          disabled={uploading}
          multiple={maxFiles > 1}
          onChange={(event) => uploadFiles(Array.from(event.target.files ?? []))}
          ref={inputRef}
          type="file"
        />
        <small>{helperText}</small>
      </label>
      {status && <p className="photo-upload-status" role="status">{status}</p>}
      {error && <p className="product-form-error" role="alert">{error}</p>}
      {(localPreviewUrl || urls.trim()) && (
        <div className="photo-preview-list" aria-label="Vista previa de las fotos">
          {urls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean).map((url, index) => (
            <div className="photo-preview-item" key={`${url}-${index}`}>
              <div
                aria-label={`Vista previa de imagen ${index + 1}`}
                className="photo-preview-image"
                role="img"
                style={{ backgroundImage: `url("${optimizedImageUrl(url, 320)}")` }}
              />
              <span className="photo-preview-caption">{index === 0 ? "Portada" : `Foto ${index + 1}`}</span>
              <div className="photo-preview-controls">
                <button
                  aria-label={`Mover foto ${index + 1} hacia arriba`}
                  className="reorder-product-image-button"
                  disabled={uploading || index === 0}
                  onClick={() => moveImage(index, -1)}
                  type="button"
                >
                  ↑
                </button>
                <button
                  aria-label={`Mover foto ${index + 1} hacia abajo`}
                  className="reorder-product-image-button"
                  disabled={uploading || index === urls.split(/\r?\n/).filter(Boolean).length - 1}
                  onClick={() => moveImage(index, 1)}
                  type="button"
                >
                  ↓
                </button>
                <button
                  aria-label={`Quitar foto ${index + 1}`}
                  className="remove-product-image-button"
                  disabled={uploading}
                  onClick={() => removeImage(index)}
                  type="button"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
          {localPreviewUrl && (
            <div className="photo-preview-item is-uploading">
              <div
                aria-label="Vista previa de foto en carga"
                className="photo-preview-image"
                role="img"
                style={{ backgroundImage: `url("${localPreviewUrl}")` }}
              />
              <span className="photo-preview-caption">Subiendo…</span>
            </div>
          )}
        </div>
      )}
      <label className="image-urls-field">
        URLs de respaldo (HTTPS, una por línea)
        <textarea
          name={name}
          onChange={(event) => {
            setUrls(event.target.value);
            onUrlsChange?.(event.target.value);
            onPreviewChange?.(null);
          }}
          placeholder="Las URLs aparecerán acá después de subir las fotos"
          rows={2}
          value={urls}
        />
      </label>
    </div>
  );
}