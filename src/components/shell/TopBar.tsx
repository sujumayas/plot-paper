"use client";

import { usePathname } from "next/navigation";
import { IconBell, IconSearch } from "@/components/icons";
import { UserMenu } from "@/components/auth/UserMenu";
import { useUser } from "@/hooks/useUser";

export function TopBar() {
  const pathname = usePathname();
  const { user } = useUser();
  const greeting = greetingFor(user?.email ?? null);
  const subtitle = subtitleFor(pathname);

  return (
    <header className="topbar-ibk">
      <div className="hello">
        <h1>{greeting}</h1>
        <div className="sub">{subtitle}</div>
      </div>

      <div className="top-actions">
        <button type="button" className="ta-btn" aria-label="Buscar">
          <span className="ico">
            <IconSearch />
          </span>
          <span className="lbl">Buscar</span>
        </button>
        <button type="button" className="ta-btn" aria-label="Notificaciones">
          <span className="ico">
            <IconBell />
          </span>
          <span className="lbl">Notificaciones</span>
        </button>
        <UserMenu />
      </div>
    </header>
  );
}

function greetingFor(email: string | null): string {
  if (!email) return "Bienvenido a Plotpaper";
  const handle = email.split("@")[0] ?? "";
  const first = handle.split(/[._-]/)[0] ?? "";
  if (!first) return "Bienvenido";
  const cap = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  return `Hola, ${cap}`;
}

function subtitleFor(pathname: string): string {
  if (pathname.startsWith("/build")) return "Construye tu propio gráfico desde un CSV o desde IA.";
  if (pathname.startsWith("/auth")) return "Inicia sesión con tu correo. Sin contraseñas.";
  return "Explora gráficos publicados o construye uno nuevo.";
}
