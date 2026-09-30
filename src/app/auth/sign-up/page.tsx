import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="brand-mark" href="/">tuflitas<span>.</span></Link>
        <p className="eyebrow">Configuración inicial</p>
        <h1>Crear acceso</h1>
        <p className="auth-copy">Solo se acepta el email autorizado para administrar Tuflitas. Verificaremos que tengas acceso a esa casilla.</p>
        <SignUpForm />
        <Link className="auth-secondary-link" href="/auth/sign-in">Ya tengo una cuenta</Link>
      </section>
    </main>
  );
}