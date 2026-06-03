import DeletePartialExamButton from "@/components/DeletePartialExamButton";
import FormattedDate from "@/components/FormattedDate";
import { PartialExam } from "@/types";
import Link from "next/link";

export default function PartialExamsList({ partialExams }: { partialExams: PartialExam[] }) {
  return (
    <div className="grid gap-6">
      {partialExams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          No hay parciales registrados aun.
        </div>
      ) : (
        partialExams.map((partialExam) => (
          <article
            key={partialExam.id}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                    {partialExam.status || "Planificado"}
                  </span>
                  {partialExam.startsAt && (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      Inicio: <FormattedDate date={partialExam.startsAt} locale="es-AR" showTime={true} />
                    </span>
                  )}
                  {partialExam.endsAt && (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      Fin: <FormattedDate date={partialExam.endsAt} locale="es-AR" showTime={true} />
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{partialExam.title}</h2>
                {partialExam.topics && (
                  <p className="mt-2 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-400">{partialExam.topics}</p>
                )}
                {partialExam.expand?.questionBanks && partialExam.expand.questionBanks.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {partialExam.expand.questionBanks.map((bank) => (
                      <span
                        key={bank.id}
                        className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-200"
                      >
                        {bank.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/parciales/${partialExam.id}/simular`}
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Simular
                </Link>
                {partialExam.title === "Simulacro Mundial FIFA 2026" && partialExam.status === "Publicado" && (
                  <Link
                    href={`/parciales/${partialExam.id}/simulaciones`}
                    className="inline-flex items-center rounded-md border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
                  >
                    Simulaciones
                  </Link>
                )}
                <Link
                  href={`/parciales/${partialExam.id}/editar`}
                  className="inline-flex items-center rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Editar
                </Link>
                <DeletePartialExamButton partialExamId={partialExam.id} />
              </div>
            </div>

            {partialExam.description && (
              <div
                className="prose prose-sm mt-4 max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: partialExam.description }}
              />
            )}
          </article>
        ))
      )}
    </div>
  );
}
