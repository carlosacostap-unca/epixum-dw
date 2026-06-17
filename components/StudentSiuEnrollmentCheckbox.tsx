"use client";

import { updateStudentSiuEnrollment } from "@/lib/actions";
import { useState, useTransition } from "react";

export default function StudentSiuEnrollmentCheckbox({
  studentId,
  initialValue,
  studentName,
}: {
  studentId: string;
  initialValue: boolean;
  studentName: string;
}) {
  const [checked, setChecked] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  const handleChange = (nextValue: boolean) => {
    const previousValue = checked;
    setChecked(nextValue);

    startTransition(async () => {
      const result = await updateStudentSiuEnrollment(studentId, nextValue);
      if (!result.success) {
        setChecked(previousValue);
        alert(result.error || "No se pudo actualizar la inscripcion en SIU.");
      }
    });
  };

  return (
    <label className="relative z-20 inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        disabled={isPending}
        aria-label={`Marcar inscripcion SIU de ${studentName}`}
        onChange={(event) => handleChange(event.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900"
      />
      <span className="sr-only">{checked ? "Inscripto en SIU" : "No inscripto en SIU"}</span>
    </label>
  );
}
