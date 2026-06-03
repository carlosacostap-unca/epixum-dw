import ParcialesNav from "@/components/ParcialesNav";
import { getPartialExamQuestions, getPartialExamsManagementData } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PartialExamsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "docente") {
    redirect("/");
  }

  const { partialExams, collectionReady } = await getPartialExamsManagementData();
  const questions = collectionReady ? await getPartialExamQuestions() : [];
  const selectedQuestions = questions.filter((question) => question.selected).length;

  return (
    <div className="container mx-auto min-h-screen p-8">
      <ParcialesNav />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Parciales</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">Accesos principales para preparar y administrar parciales.</p>
      </div>

      {!collectionReady && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <h2 className="text-lg font-bold">Configuracion pendiente en PocketBase</h2>
          <p className="mt-2 leading-relaxed">
            Falta crear la coleccion <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900">partial_exams</code>.
            Los campos y reglas necesarios estan documentados en <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900">README_SCHEMA.md</code>.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/parciales/gestion" className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-blue-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M6 21h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Gestionar parciales</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {partialExams.length} parciales registrados. Crea, edita y organiza examenes.
          </p>
        </Link>

        <Link href="/parciales/banco" className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M8 4h8a2 2 0 012 2v14l-4-2-4 2-4-2V6a2 2 0 012-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Banco de preguntas</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {questions.length} preguntas cargadas, {selectedQuestions} seleccionadas para futuros parciales.
          </p>
        </Link>
      </div>
    </div>
  );
}
