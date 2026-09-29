"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { IconBookmark, IconBuild, IconHome } from "@/components/icons";

type Item = {
  href: Route;
  label: string;
  icon: React.ReactNode;
  matches: (pathname: string) => boolean;
};

const items: Item[] = [
  {
    href: "/explore",
    label: "Inicio",
    icon: <IconHome />,
    matches: (p) => p === "/" || p.startsWith("/explore"),
  },
  {
    href: "/build",
    label: "Construir",
    icon: <IconBuild />,
    matches: (p) => p.startsWith("/build"),
  },
  {
    href: "/dev/viz-gallery",
    label: "Tipos",
    icon: <IconBookmark />,
    matches: (p) => p.startsWith("/dev/viz-gallery"),
  },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="sidenav" aria-label="Navegación principal">
      <Link href="/explore" className="brand" aria-label="Plotpaper · Inicio">
        P
      </Link>
      {items.map((item) => {
        const active = item.matches(pathname);
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            prefetch={false}
            className={clsx("sn-item", active && "active")}
            aria-current={active ? "page" : undefined}
          >
            <span className="ico">{item.icon}</span>
            <span className="lbl">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
