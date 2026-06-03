import ParcialesNav from "@/components/ParcialesNav";
import QuestionBankUnitList from "@/components/QuestionBankUnitList";
import { getPartialExamQuestions, getPartialExamUnitDocuments, getPartialExamUnits } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function QuestionBankPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "docente") {
    redirect("/");
  }

  const [units, documents, questions] = await Promise.all([
    getPartialExamUnits(),
    getPartialExamUnitDocuments(),
    getPartialExamQuestions(),
  ]);

  return (
    <div className="container mx-auto min-h-screen p-8">
      <ParcialesNav />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Banco de preguntas</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Organiza preguntas por unidad, genera propuestas con IA y decide cuales se tendran en cuenta.
        </p>
      </div>

      <QuestionBankUnitList units={units} documents={documents} questions={questions} />
    </div>
  );
}
