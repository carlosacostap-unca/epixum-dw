"use client";

import { createPartialExamUnit } from "@/lib/actions";
import { PartialExamQuestion, PartialExamUnit, PartialExamUnitDocument } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface QuestionBankUnitListProps {
  units: PartialExamUnit[];
  documents: PartialExamUnitDocument[];
  questions: PartialExamQuestion[];
}

export default function QuestionBankUnitList({ units, documents, questions }: QuestionBankUnitListProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const unitStats = useMemo(() => {
    return units.reduce<Record<string, { documents: number; questions: number; selected: number }>>((acc, unit) => {
      acc[unit.id] = {
        documents: documents.filter((document) => document.unit === unit.id).length,
        questions: questions.filter((question) => question.unit === unit.id).length,
        selected: questions.filter((question) => question.unit === unit.id && question.selected).length,
      };
      return acc;
    }, {});
  }, [documents, questions, units]);

  async function handleUnitCreate(formData: FormData) {
    setMessage(null);
    const result = await createPartialExamUnit(formData);
    setMessage(result.success ? "Unidad creada." : result.error || "No se pudo crear la unidad.");
    if (result.success) {
      setIsCreateModalOpen(false);
    }
    router.refresh();
  }

  return (
    <section className="space-y-6">
      {message && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          {message}
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Unidades</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Entra a una unidad para cargar documentos, generar preguntas y revisar la seleccion.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Nueva unidad
          </button>
        </div>

        {units.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Crea una unidad para empezar a construir el banco de preguntas.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {units.map((unit) => {
              const stats = unitStats[unit.id] || { documents: 0, questions: 0, selected: 0 };

              return (
                <Link
                  key={unit.id}
                  href={`/parciales/banco/${unit.id}`}
                  className="grid gap-3 px-5 py-4 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60 md:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{unit.name}</h3>
                    {unit.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {unit.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 md:justify-end">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
                      {stats.documents} docs
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
                      {stats.questions} preguntas
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                      {stats.selected} seleccionadas
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Nueva unidad</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Crea una unidad para organizar documentos y preguntas.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                X
              </button>
            </div>
 
        <form
          action={handleUnitCreate}
              className="mt-5 space-y-3"
        >
            <input
              name="name"
              required
              placeholder="Unidad 1"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            <textarea
              name="description"
              rows={4}
              placeholder="Descripcion breve"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            <button
              type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Crear unidad
            </button>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="ml-2 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
        </form>
          </div>
        </div>
      )}
    </section>
  );
}
