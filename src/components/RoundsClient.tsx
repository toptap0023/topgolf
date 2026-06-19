"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GolfRound } from "@/lib/types";
import { addRound, deleteRound } from "@/app/actions";
import { Card, SectionTitle } from "./ui";
import { TrendChart } from "./TrendChart";
import { PlusIcon, TrashIcon } from "./icons";
import { todayISO, formatDate } from "@/lib/format";

const numOrNull = (v: string) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

export function RoundsClient({ rounds }: { rounds: GolfRound[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(rounds.length === 0);
  const [error, setError] = useState<string | null>(null);

  const [playedOn, setPlayedOn] = useState(todayISO());
  const [course, setCourse] = useState("");
  const [score, setScore] = useState("");
  const [putts, setPutts] = useState("");
  const [fairways, setFairways] = useState("");
  const [gir, setGir] = useState("");

  function submit() {
    if (!score.trim()) {
      setError("Enter your score.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await addRound({
        played_on: playedOn,
        course: course.trim() || null,
        score: numOrNull(score),
        par: 72,
        holes: 18,
        putts: numOrNull(putts),
        fairways_hit: numOrNull(fairways),
        greens_in_regulation: numOrNull(gir),
        notes: null,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setCourse("");
      setScore("");
      setPutts("");
      setFairways("");
      setGir("");
      router.refresh();
    });
  }

  const scored = rounds.filter((r) => r.score != null);
  const series = [
    {
      label: "Score",
      color: "#0a84ff",
      points: scored.map((r) => ({
        date: r.played_on,
        value: r.score as number,
      })),
    },
  ];

  const input =
    "rounded-xl border border-line bg-bg-panel px-3 py-2.5 text-ink placeholder:text-ink-muted/50 focus:border-accent";

  return (
    <div className="flex flex-col gap-5">
      {scored.length ? (
        <Card className="p-5">
          <SectionTitle sub="18-hole scores over time — chasing the 85 line">
            Score trend
          </SectionTitle>
          <TrendChart
            series={series}
            yLabel="Score"
            target={85}
            lowerBetter
            empty="Log a couple of rounds to see your trend."
          />
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">Log a round</h2>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 text-sm font-medium text-accent cursor-pointer"
          >
            <PlusIcon className="h-4 w-4" />
            {open ? "Hide" : "Add round"}
          </button>
        </div>

        {open ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink-muted">Date</span>
                <input
                  type="date"
                  value={playedOn}
                  onChange={(e) => setPlayedOn(e.target.value)}
                  className={`${input} cursor-pointer`}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink-muted">Course (optional)</span>
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="Course name"
                  className={input}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink-muted">Score</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="98"
                  className={`${input} tnum`}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink-muted">Putts</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={putts}
                  onChange={(e) => setPutts(e.target.value)}
                  placeholder="—"
                  className={`${input} tnum`}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink-muted">Fairways</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={fairways}
                  onChange={(e) => setFairways(e.target.value)}
                  placeholder="—"
                  className={`${input} tnum`}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-ink-muted">GIR</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={gir}
                  onChange={(e) => setGir(e.target.value)}
                  placeholder="—"
                  className={`${input} tnum`}
                />
              </label>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-bad">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="self-start rounded-xl bg-accent px-5 py-2.5 font-semibold text-bg shadow-glow transition-colors duration-200 hover:bg-accent-dark disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {pending ? "Saving…" : "Save round"}
            </button>
          </div>
        ) : null}
      </Card>

      {rounds.length ? (
        <Card className="p-2">
          <ul className="divide-y divide-line">
            {rounds.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-3">
                <span className="tnum w-12 text-2xl font-bold text-ink">
                  {r.score ?? "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {formatDate(r.played_on)}
                    {r.course ? ` · ${r.course}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted tnum">
                    {r.putts != null ? `${r.putts} putts` : ""}
                    {r.fairways_hit != null ? ` · ${r.fairways_hit} FW` : ""}
                    {r.greens_in_regulation != null
                      ? ` · ${r.greens_in_regulation} GIR`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Delete round"
                  onClick={() =>
                    start(async () => {
                      await deleteRound(r.id);
                      router.refresh();
                    })
                  }
                  disabled={pending}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition-colors duration-200 hover:bg-bad/10 hover:text-bad cursor-pointer"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
