import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getDatabase();
    const rows = await sql`
      select
        product.id,
        product.name,
        product.description,
        product.price_ars,
        product.discount_price_ars as "discountPrice",
        product.is_featured as "isFeatured",
        product.is_new as "isNew",
        product.display_order as "displayOrder",
        category.name as category,
        category.slug as "categorySlug",
        coalesce(variant_data.variants, '[]'::jsonb) as variants,
        coalesce(image_data.images, '[]'::jsonb) as images
      from public.products as product
      inner join public.categories as category
        on category.id = product.category_id
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'id', variant.id,
            'size', variant.size_label,
            'color', variant.color_name,
            'stockQuantity', variant.stock_quantity,
            'isActive', variant.is_active
          )
          order by variant.size_label, variant.color_name
        ) as variants
        from public.product_variants as variant
        where variant.product_id = product.id
          and variant.is_active = true
      ) as variant_data on true
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'id', image.id,
            'url', image.image_url,
            'altText', image.alt_text,
            'isCover', image.is_cover,
            'sortOrder', image.sort_order
          )
          order by image.is_cover desc, image.sort_order, image.created_at
        ) as images
        from public.product_images as image
        where image.product_id = product.id
      ) as image_data on true
      where product.is_active = true
        and category.is_active = true
      order by product.display_order asc, product.is_new desc, product.is_featured desc, product.created_at desc, product.name asc
    `;

    const products = rows.map((row) => ({
      ...row,
      price: Number(row.price_ars),
      discountPrice: row.discountPrice === null ? null : Number(row.discountPrice),
      variants: row.variants ?? [],
      images: row.images ?? [],
    }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error("No se pudieron consultar los productos de Neon.", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los productos." },
      { status: 500 },
    );
  }
}