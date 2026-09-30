"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/server";

export type AuthActionState = {
  error?: string;
  success?: string;
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

export async function requestOwnerPasswordResetAction(
  _previousState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const email = formValue(formData, "email").trim().toLowerCase();
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!ownerEmail) return { error: "El acceso de la dueña no está configurado." };
  if (!email || email !== ownerEmail) {
    return { success: "Si el email corresponde a la cuenta autorizada, recibirás un enlace para recuperar el acceso." };
  }

  try {
    const requestHeaders = await headers();
    const origin = requestHeaders.get("origin");
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    if (!origin) return { error: "No pudimos identificar el dominio de esta página." };

    const parsedOrigin = new URL(origin);
    if (host && parsedOrigin.host !== host) {
      return { error: "No se pudo validar el dominio. Volvé a abrir el sitio publicado e intentá otra vez." };
    }
    if (parsedOrigin.protocol !== "https:" && parsedOrigin.hostname !== "localhost") {
      return { error: "El enlace de recuperación requiere una conexión segura." };
    }

    const { error } = await getAuth().requestPasswordReset({
      email,
      redirectTo: new URL("/auth/reset-password", parsedOrigin).toString(),
    });
    if (error) {
      console.error("No se pudo solicitar el restablecimiento de contraseña.", error.code);
      return { error: "No se pudo enviar el enlace. Revisá la configuración de Neon Auth y el dominio permitido." };
    }

    return { success: "Si el email corresponde a la cuenta autorizada, recibirás un enlace para recuperar el acceso." };
  } catch {
    return { error: "No se pudo conectar con el servicio de acceso." };
  }
}

export async function resetOwnerPasswordAction(
  _previousState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const token = formValue(formData, "token");
  const password = formValue(formData, "password");
  const confirmation = formValue(formData, "confirmation");

  if (!token || token.length > 512) return { error: "El enlace no es válido. Solicitá uno nuevo." };
  if (password.length < 12) return { error: "Usá una contraseña de al menos 12 caracteres." };
  if (password.length > 128) return { error: "La contraseña no puede superar 128 caracteres." };
  if (password !== confirmation) return { error: "Las contraseñas no coinciden." };

  try {
    const { error } = await getAuth().resetPassword({ newPassword: password, token });
    if (error) return { error: "El enlace venció o ya fue usado. Solicitá otro para continuar." };
    return { success: "Contraseña actualizada. Ya podés iniciar sesión." };
  } catch {
    return { error: "No se pudo actualizar la contraseña. Solicitá un enlace nuevo." };
  }
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