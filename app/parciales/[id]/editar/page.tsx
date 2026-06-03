import PartialExamForm from "@/components/PartialExamForm";
import { getPartialExam, getPartialExamUnits } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditPartialExamPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user || user.role !== "docente") {
    redirect("/");
  }

  const { id } = await params;
  const [partialExam, questionBanks] = await Promise.all([
    getPartialExam(id).catch(() => null),
    getPartialExamUnits(),
  ]);

  if (!partialExam) {
    notFound();
  }

  return (
    <div className="container mx-auto min-h-screen max-w-4xl p-8">
      <div className="mb-8">
        <Link
          href="/parciales/gestion"
          className="mb-4 inline-flex items-center text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a Gestionar parciales
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Editar Parcial</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">Actualiza la informacion del examen parcial.</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <PartialExamForm partialExam={partialExam} questionBanks={questionBanks} />
      </div>
    </div>
  );
}
