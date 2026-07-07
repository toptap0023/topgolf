"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT, type Dict } from "@/lib/i18n";
import {
  GridIcon,
  ListIcon,
  TargetIcon,
  CardIcon,
  DownloadIcon,
  UploadIcon,
  GearIcon,
} from "./icons";

const L = {
  dashboard: { en: "Dashboard", th: "แดชบอร์ด" },
  sessions: { en: "Sessions", th: "เซสชัน" },
  analyze: { en: "Analyze", th: "วิเคราะห์" },
  rounds: { en: "Rounds", th: "รอบ" },
  import: { en: "Import", th: "นำเข้า" },
  exportData: { en: "Export data", th: "ส่งออกข้อมูล" },
  settings: { en: "Settings", th: "ตั้งค่า" },
} satisfies Dict;

// Labels live in L so they can be translated at render via t(key).
const NAV: {
  href: string;
  key: keyof typeof L;
  Icon: typeof GridIcon;
  exact?: boolean;
}[] = [
  { href: "/", key: "dashboard", Icon: GridIcon, exact: true },
  { href: "/sessions", key: "sessions", Icon: ListIcon },
  { href: "/analyze", key: "analyze", Icon: TargetIcon },
  { href: "/rounds", key: "rounds", Icon: CardIcon },
  { href: "/import", key: "import", Icon: DownloadIcon },
];

const iconBtn =
  "grid h-11 w-11 place-items-center rounded-lg text-ink-muted hover:text-ink hover:bg-bg-panel transition-colors duration-200 cursor-pointer"; // 44px touch target

function active(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const t = useT(L);

  // Auth pages render bare — no nav to a session that doesn't exist yet.
  if (/^\/(login|reset-password|auth)(\/|$)/.test(pathname))
    return <main className="mx-auto min-h-[100dvh] max-w-5xl px-4 py-6">{children}</main>;

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-30 border-b border-line bg-bg-soft/80 backdrop-blur-md pt-safe">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-ink">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG, no optimization needed */}
            <img src="/icon.svg" alt="" className="h-8 w-8 rounded-lg shadow-glow" />
            <span className="text-lg tracking-tight">
              TOP<span className="text-accent">golfer</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map(({ href, key, Icon, exact }) => {
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
                  {t(key)}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-0.5">
            <Link href="/export" aria-label={t("exportData")} className={iconBtn}>
              <UploadIcon className="h-5 w-5" />
            </Link>
            <Link href="/settings" aria-label={t("settings")} className={iconBtn}>
              <GearIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-28 md:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg-soft/90 backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-5 pb-safe">
          {NAV.map(({ href, key, Icon, exact }) => {
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
                {t(key)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
