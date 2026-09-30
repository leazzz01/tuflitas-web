import { getAuth } from "@/lib/auth/server";

export type OwnerAccess =
  | { status: "owner"; email: string }
  | { status: "signed-out" }
  | { status: "not-owner" }
  | { status: "not-configured" };

export async function getOwnerAccess(): Promise<OwnerAccess> {
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!ownerEmail) return { status: "not-configured" };

  try {
    const { data: session } = await getAuth().getSession();
    const email = session?.user?.email?.trim().toLowerCase();

    if (!email) return { status: "signed-out" };
    if (email !== ownerEmail || !session?.user?.emailVerified) {
      return { status: "not-owner" };
    }

    return { status: "owner", email };
  } catch {
    return { status: "not-configured" };
  }
}