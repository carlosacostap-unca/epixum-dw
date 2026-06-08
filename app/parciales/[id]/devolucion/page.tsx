import PartialExamText from "@/components/PartialExamText";
import { getStudentPartialExamFeedback } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PartialExamFeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user || user.role !== "estudiante") {
    redirect("/");
  }

  const { id } = await params;
  const feedback = await getStudentPartialExamFeedback(id).catch(() => null);

  if (!feedback) {
    notFound();
  }

  const { partialExam, simulation, questions } = feedback;

  return (
    <div className="container mx-auto min-h-screen p-4 sm:p-8">
      <div className="mb-8">
        <Link
          href="/parciales"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
        >
          Volver a Parciales
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">Devolución del parcial</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">{partialExam.title}</p>
      </div>

      {!simulation && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          Todavía no registramos una entrega para este parcial.
        </div>
      )}

      {simulation && !simulation.scoreVisible && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Tu parcial fue enviado, pero la devolución todavía no fue publicada por el docente.
        </div>
      )}

      {simulation?.scoreVisible && (
        <div className="space-y-6">
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Resultado</p>
            <p className="mt-2 text-4xl font-bold text-zinc-900 dark:text-zinc-100">
              {simulation.score}/{simulation.totalQuestions}
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Respondidas: {simulation.answeredQuestions}/{simulation.totalQuestions}
            </p>
          </section>

          <section className="space-y-4">
            {questions.map((question, index) => {
              const selectedOptionId = simulation.answers?.[question.id];
              const selectedOption = question.options.find((option) => option.id === selectedOptionId);
              const correctOption = question.options.find((option) => option.id === question.correctOptionId);
              const isCorrect = selectedOptionId === question.correctOptionId;

              return (
                <article
                  key={question.id}
                  className={`rounded-xl border p-5 dark:bg-zinc-900 ${
                    isCorrect
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900"
                      : "border-red-300 bg-red-50 dark:border-red-900"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Pregunta {index + 1}</h2>
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                        isCorrect
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100"
                          : "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-100"
                      }`}
                    >
                      {isCorrect ? "Correcta" : "Incorrecta"}
                    </span>
                  </div>

                  <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                    <PartialExamText text={question.question} variant="detail" />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <AnswerBox
                      title="Tu respuesta"
                      text={selectedOption?.text || "Sin responder"}
                      tone={isCorrect ? "correct" : "incorrect"}
                    />
                    <AnswerBox
                      title="Respuesta correcta"
                      text={correctOption?.text || "No disponible"}
                      tone="correct"
                    />
                  </div>

                  {question.explanation && (
                    <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                      <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Explicación</p>
                      <PartialExamText text={question.explanation} variant="detail" />
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}

function AnswerBox({ title, text, tone }: { title: string; text: string; tone: "correct" | "incorrect" }) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        tone === "correct"
          ? "border-emerald-200 bg-white dark:border-emerald-900 dark:bg-zinc-950"
          : "border-red-200 bg-white dark:border-red-900 dark:bg-zinc-950"
      }`}
    >
      <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
      <PartialExamText text={text} variant="detail" />
    </div>
  );
}
