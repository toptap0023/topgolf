"use client";

import Link from "next/link";
import type { DistanceUnit } from "@/lib/types";
import { fmt, formatDate, distanceUnitLabel } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui";
import { ListIcon, UploadIcon, ChevronRightIcon } from "@/components/icons";
import { useT, type Dict } from "@/lib/i18n";

const L = {
  title: { en: "Sessions", th: "เซสชัน" },
  emptyTitle: { en: "No sessions yet", th: "ยังไม่มีเซสชัน" },
  emptyMsg: {
    en: "Import a Garmin range CSV and each upload becomes a session you can review here.",
    th: "อัปโหลด CSV จากสนามไดร์ฟ Garmin แล้วแต่ละไฟล์จะกลายเป็นเซสชันให้ย้อนดูได้ที่นี่",
  },
  importCsv: { en: "Import Garmin CSV", th: "อัปโหลด Garmin CSV" },
  rangeSession: { en: "Range session", th: "เซสชันซ้อมไดร์ฟ" },
  shots: { en: "shots", th: "ช็อต" },
  clubs: { en: "clubs", th: "ไม้" },
  avgCarry: { en: "avg carry", th: "carry เฉลี่ย" },
  longest: { en: "longest", th: "ไกลสุด" },
} satisfies Dict;

export interface SessionListItem {
  id: string;
  title: string | null;
  played_on: string;
  location: string | null;
  distance_unit: DistanceUnit;
  shots: number;
  clubs: number;
  avgCarry: number | null;
  longest: number | null;
}

export function SessionsListClient({ items }: { items: SessionListItem[] }) {
  const t = useT(L);

  if (items.length === 0)
    return (
      <EmptyState
        icon={<ListIcon className="h-7 w-7" />}
        title={t("emptyTitle")}
        message={t("emptyMsg")}
        action={
          <Link
            href="/import"
            className="mt-1 flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark cursor-pointer"
          >
            <UploadIcon className="h-5 w-5" />
            {t("importCsv")}
          </Link>
        }
      />
    );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
      <div className="flex flex-col gap-3">
        {items.map((ses) => {
          const d = distanceUnitLabel(ses.distance_unit);
          return (
            <Link key={ses.id} href={`/sessions/${ses.id}`} className="group">
              <Card className="flex items-center gap-4 p-4 transition-colors duration-200 group-hover:border-accent/40">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {ses.title || t("rangeSession")}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {formatDate(ses.played_on)}
                    {ses.location ? ` · ${ses.location}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                    <span className="tnum">{ses.shots} {t("shots")}</span>
                    <span className="tnum">{ses.clubs} {t("clubs")}</span>
                    {ses.avgCarry != null ? (
                      <span className="tnum">
                        {t("avgCarry")} {fmt(ses.avgCarry)} {d}
                      </span>
                    ) : null}
                    {ses.longest != null ? (
                      <span className="tnum">
                        {t("longest")} {fmt(ses.longest)} {d}
                      </span>
                    ) : null}
                  </div>
                </div>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-muted" />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
