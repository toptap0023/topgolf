"use client";

import { useT, type Dict } from "@/lib/i18n";

const L = {
  analyze: { en: "Analyze", th: "วิเคราะห์" },
  rounds: { en: "Rounds", th: "รอบ" },
  roundsSub: {
    en: "Log your 18-hole scores to track progress toward your goal.",
    th: "บันทึกสกอร์ 18 หลุมเพื่อติดตามความคืบหน้าสู่เป้าหมาย",
  },
  import: { en: "Import", th: "นำเข้า" },
  export: { en: "Export", th: "ส่งออก" },
  settings: { en: "Settings", th: "ตั้งค่า" },
} satisfies Dict;

/** Translated h1 (+ optional sub) for server pages — page id keys into L. */
export function PageHeader({ page }: { page: "analyze" | "rounds" | "import" | "export" | "settings" }) {
  const t = useT(L);
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">{t(page)}</h1>
      {page === "rounds" ? (
        <p className="mt-0.5 text-sm text-ink-muted">{t("roundsSub")}</p>
      ) : null}
    </div>
  );
}
