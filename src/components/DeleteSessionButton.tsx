"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSession } from "@/app/actions";
import { TrashIcon } from "./icons";

export function DeleteSessionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);

  if (confirm)
    return (
      <span className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await deleteSession(id);
              router.push("/sessions");
              router.refresh();
            })
          }
          className="rounded-lg bg-bad px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60 cursor-pointer"
        >
          {pending ? "Deleting…" : "Confirm delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirm(false)}
          className="text-sm text-ink-muted hover:text-ink cursor-pointer"
        >
          Cancel
        </button>
      </span>
    );

  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors duration-200 hover:border-bad/40 hover:text-bad cursor-pointer"
    >
      <TrashIcon className="h-4 w-4" />
      Delete
    </button>
  );
}
