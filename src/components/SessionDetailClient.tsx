"use client";

import Link from "next/link";
import type {
  ClubAgg,
  Kpis,
  Dispersion,
  FatiguePoint,
  SwingVerdict,
} from "@/lib/stats";
import type { GolfSession, Shot } from "@/lib/types";
import { FatigueChart } from "@/components/FatigueChart";
import { CATEGORY_COLOR } from "@/lib/clubs";
import { fmt, fmt2, lr, formatDate, distanceUnitLabel } from "@/lib/format";
import { Card, SectionTitle, StatCard } from "@/components/ui";
import { ClubTable } from "@/components/ClubTable";
import { DispersionChart } from "@/components/DispersionChart";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { useT, useLang, type Dict } from "@/lib/i18n";

const L = {
  back: { en: "← Sessions", th: "← เซสชัน" },
  rangeSession: { en: "Range session", th: "เซสชันซ้อมไดร์ฟ" },
  shots: { en: "Shots", th: "ช็อต" },
  clubs: { en: "Clubs", th: "ไม้" },
  longestCarry: { en: "Longest carry", th: "Carry ไกลสุด" },
  avgSmash: { en: "Avg smash", th: "Smash เฉลี่ย" },
  clubBreakdown: { en: "Club breakdown", th: "แยกตามไม้" },
  clubBreakdownSub: {
    en: "Per-club averages for this session",
    th: "ค่าเฉลี่ยแต่ละไม้ของเซสชันนี้",
  },
  shotPattern: { en: "Shot pattern", th: "การกระจายช็อต" },
  mostHit: { en: "most hit this session", th: "ตีบ่อยสุดในเซสชันนี้" },
  allShots: { en: "All shots", th: "ช็อตทั้งหมด" },
  shotsLower: { en: "shots", th: "ช็อต" },
  swingTitle: { en: "Swing today", th: "วงสวิงวันนี้" },
  swingSub: {
    en: "Bag-wide read from this session — biggest lever first",
    th: "อ่านวงรวมทั้งถุงจากเซสชันนี้ · เรื่องที่ได้ผลสุดก่อน",
  },
  swingClean: {
    en: "Solid session — nothing glaring in your swing today. Keep grooving it.",
    th: "วันนี้วงนิ่ง ไม่มีอะไรน่าห่วง รักษาไว้",
  },
  swingThin: {
    en: "Hit a few more shots per club to get a swing read.",
    th: "ตีเพิ่มอีกนิดต่อไม้ เพื่อให้อ่านวงได้",
  },
  swingFrom: { en: "from", th: "จาก" },
} satisfies Dict;

const TONE_DOT: Record<string, string> = {
  bad: "bg-bad",
  warn: "bg-warn",
  good: "bg-good",
  info: "bg-ink-muted",
};

export function SessionDetailClient({
  session,
  shots,
  aggs,
  kpis,
  disp,
  topClub,
  fatigue,
  verdict,
}: {
  session: GolfSession;
  shots: Shot[];
  aggs: ClubAgg[];
  kpis: Kpis;
  disp: Dispersion;
  topClub: ClubAgg | null;
  fatigue: FatiguePoint[];
  verdict: SwingVerdict;
}) {
  const t = useT(L);
  const { lang } = useLang();
  const d = distanceUnitLabel(session.distance_unit);
  const cell = "px-3 py-1.5 text-sm whitespace-nowrap tnum";
  const notes = [...verdict.issues, ...(verdict.strength ? [verdict.strength] : [])];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/sessions"
          className="text-sm text-ink-muted hover:text-ink"
        >
          {t("back")}
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink">
              {session.title || t("rangeSession")}
            </h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              {formatDate(session.played_on)}
              {session.location ? ` · ${session.location}` : ""}
              {session.source_filename ? ` · ${session.source_filename}` : ""}
            </p>
          </div>
          <DeleteSessionButton id={session.id} />
        </div>
      </div>

      {/* Swing verdict — the hero: what your swing was doing this session. */}
      <Card className="border-accent/30 p-5">
        <SectionTitle sub={t("swingSub")}>{t("swingTitle")}</SectionTitle>
        {verdict.n < 5 ? (
          <p className="text-sm text-ink-muted">{t("swingThin")}</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-good">{t("swingClean")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {notes.map((note, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[note.tone]}`}
                  aria-hidden
                />
                <span className="text-ink">{lang === "th" ? note.th : note.text}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-ink-muted">
          {t("swingFrom")} {fmt(verdict.n)} {t("shotsLower")}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("shots")} value={fmt(kpis.shots)} />
        <StatCard label={t("clubs")} value={fmt(kpis.clubs)} />
        <StatCard
          label={t("longestCarry")}
          value={kpis.longestCarry ? fmt(kpis.longestCarry.value) : "—"}
          unit={d}
          hint={kpis.longestCarry?.club}
        />
        <StatCard
          label={t("avgSmash")}
          value={Number.isFinite(kpis.avgSmash) ? fmt2(kpis.avgSmash) : "—"}
        />
      </div>

      <Card className="p-5">
        <SectionTitle sub={t("clubBreakdownSub")}>
          {t("clubBreakdown")}
        </SectionTitle>
        <ClubTable
          aggs={aggs}
          distanceUnit={session.distance_unit}
          speedUnit={session.speed_unit}
        />
      </Card>

      {topClub ? (
        <Card className="p-5">
          <SectionTitle sub={`${topClub.club} · ${t("mostHit")}`}>
            {t("shotPattern")}
          </SectionTitle>
          <div className="max-w-sm">
            <DispersionChart
              dispersion={disp}
              unit={d}
              club={topClub.club}
              color={CATEGORY_COLOR[topClub.category]}
            />
          </div>
        </Card>
      ) : null}

      <FatigueChart data={fatigue} />

      <Card className="p-5">
        <SectionTitle sub={`${shots.length} ${t("shotsLower")}`}>
          {t("allShots")}
        </SectionTitle>
        <div className="-mx-1 max-h-[480px] overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-bg-panel">
              <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Club</th>
                <th className="px-3 py-2 text-right">Carry</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Ball</th>
                <th className="px-3 py-2 text-right">Smash</th>
                <th className="px-3 py-2 text-right">Launch°</th>
                <th className="px-3 py-2 text-right">Spin</th>
                <th className="px-3 py-2 text-right">Side</th>
              </tr>
            </thead>
            <tbody>
              {shots.map((s, i) => (
                <tr key={s.id} className="border-b border-line/50 last:border-0">
                  <td className={`${cell} text-ink-muted`}>
                    {s.shot_index ?? i + 1}
                  </td>
                  <td className={`${cell} font-medium`}>{s.club ?? "—"}</td>
                  <td className={`${cell} text-right font-semibold`}>
                    {fmt(s.carry_distance)}
                  </td>
                  <td className={`${cell} text-right`}>{fmt(s.total_distance)}</td>
                  <td className={`${cell} text-right`}>{fmt(s.ball_speed)}</td>
                  <td className={`${cell} text-right`}>{fmt2(s.smash_factor)}</td>
                  <td className={`${cell} text-right`}>{fmt(s.launch_angle)}</td>
                  <td className={`${cell} text-right`}>{fmt(s.spin_rate)}</td>
                  <td className={`${cell} text-right`}>
                    {lr(s.carry_deviation_distance ?? s.total_deviation_distance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
