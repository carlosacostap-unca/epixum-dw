"use client";

import { setPartialExamScoreVisibility } from "@/lib/actions";
import { useState, useTransition } from "react";

export default function PartialExamScoreVisibilityButton({
  simulationId,
  initialVisible,
}: {
  simulationId: string;
  initialVisible: boolean;
}) {
  const [visible, setVisible] = useState(initialVisible);
  const [isPending, startTransition] = useTransition();

  function toggleVisibility() {
    const nextVisible = !visible;
    setVisible(nextVisible);

    startTransition(async () => {
      const result = await setPartialExamScoreVisibility(simulationId, nextVisible);
      if (!result.success) {
        setVisible(!nextVisible);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggleVisibility}
      disabled={isPending}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
        visible
          ? "border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-200 dark:hover:bg-amber-950/40"
          : "border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
      }`}
    >
      {isPending ? "Actualizando..." : visible ? "Ocultar nota" : "Mostrar nota"}
    </button>
  );
}
