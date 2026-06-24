"use client";

import { updateFinalCourseResult } from "@/lib/actions";
import { FinalCourseStatus } from "@/types";
import { useState, useTransition } from "react";

const finalCourseStatusOptions: FinalCourseStatus[] = [
  "Promociona",
  "Regulariza",
  "En carrera",
  "Libre",
];

export default function FinalCourseResultControls({
  field,
  source,
  studentId,
  studentName,
  initialStatus,
  initialGrade,
}: {
  field: "status" | "grade";
  source: "platform" | "external-siu";
  studentId: string;
  studentName: string;
  initialStatus?: FinalCourseStatus;
  initialGrade?: number;
}) {
  const [status, setStatus] = useState<FinalCourseStatus | "">(initialStatus || "");
  const [grade, setGrade] = useState(initialGrade ? String(initialGrade) : "");
  const [lastSavedGrade, setLastSavedGrade] = useState(initialGrade ? String(initialGrade) : "");
  const [isPending, startTransition] = useTransition();

  function persistStatus(nextStatus: FinalCourseStatus | "") {
    const previousStatus = status;

    setStatus(nextStatus);

    startTransition(async () => {
      const result = await updateFinalCourseResult(source, studentId, {
        finalCourseStatus: nextStatus,
      });
      if (!result.success) {
        setStatus(previousStatus);
        alert(result.error || "No se pudo actualizar el resultado final.");
      }
    });
  }

  function persistGrade(nextGradeText: string) {
    const previousGrade = lastSavedGrade;
    const normalizedGradeText = nextGradeText.trim();
    const nextGrade = normalizedGradeText ? Number(normalizedGradeText) : null;

    setGrade(normalizedGradeText);

    startTransition(async () => {
      const result = await updateFinalCourseResult(source, studentId, {
        finalCourseGrade: nextGrade,
      });
      if (!result.success) {
        setGrade(previousGrade);
        alert(result.error || "No se pudo actualizar la nota final.");
        return;
      }
      setLastSavedGrade(normalizedGradeText);
    });
  }

  return (
    <div className="relative z-20">
      {field === "status" ? (
        <>
          <label className="sr-only" htmlFor={`final-status-${source}-${studentId}`}>
            Estado final de {studentName}
          </label>
          <select
            id={`final-status-${source}-${studentId}`}
            value={status}
            disabled={isPending}
            onChange={(event) => persistStatus(event.target.value as FinalCourseStatus | "")}
            className="w-full min-w-[140px] rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">Sin asignar</option>
            {finalCourseStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </>
      ) : (
        <>
          <label className="sr-only" htmlFor={`final-grade-${source}-${studentId}`}>
            Nota final de {studentName}
          </label>
          <input
            id={`final-grade-${source}-${studentId}`}
            type="number"
            min={1}
            max={10}
            step={1}
            value={grade}
            disabled={isPending}
            placeholder="-"
            onChange={(event) => {
              setGrade(event.target.value);
            }}
            onBlur={() => {
              if (grade !== lastSavedGrade) {
                persistGrade(grade);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            className="w-20 rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </>
      )}
    </div>
  );
}
