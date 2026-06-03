import FormattedDate from "@/components/FormattedDate";
import { getPartialExamSimulationReport } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PartialExamSimulationsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user || user.role !== "docente") {
    redirect("/");
  }

  const { id } = await params;
  const report = await getPartialExamSimulationReport(id).catch(() => null);

  if (!report) {
    notFound();
  }

  if (report.partialExam.title !== "Simulacro Mundial FIFA 2026" || report.partialExam.status !== "Publicado") {
    notFound();
  }

  return (
    <div className="container mx-auto min-h-screen p-4 sm:p-8">
      <div className="mb-8">
        <Link
          href="/parciales/gestion"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
        >
          Volver a Gestionar parciales
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Seguimiento de simulacro</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">{report.partialExam.title}</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Realizaron" value={report.completedStudents.length} />
        <SummaryCard label="No realizaron" value={report.pendingStudents.length} />
        <SummaryCard label="Intentos registrados" value={report.simulations.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Estudiantes que realizaron</h2>
          </div>
          {report.completedStudents.length === 0 ? (
            <p className="p-5 text-sm text-zinc-500 dark:text-zinc-400">Todavia no hay simulacros registrados.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {report.completedStudents.map(({ student, latestSimulation, attempts }) => (
                <div key={student.id} className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {student.name || student.email}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{student.email}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                      {latestSimulation?.score ?? 0}/{latestSimulation?.totalQuestions ?? 0}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {latestSimulation?.completedAt && (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
                        Ultimo intento: <FormattedDate date={latestSimulation.completedAt} locale="es-AR" showTime />
                      </span>
                    )}
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
                      {attempts} intento{attempts === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Estudiantes que no realizaron</h2>
          </div>
          {report.pendingStudents.length === 0 ? (
            <p className="p-5 text-sm text-zinc-500 dark:text-zinc-400">Todos los estudiantes realizaron el simulacro.</p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {report.pendingStudents.map((student) => (
                <div key={student.id} className="p-5">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{student.name || student.email}</h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{student.email}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}
