"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/app", label: "会話", match: (p: string) => p === "/app" },
  {
    href: "/app/projects",
    label: "資料",
    match: (p: string) => p.startsWith("/app/projects"),
  },
  {
    href: "/app/voice",
    label: "音声",
    match: (p: string) => p.startsWith("/app/voice"),
  },
  {
    href: "/app/settings",
    label: "設定",
    match: (p: string) => p.startsWith("/app/settings"),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-fog/90 backdrop-blur-md"
      aria-label="メイン"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4 px-2 pt-2">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={clsx(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium transition-colors",
                  active ? "text-amber" : "text-mist hover:text-paper",
                )}
              >
                <span
                  className={clsx(
                    "h-1 w-6 rounded-full transition-colors",
                    active ? "bg-amber" : "bg-transparent",
                  )}
                  aria-hidden
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
