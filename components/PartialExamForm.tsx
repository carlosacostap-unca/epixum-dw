"use client";

import { createPartialExam, updatePartialExam } from "@/lib/actions";
import { PARTIAL_EXAM_QUESTION_COUNT } from "@/lib/partial-exam-rules";
import { PartialExam, PartialExamStatus, PartialExamUnit } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import RichTextEditor from "./RichTextEditor";

interface PartialExamFormProps {
  partialExam?: PartialExam;
  questionBanks?: PartialExamUnit[];
  onClose?: () => void;
}

const statuses: PartialExamStatus[] = ["Planificado", "Publicado", "Finalizado"];

export default function PartialExamForm({ partialExam, questionBanks = [], onClose }: PartialExamFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState(partialExam?.description || "");
  const [status, setStatus] = useState<PartialExamStatus>(partialExam?.status || "Planificado");
  const selectedQuestionBanks = new Set(
    Array.isArray(partialExam?.questionBanks)
      ? partialExam.questionBanks
      : partialExam?.questionBanks
        ? [partialExam.questionBanks]
        : []
  );

  const getLocalDateTime = (isoDate: string) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const startsAt = formData.get("startsAt") as string;
    const endsAt = formData.get("endsAt") as string;
    if (startsAt) {
      formData.set("startsAt", new Date(startsAt).toISOString());
    }
    if (endsAt) {
      formData.set("endsAt", new Date(endsAt).toISOString());
    }
    formData.set("description", description);
    formData.set("status", status);
    if (formData.getAll("questionBanks").length === 0) {
      setError("Selecciona al menos un banco de preguntas para el parcial.");
      setLoading(false);
      return;
    }

    try {
      const result = partialExam
        ? await updatePartialExam(partialExam.id, formData)
        : await createPartialExam(formData);

      if (result.success) {
        if (onClose) onClose();
        router.push("/parciales/gestion");
        router.refresh();
      } else {
        setError(result.error || "Ocurrio un error");
      }
    } catch {
      setError("Ocurrio un error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Titulo
          </label>
          <input
            type="text"
            name="title"
            id="title"
            defaultValue={partialExam?.title}
            required
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="startsAt" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Fecha y hora de inicio
            </label>
            <input
              type="datetime-local"
              name="startsAt"
              id="startsAt"
              defaultValue={partialExam?.startsAt ? getLocalDateTime(partialExam.startsAt) : ""}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="endsAt" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Fecha y hora de finalizacion
            </label>
            <input
              type="datetime-local"
              name="endsAt"
              id="endsAt"
              defaultValue={partialExam?.endsAt ? getLocalDateTime(partialExam.endsAt) : ""}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Estado
          </label>
          <select
            id="status"
            value={status}
            onChange={(event) => setStatus(event.target.value as PartialExamStatus)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {statuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="topics" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Temas
          </label>
          <textarea
            name="topics"
            id="topics"
            rows={3}
            defaultValue={partialExam?.topics}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <div className="mb-2">
            <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Bancos de preguntas</span>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Selecciona una o mas unidades. El parcial tomara {PARTIAL_EXAM_QUESTION_COUNT} preguntas al azar de esos bancos.
            </p>
          </div>
          {questionBanks.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              Todavia no hay bancos de preguntas creados.
            </div>
          ) : (
            <div className="grid gap-2 rounded-md border border-zinc-300 p-3 dark:border-zinc-700 md:grid-cols-2">
              {questionBanks.map((bank) => (
                <label
                  key={bank.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md p-2 text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <input
                    type="checkbox"
                    name="questionBanks"
                    value={bank.id}
                    defaultChecked={selectedQuestionBanks.has(bank.id)}
                    className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <span className="block font-medium text-zinc-900 dark:text-zinc-100">{bank.name}</span>
                    {bank.description && (
                      <span className="mt-0.5 line-clamp-2 block text-xs text-zinc-500 dark:text-zinc-400">
                        {bank.description}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Descripcion
          </label>
          <RichTextEditor content={description} onChange={setDescription} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
