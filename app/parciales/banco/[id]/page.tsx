import ParcialesNav from "@/components/ParcialesNav";
import QuestionBankUnitDetail from "@/components/QuestionBankUnitDetail";
import {
  getPartialExamQuestionsByUnit,
  getPartialExamUnit,
  getPartialExamUnitDocumentsByUnit,
} from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface QuestionBankUnitPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuestionBankUnitPage({ params }: QuestionBankUnitPageProps) {
  const user = await getCurrentUser();

  if (!user || user.role !== "docente") {
    redirect("/");
  }

  const { id } = await params;
  const [unit, documents, questions] = await Promise.all([
    getPartialExamUnit(id),
    getPartialExamUnitDocumentsByUnit(id),
    getPartialExamQuestionsByUnit(id),
  ]);

  if (!unit) {
    notFound();
  }

  return (
    <div className="container mx-auto min-h-screen p-8">
      <ParcialesNav />

      <div className="mb-8">
        <Link
          href="/parciales/banco"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
        >
          Volver al banco de preguntas
        </Link>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{unit.name}</h1>
            {unit.description && (
              <p className="mt-2 max-w-3xl text-zinc-500 dark:text-zinc-400">{unit.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">{documents.length} documentos</span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">{questions.length} preguntas</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
              {questions.filter((question) => question.selected).length} seleccionadas
            </span>
          </div>
        </div>
      </div>

      <QuestionBankUnitDetail unit={unit} documents={documents} questions={questions} />
    </div>
  );
}
