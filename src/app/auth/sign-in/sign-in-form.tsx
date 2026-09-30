"use client";

import { useActionState } from "react";
import { signInAction } from "@/app/auth/actions";

export function SignInForm({ verified = false }: { verified?: boolean }) {
  const [state, formAction, pending] = useActionState(signInAction, null);

  return (
    <form action={formAction} className="auth-form">
      {verified && <p className="auth-success">Email verificado. Ya podés iniciar sesión.</p>}
      <label>
        Email de la dueña
        <input autoComplete="username" name="email" required type="email" />
      </label>
      <label>
        Contraseña
        <input autoComplete="current-password" name="password" required type="password" />
      </label>
      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
      <button className="auth-submit" disabled={pending} type="submit">
        {pending ? "Ingresando…" : "Ingresar al panel"}
      </button>
    </form>
  );
}