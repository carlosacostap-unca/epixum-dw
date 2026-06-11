"use client";

import { saveFinalProjectMemberEvaluations } from "@/lib/actions";
import {
  FinalProjectMemberEvaluation,
  FinalProjectMemberEvaluationRating,
  User,
} from "@/types";
import { useMemo, useState, useTransition } from "react";

interface FinalProjectMemberEvaluationFormProps {
  slotId: string;
  teamId: string;
  students: User[];
  evaluations: FinalProjectMemberEvaluation[];
  currentTeacherId: string;
}

const ratingOptions: { value: FinalProjectMemberEvaluationRating; label: string }[] = [
  { value: "excellent", label: "Excelente" },
  { value: "very_good", label: "Muy buena" },
  { value: "good", label: "Buena" },
  { value: "regular", label: "Regular" },
  { value: "insufficient", label: "Insuficiente" },
];

function formatStudentName(student: User) {
  return student.name || [student.firstName, student.lastName].filter(Boolean).join(" ") || student.email || "Sin nombre";
}

export default function FinalProjectMemberEvaluationForm({
  slotId,
  teamId,
  students,
  evaluations,
  currentTeacherId,
}: FinalProjectMemberEvaluationFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const evaluationByStudent = useMemo(() => {
    return new Map(
      evaluations
        .filter((evaluation) => evaluation.evaluatedBy === currentTeacherId)
        .map((evaluation) => [evaluation.student, evaluation]),
    );
  }, [currentTeacherId, evaluations]);

  function handleSubmit(formData: FormData) {
    setMessage("");
    setError("");

    startTransition(async () => {
      const result = await saveFinalProjectMemberEvaluations(formData);
      if (result.success) {
        setMessage("Evaluación guardada.");
      } else {
        setError(result.error || "No se pudo guardar la evaluación.");
      }
    });
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Evaluación durante la presentación</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Registrá asistencia, quiénes expusieron, evaluación y anotaciones para cada integrante del equipo.
        </p>
      </div>

      {students.length > 0 ? (
        <form action={handleSubmit} className="mt-5 space-y-4">
          <input type="hidden" name="slotId" value={slotId} />
          <input type="hidden" name="teamId" value={teamId} />

          {students.map((student) => {
            const evaluation = evaluationByStudent.get(student.id);

            return (
              <div
                key={student.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <input type="hidden" name="studentIds" value={student.id} />

                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{formatStudentName(student)}</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{student.email || "Sin email"}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex w-fit items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
                      <input
                        name={`present_${student.id}`}
                        type="checkbox"
                        defaultChecked={evaluation?.present ?? false}
                        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                      />
                      Presente
                    </label>
                    <label className="inline-flex w-fit items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
                      <input
                        name={`exposed_${student.id}`}
                        type="checkbox"
                        defaultChecked={evaluation?.exposed ?? false}
                        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                      />
                      Expuso
                    </label>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Evaluación</span>
                    <select
                      name={`rating_${student.id}`}
                      defaultValue={evaluation?.rating || ""}
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    >
                      <option value="">Sin evaluar todavía</option>
                      {ratingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Anotaciones</span>
                    <textarea
                      name={`notes_${student.id}`}
                      defaultValue={evaluation?.notes || ""}
                      rows={3}
                      placeholder="Observaciones sobre participación, defensa, dominio técnico o acuerdos pendientes."
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>
                </div>
              </div>
            );
          })}

          {(message || error) && (
            <p className={`text-sm ${error ? "text-red-600 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>
              {error || message}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isPending ? "Guardando evaluación..." : "Guardar evaluación"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          No hay integrantes registrados para evaluar.
        </p>
      )}
    </section>
  );
}
