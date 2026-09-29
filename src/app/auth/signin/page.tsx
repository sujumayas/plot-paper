import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <section style={{ maxWidth: 460, margin: "64px auto" }}>
      <div className="eyebrow">Acceso</div>
      <h1
        style={{
          fontFamily: "var(--display)",
          fontSize: 32,
          fontWeight: 500,
          letterSpacing: "-0.6px",
          color: "var(--ibk-blue)",
          margin: "0 0 12px",
        }}
      >
        Inicia sesión.
      </h1>
      <p className="small" style={{ marginBottom: 24 }}>
        Plotpaper usa código por correo. Escribe tu email, recibe un código de
        6 dígitos y entra.
      </p>
      <SignInForm />
    </section>
  );
}
