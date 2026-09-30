export const DEFAULT_SITE_CONTENT = {
  announcement_primary: "Temporada de hogar · Salta Capital",
  announcement_secondary: "Venta minorista · Entregas a coordinar",
  hero_image_url: "",
  hero_image_alt: "Nuevos productos de Tuflitas",
  hero_cta: "Descubrí los ingresos",
  hero_footer: "SALTA CAPITAL · ENTREGAS A COORDINAR",
  welcome_eyebrow: "Hola, qué bueno que llegaste",
  welcome_title: "¡Te damos la bienvenida a Tuflitas!",
  welcome_description: "Somos un emprendimiento de Salta Capital con pantuflas, pijamas y artículos de temporada.",
  welcome_fact_1_title: "Venta minorista",
  welcome_fact_1_text: "Elegí tus favoritos con calma.",
  welcome_fact_2_title: "Entregas a coordinar",
  welcome_fact_2_text: "Consultanos por WhatsApp.",
  catalog_eyebrow: "Ingresos de temporada",
  catalog_title: "Encontrá tu próximo favorito",
  catalog_note: "Venta minorista · Salta Capital",
  catalog_disclaimer: "Consultá disponibilidad y entregas por WhatsApp.",
} as const;

export type SiteContent = Record<keyof typeof DEFAULT_SITE_CONTENT, string>;