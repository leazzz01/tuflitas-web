import Link from "next/link";
import { VerifyForm } from "./verify-form";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="brand-mark" href="/">Tuflitas</Link>
        <p className="eyebrow">Verificación</p>
        <h1>Confirmar email</h1>
        <VerifyForm email={email} />
        <Link className="auth-secondary-link" href="/auth/sign-in">Volver al acceso</Link>
      </section>
    </main>
  );
}