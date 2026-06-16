"use client";

import { updateDiplomaEquivalenceStatus } from "@/lib/actions";
import type { WebDesignModuleEquivalenceStatus } from "@/types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const actions: Array<{ status: WebDesignModuleEquivalenceStatus; label: string; className: string; confirm?: string }> = [
  {
    status: "confirmed",
    label: "Confirmar",
    className: "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-950/30",
  },
  {
    status: "doubtful",
    label: "Dudoso",
    className: "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/30",
  },
  {
    status: "dismissed",
    label: "Desestimar",
    className: "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30",
    confirm: "Se mantendra la declaracion del alumno, pero quedara marcada como desestimada.",
  },
];

export default function DiplomaEquivalenceStatusActions({
  studentId,
  studentName,
  currentStatus,
}: {
  studentId: string;
  studentName: string;
  currentStatus: WebDesignModuleEquivalenceStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (status: WebDesignModuleEquivalenceStatus, confirmMessage?: string) => {
    if (status === currentStatus || isPending) return;

    if (confirmMessage) {
      const confirmed = confirm(`${confirmMessage}\n\nAlumno: ${studentName}`);
      if (!confirmed) return;
    }

    startTransition(async () => {
      const result = await updateDiplomaEquivalenceStatus(studentId, status);
      if (!result.success) {
        alert(result.error || "No se pudo actualizar la equivalencia.");
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="relative z-20 flex flex-wrap gap-2">
      {actions.map((action) => {
        const isActive = action.status === currentStatus;

        return (
          <button
            key={action.status}
            type="button"
            onClick={() => handleChange(action.status, action.confirm)}
            disabled={isPending || isActive}
            className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${action.className} ${isActive ? "bg-zinc-100 dark:bg-zinc-800" : ""}`}
          >
            {isPending && !isActive ? "Guardando..." : action.label}
          </button>
        );
      })}
    </div>
  );
}
