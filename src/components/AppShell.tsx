"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import {
  FlagIcon,
  GridIcon,
  ListIcon,
  TargetIcon,
  CardIcon,
  UploadIcon,
  DownloadIcon,
  GearIcon,
  SunIcon,
  MoonIcon,
} from "./icons";

const NAV = [
  { href: "/", label: "Dashboard", Icon: GridIcon, exact: true },
  { href: "/sessions", label: "Sessions", Icon: ListIcon },
  { href: "/analyze", label: "Analyze", Icon: TargetIcon },
  { href: "/rounds", label: "Rounds", Icon: CardIcon },
  { href: "/import", label: "Import", Icon: UploadIcon },
];

const iconBtn =
  "grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:text-ink hover:bg-bg-panel transition-colors duration-200 cursor-pointer";

function active(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const { resolved, toggle } = useTheme();

  // The unlock screen stands alone — no header/nav chrome.
  if (pathname === "/unlock") return <>{children}</>;

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-30 border-b border-line bg-bg-soft/80 backdrop-blur-md pt-safe">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-ink">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-bg shadow-glow">
              <FlagIcon className="h-5 w-5" />
            </span>
            <span className="text-lg tracking-tight">
              TOP<span className="text-accent">golf</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label, Icon, exact }) => {
              const a = active(pathname, href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 cursor-pointer ${
                    a
                      ? "bg-bg-panel text-accent"
                      : "text-ink-muted hover:bg-bg-panel hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-0.5">
            <Link href="/export" aria-label="Export data" className={iconBtn}>
              <DownloadIcon className="h-5 w-5" />
            </Link>
            <Link href="/settings" aria-label="Settings" className={iconBtn}>
              <GearIcon className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle light / dark"
              className={iconBtn}
            >
              {resolved === "dark" ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-28 md:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg-soft/90 backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-5 pb-safe">
          {NAV.map(({ href, label, Icon, exact }) => {
            const a = active(pathname, href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors duration-200 cursor-pointer ${
                  a ? "text-accent" : "text-ink-muted"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
