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
      {state?.email ? (
        <Link className="auth-secondary-link" href={`/auth/reset-password?email=${encodeURIComponent(state.email)}`}>
          Ingresar código de recuperación
        </Link>
      ) : (
        <button className="auth-submit" disabled={pending} type="submit">
          {pending ? "Enviando…" : "Enviar código de recuperación"}
        </button>
      )}
      <Link className="auth-secondary-link" href="/auth/sign-in">Volver al inicio de sesión</Link>
    </form>
  );
}

export function ResetPasswordForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(resetOwnerPasswordAction, null);

  return (
    <form action={formAction} className="auth-form">
      <input name="email" type="hidden" value={email} />
      <label>
        Código recibido por email
        <input autoComplete="one-time-code" inputMode="numeric" maxLength={32} name="otp" required />
      </label>
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