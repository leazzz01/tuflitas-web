"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestOwnerPasswordResetAction,
  resetOwnerPasswordAction,
} from "./actions";

export function RequestPasswordResetForm() {
  const [state, formAction, pending] = useActionState(requestOwnerPasswordResetAction, null);

  return (
    <form action={formAction} className="auth-form">
      <label>
        Email de la dueña
        <input autoComplete="username" name="email" required type="email" />
      </label>
      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
      {state?.success && <p className="auth-success" role="status">{state.success}</p>}
      <button className="auth-submit" disabled={pending} type="submit">
        {pending ? "Enviando…" : "Enviar enlace de recuperación"}
      </button>
      <Link className="auth-secondary-link" href="/auth/sign-in">Volver al inicio de sesión</Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetOwnerPasswordAction, null);

  return (
    <form action={formAction} className="auth-form">
      <input name="token" type="hidden" value={token} />
      <label>
        Nueva contraseña
        <input autoComplete="new-password" maxLength={128} minLength={12} name="password" required type="password" />
      </label>
      <label>
        Repetir contraseña
        <input autoComplete="new-password" maxLength={128} minLength={12} name="confirmation" required type="password" />
      </label>
      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
      {state?.success && <p className="auth-success" role="status">{state.success}</p>}
      {state?.success ? (
        <Link className="auth-secondary-link" href="/auth/sign-in">Ir a iniciar sesión</Link>
      ) : (
        <button className="auth-submit" disabled={pending} type="submit">
          {pending ? "Actualizando…" : "Guardar contraseña nueva"}
        </button>
      )}
    </form>
  );
}