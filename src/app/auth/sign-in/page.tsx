import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const { verified } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="brand-mark" href="/">tuflitas<span>.</span></Link>
        <p className="eyebrow">Acceso privado</p>
        <h1>Panel de la dueña</h1>
        <p className="auth-copy">Iniciá sesión para administrar el catálogo y el stock.</p>
        <SignInForm verified={verified === "1"} />
        <Link className="auth-secondary-link" href="/auth/forgot-password">Olvidé mi contraseña</Link>
      </section>
    </main>
  );
}