"use client";

import { useActionState } from "react";
import { verifyOwnerEmailAction } from "@/app/auth/actions";

export function VerifyForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(verifyOwnerEmailAction, null);

  return (
    <form action={formAction} className="auth-form">
      <input name="email" type="hidden" value={email} />
      <p className="auth-copy">Ingresá el código de verificación enviado a {email}.</p>
      <label>
        Código de verificación
        <input autoComplete="one-time-code" inputMode="numeric" name="code" required />
      </label>
      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
      <button className="auth-submit" disabled={pending} type="submit">
        {pending ? "Verificando…" : "Verificar email"}
      </button>
    </form>
  );
}