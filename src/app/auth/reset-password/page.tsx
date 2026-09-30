import Link from "next/link";
import { ResetPasswordForm } from "../password-recovery-forms";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="brand-mark" href="/">tuflitas<span>.</span></Link>
        <p className="eyebrow">Recuperar acceso</p>
        <h1>Crear contraseña nueva</h1>
        {token && !error ? (
          <ResetPasswordForm token={token} />
        ) : (
          <>
            <p className="auth-error" role="alert">El enlace venció o no es válido. Solicitá uno nuevo.</p>
            <Link className="auth-secondary-link" href="/auth/forgot-password">Solicitar otro enlace</Link>
          </>
        )}
      </section>
    </main>
  );
}