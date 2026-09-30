"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";

export type AuthActionState = {
  error?: string;
};

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signInAction(
  _previousState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formValue(formData, "email").trim().toLowerCase();
  const password = formValue(formData, "password");
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!ownerEmail) return { error: "Falta configurar el email de administración." };
  if (email !== ownerEmail) return { error: "Este acceso es exclusivo para la dueña." };

  try {
    const { error } = await getAuth().signIn.email({ email, password });
    if (error) return { error: "No pudimos iniciar sesión. Revisá el email y la contraseña." };
  } catch {
    return { error: "No se pudo conectar con el servicio de acceso." };
  }

  redirect("/admin");
}

export async function signUpOwnerAction(
  _previousState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formValue(formData, "email").trim().toLowerCase();
  const password = formValue(formData, "password");
  const confirmation = formValue(formData, "confirmation");
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!ownerEmail) return { error: "Falta configurar el email de administración." };
  if (email !== ownerEmail) return { error: "El registro está limitado al email autorizado." };
  if (password.length < 12) return { error: "Usá una contraseña de al menos 12 caracteres." };
  if (password !== confirmation) return { error: "Las contraseñas no coinciden." };

  try {
    const { error } = await getAuth().signUp.email({
      email,
      password,
      name: "Tuflitas",
    });
    if (error) return { error: "No se pudo crear la cuenta. Si ya existe, iniciá sesión." };
  } catch {
    return { error: "No se pudo conectar con el servicio de acceso." };
  }

  redirect(`/auth/verify?email=${encodeURIComponent(email)}`);
}

export async function verifyOwnerEmailAction(
  _previousState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formValue(formData, "email").trim().toLowerCase();
  const code = formValue(formData, "code").trim();
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!ownerEmail || email !== ownerEmail) {
    return { error: "El email no coincide con el acceso autorizado." };
  }
  if (!code) return { error: "Ingresá el código que recibiste por email." };

  try {
    const { error } = await getAuth().emailOtp.verifyEmail({ email, otp: code });
    if (error) return { error: "El código no es válido o venció. Solicitá uno nuevo." };
  } catch {
    return { error: "No se pudo verificar el email." };
  }

  redirect("/auth/sign-in?verified=1");
}

export async function signOutAction() {
  await getAuth().signOut();
  redirect("/auth/sign-in");
}