import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <section style={{ maxWidth: 420, margin: "64px auto" }}>
      <div className="eyebrow">auth · sign in</div>
      <h1
        className="serif"
        style={{
          fontSize: 48,
          fontWeight: 400,
          letterSpacing: "-0.02em",
          margin: "0 0 18px",
        }}
      >
        Come on in.
      </h1>
      <p className="small" style={{ marginBottom: 24 }}>
        Plotpaper uses email OTP. Type your address, get a 6-digit code, and
        you&rsquo;re in.
      </p>
      <SignInForm />
    </section>
  );
}
