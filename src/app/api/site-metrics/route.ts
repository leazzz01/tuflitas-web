import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  let event: unknown;
  try {
    const body = await request.json() as { event?: unknown };
    event = body.event;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (event !== "page_visit") {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }

  try {
    const sql = getDatabase();
    await sql`
      insert into public.site_daily_metrics (metric_date, page_visits)
      values (current_date, 1)
      on conflict (metric_date) do update set
        page_visits = public.site_daily_metrics.page_visits + excluded.page_visits
    `;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("No se pudo registrar la visita a la página.", error);
    return NextResponse.json({ error: "No se pudo registrar la visita." }, { status: 500 });
  }
}