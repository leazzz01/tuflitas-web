import Link from "next/link";
import { ResetPasswordForm } from "../password-recovery-forms";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="brand-mark" href="/">Tuflitas</Link>
        <p className="eyebrow">Recuperar acceso</p>
        <h1>Crear contraseña nueva</h1>
        {email ? (
          <ResetPasswordForm email={email} />
        ) : (
          <>
            <p className="auth-copy">Solicitá un código para restablecer el acceso.</p>
            <Link className="auth-secondary-link" href="/auth/forgot-password">Solicitar código</Link>
          </>
        )}
      </section>
    </main>
  );
}