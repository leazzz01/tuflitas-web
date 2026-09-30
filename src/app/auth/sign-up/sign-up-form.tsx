"use client";

import { useActionState } from "react";
import { signUpOwnerAction } from "@/app/auth/actions";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpOwnerAction, null);

  return (
    <form action={formAction} className="auth-form">
      <label>
        Email de la dueña
        <input autoComplete="username" name="email" required type="email" />
      </label>
      <label>
        Contraseña nueva
        <input autoComplete="new-password" minLength={12} name="password" required type="password" />
      </label>
      <label>
        Repetir contraseña
        <input autoComplete="new-password" minLength={12} name="confirmation" required type="password" />
      </label>
      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
      <button className="auth-submit" disabled={pending} type="submit">
        {pending ? "Creando cuenta…" : "Crear acceso de la dueña"}
      </button>
    </form>
  );
}