import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

type MetricsRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: MetricsRouteContext) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Producto inválido." }, { status: 400 });
  }

  let event: unknown;
  try {
    const body = await request.json() as { event?: unknown };
    event = body.event;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (event !== "view" && event !== "cart_addition") {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }

  try {
    const sql = getDatabase();
    const rows = await sql`
      insert into public.product_daily_metrics (
        product_id, metric_date, views, cart_additions
      )
      select
        product.id,
        current_date,
        ${event === "view" ? 1 : 0},
        ${event === "cart_addition" ? 1 : 0}
      from public.products as product
      where product.id = ${id} and product.is_active = true
      on conflict (product_id, metric_date) do update set
        views = public.product_daily_metrics.views + excluded.views,
        cart_additions = public.product_daily_metrics.cart_additions + excluded.cart_additions
      returning product_id
    `;

    if (rows.length === 0) return NextResponse.json({ error: "Producto no disponible." }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("No se pudo registrar la métrica del producto.", error);
    return NextResponse.json({ error: "No se pudo registrar la métrica." }, { status: 500 });
  }
}