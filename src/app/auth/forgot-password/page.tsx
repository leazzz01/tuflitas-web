import Link from "next/link";
import { RequestPasswordResetForm } from "../password-recovery-forms";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link className="brand-mark" href="/">tuflitas<span>.</span></Link>
        <p className="eyebrow">Recuperar acceso</p>
        <h1>Restablecer contraseña</h1>
        <p className="auth-copy">Te enviaremos un código al email autorizado para crear una contraseña nueva.</p>
        <RequestPasswordResetForm />
      </section>
    </main>
  );
}