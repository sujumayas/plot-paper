"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { UserMenu } from "@/components/auth/UserMenu";

export function TopBar() {
  const pathname = usePathname();
  const view: "explore" | "build" =
    pathname.startsWith("/build") ? "build" : "explore";

  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div className="brand-mark">
          Plot<em>paper</em>
        </div>
        <div className="brand-sub">v0.1 · composer</div>
      </div>

      <nav className="nav" aria-label="Primary">
        <Link href="/explore" prefetch={false}>
          <button className={clsx({ on: view === "explore" })} type="button">
            Explore
          </button>
        </Link>
        <Link href="/build" prefetch={false}>
          <button className={clsx({ on: view === "build" })} type="button">
            Build
          </button>
        </Link>
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <UserMenu />
      </div>
    </header>
  );
}
