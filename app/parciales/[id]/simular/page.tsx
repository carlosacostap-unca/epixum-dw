import PartialExamSimulator from "@/components/PartialExamSimulator";
import { getPartialExam, getPartialExamSimulationQuestions } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SimulatePartialExamPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user || user.role !== "docente") {
    redirect("/");
  }

  const { id } = await params;
  const partialExam = await getPartialExam(id).catch(() => null);

  if (!partialExam) {
    notFound();
  }

  const questions = await getPartialExamSimulationQuestions(partialExam, 10);

  return (
    <div className="container mx-auto min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link
          href="/parciales/gestion"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
        >
          Volver a Gestionar parciales
        </Link>
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Simular parcial
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">{partialExam.title}</p>
        </div>
      </div>

      <PartialExamSimulator partialExam={partialExam} questions={questions} />
    </div>
  );
}
