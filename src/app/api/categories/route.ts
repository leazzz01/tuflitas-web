import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDatabase();
    const categories = await sql`
      select id, name, slug, sort_order
      from public.categories
      where is_active = true
      order by sort_order asc, name asc
    `;

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("No se pudieron consultar las categorías de Neon.", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las categorías." },
      { status: 500 },
    );
  }
}