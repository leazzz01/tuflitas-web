import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDatabase();
    const rows = await sql`
      select key, value
      from public.site_settings
    `;
    const content = { ...DEFAULT_SITE_CONTENT } as Record<keyof typeof DEFAULT_SITE_CONTENT, string>;

    for (const row of rows) {
      if (row.key in content) {
        content[row.key as keyof typeof content] = row.value;
      }
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("No se pudo cargar el contenido editable de la página.", error);
    return NextResponse.json({ content: DEFAULT_SITE_CONTENT });
  }
}