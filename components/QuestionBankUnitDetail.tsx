"use client";

import {
  deletePartialExamQuestion,
  generateQuestionsForUnitDocument,
  generateQuestionsForUnitPrompt,
  updatePartialExamQuestionSelection,
  uploadPartialExamUnitDocument,
} from "@/lib/actions";
import { PartialExamQuestion, PartialExamUnit, PartialExamUnitDocument } from "@/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface QuestionBankUnitDetailProps {
  unit: PartialExamUnit;
  documents: PartialExamUnitDocument[];
  questions: PartialExamQuestion[];
}

export default function QuestionBankUnitDetail({ unit, documents, questions }: QuestionBankUnitDetailProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedCount = questions.filter((question) => question.selected).length;

  async function handleDocumentUpload(formData: FormData) {
    setMessage(null);
    formData.set("unitId", unit.id);
    const result = await uploadPartialExamUnitDocument(formData);
    setMessage(result.success ? "Documento subido." : result.error || "No se pudo subir el documento.");
    router.refresh();
  }

  function handleGenerate(documentId: string, questionCount: number) {
    setMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("documentId", documentId);
      formData.set("questionCount", String(questionCount));
      const result = await generateQuestionsForUnitDocument(formData);
      setMessage(
        result.success
          ? `Se generaron ${result.created || 0} preguntas.`
          : result.error || "No se pudieron generar preguntas."
      );
      router.refresh();
    });
  }

  async function handlePromptGenerate(formData: FormData) {
    setMessage(null);
    formData.set("unitId", unit.id);
    startTransition(async () => {
      const result = await generateQuestionsForUnitPrompt(formData);
      setMessage(
        result.success
          ? `Se generaron ${result.created || 0} preguntas desde el prompt.`
          : result.error || "No se pudieron generar preguntas desde el prompt."
      );
      router.refresh();
    });
  }

  function handleSelectionChange(questionId: string, selected: boolean) {
    startTransition(async () => {
      const result = await updatePartialExamQuestionSelection(questionId, selected);
      if (!result.success) setMessage(result.error || "No se pudo actualizar la pregunta.");
      router.refresh();
    });
  }

  function handleDelete(questionId: string) {
    if (!confirm("Eliminar esta pregunta del banco?")) return;

    startTransition(async () => {
      const result = await deletePartialExamQuestion(questionId);
      setMessage(result.success ? "Pregunta eliminada." : result.error || "No se pudo eliminar la pregunta.");
      router.refresh();
    });
  }

  return (
    <section className="space-y-6">
      {message && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Preguntas</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {questions.length} preguntas cargadas, {selectedCount} seleccionadas para tener en cuenta.
              </p>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Todavia no hay preguntas generadas para esta unidad.
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  disabled={isPending}
                  onSelectionChange={handleSelectionChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <form
            action={handleDocumentUpload}
            className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Documento de unidad</h2>
            <div className="mt-4 space-y-3">
              <input type="hidden" name="unitId" value={unit.id} />
              <input
                name="title"
                required
                placeholder="Apunte de la unidad"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <input
                name="file"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                required
                className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-200"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Subir documento
              </button>
            </div>
          </form>

          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Generar preguntas</h2>
            <form action={handlePromptGenerate} className="mt-4 space-y-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
              <input type="hidden" name="unitId" value={unit.id} />
              <textarea
                name="prompt"
                rows={5}
                required
                placeholder="Describe los contenidos, temas o criterios para generar preguntas."
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <input
                  name="questionCount"
                  type="number"
                  min={1}
                  max={25}
                  defaultValue={10}
                  className="w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Generar desde prompt
                </button>
              </div>
            </form>

            <div className="mt-4 space-y-3">
              {documents.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Tambien puedes subir un PDF o DOCX de la unidad para generar preguntas desde material cargado.
                </p>
              ) : (
                documents.map((document) => (
                  <div key={document.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{document.title}</p>
                    <p className="mt-1 break-words text-xs text-zinc-500 dark:text-zinc-400">
                      {document.originalName || document.file}
                    </p>
                    <div className="mt-3">
                      <GenerateDocumentQuestionsButton
                        disabled={isPending}
                        onGenerate={(count) => handleGenerate(document.id, count)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function GenerateDocumentQuestionsButton({
  disabled,
  onGenerate,
}: {
  disabled: boolean;
  onGenerate: (count: number) => void;
}) {
  const [count, setCount] = useState(10);

  return (
    <div className="grid grid-cols-[80px_1fr] gap-2">
      <input
        type="number"
        min={1}
        max={25}
        value={count}
        onChange={(event) => setCount(Number(event.target.value))}
        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onGenerate(count)}
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        Generar
      </button>
    </div>
  );
}

function QuestionCard({
  question,
  disabled,
  onSelectionChange,
  onDelete,
}: {
  question: PartialExamQuestion;
  disabled: boolean;
  onSelectionChange: (questionId: string, selected: boolean) => void;
  onDelete: (questionId: string) => void;
}) {
  return (
    <article className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <label className="flex gap-3">
          <input
            type="checkbox"
            checked={question.selected ?? false}
            disabled={disabled}
            onChange={(event) => onSelectionChange(question.id, event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            <FormattedQuestionText text={question.question} />
          </span>
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDelete(question.id)}
          className="self-start rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
        >
          Eliminar
        </button>
      </div>

      {question.kind && (
        <div className="mt-3">
          <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
            {question.kind}
          </span>
        </div>
      )}

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {question.options?.map((option) => (
          <div
            key={option.id}
            className={`rounded-md border px-3 py-2 text-sm ${
              option.id === question.correctOptionId
                ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                : "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
            }`}
          >
            <span className="font-semibold">{option.id.toUpperCase()}.</span>{" "}
            <FormattedQuestionText text={option.text} inline />
          </div>
        ))}
      </div>

      {(question.explanation || question.sourceReference || question.difficulty) && (
        <div className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          {question.difficulty && <span className="mr-3 font-medium">{question.difficulty}</span>}
          {question.explanation && <FormattedQuestionText text={question.explanation} inline />}
          {question.sourceReference && <p className="mt-1 text-xs">Fuente: {question.sourceReference}</p>}
        </div>
      )}
    </article>
  );
}

function FormattedQuestionText({ text, inline = false }: { text: string; inline?: boolean }) {
  const normalizedText = text.replace(/```([a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/g, (_, language, code) => {
    const trimmedCode = String(code).trim();
    const languageLabel = language ? String(language).trim() : "";
    return `\n\n[[CODE:${languageLabel}]]\n${trimmedCode}\n[[/CODE]]\n\n`;
  });

  const parts = normalizedText.split(/(\[\[CODE:[^\]]*\]\][\s\S]*?\[\[\/CODE\]\]|`[^`]+`)/g).filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        const codeBlockMatch = part.match(/^\[\[CODE:([^\]]*)\]\]\n?([\s\S]*?)\n?\[\[\/CODE\]\]$/);
        if (codeBlockMatch) {
          const language = codeBlockMatch[1];
          const code = codeBlockMatch[2].trim();

          return (
            <span key={index} className="my-3 block">
              {language && (
                <span className="rounded-t-md border border-b-0 border-zinc-300 bg-zinc-100 px-2 py-1 text-xs font-medium uppercase text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                  {language}
                </span>
              )}
              <pre className="overflow-x-auto rounded-md border border-zinc-300 bg-zinc-950 p-3 text-sm leading-relaxed text-zinc-100 dark:border-zinc-700">
                <code>{code}</code>
              </pre>
            </span>
          );
        }

        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={index}
              className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.92em] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        const Tag = inline ? "span" : "span";
        return (
          <Tag key={index} className="whitespace-pre-wrap">
            {part}
          </Tag>
        );
      })}
    </>
  );
}
