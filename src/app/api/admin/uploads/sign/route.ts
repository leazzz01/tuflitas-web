import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getOwnerAccess } from "@/lib/auth/owner";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await getOwnerAccess();
  if (access.status !== "owner") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Falta configurar el almacenamiento de fotos." },
      { status: 503 },
    );
  }

  let count: number;
  try {
    const body = await request.json() as { count?: unknown };
    count = Number(body.count);
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!Number.isInteger(count) || count < 1 || count > 8) {
    return NextResponse.json({ error: "Se permiten de 1 a 8 fotos por producto." }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "tuflitas/products";

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  const signature = cloudinary.utils.api_sign_request(
    { folder, timestamp },
    apiSecret,
  );

  return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature });
}