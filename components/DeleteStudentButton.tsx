"use client";

import { deleteStudentCourseData } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function DeleteStudentButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const confirmed = window.confirm(
      `Eliminar a ${studentName}?\n\nSe borraran sus entregas, parciales, consultas, equipo, validaciones y demas informacion de cursada. Esta accion no se puede deshacer.`
    );

    if (!confirmed) return;
    setError(null);

    startTransition(async () => {
      const result = await deleteStudentCourseData(studentId);
      if (!result.success) {
        setError(result.error || "No se pudo eliminar el estudiante.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/40"
      >
        {isPending ? "Eliminando..." : "Eliminar"}
      </button>
      {error && <span className="max-w-44 text-xs text-red-600 dark:text-red-300">{error}</span>}
    </div>
  );
}
