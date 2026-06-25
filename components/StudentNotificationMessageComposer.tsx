"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendFinalNotificationMessage } from "@/lib/actions-notifications";

type MessageTemplate = "status" | "promotion" | "regular" | "free" | "custom";

interface StudentNotificationMessageComposerProps {
  studentId?: string;
  studentName: string;
  finalCourseStatus: string;
  finalCourseGrade: string;
  approvedAssignments: string;
  bestPartialExamGrade: string;
  finalProjectEvaluation: string;
  returnPath: string;
}

const templateLabels: Record<MessageTemplate, string> = {
  status: "Estado final",
  promotion: "Promocion",
  regular: "Regularidad",
  free: "Libre",
  custom: "Personalizado",
};

function buildTemplate(
  template: MessageTemplate,
  {
    studentName,
    finalCourseStatus,
    finalCourseGrade,
    approvedAssignments,
    bestPartialExamGrade,
    finalProjectEvaluation,
  }: Omit<StudentNotificationMessageComposerProps, "studentId" | "returnPath">,
) {
  const greeting = `Hola ${studentName},`;
  const summary = [
    `Estado final: ${finalCourseStatus}.`,
    `Nota final: ${finalCourseGrade}.`,
    `Trabajos practicos aprobados: ${approvedAssignments}.`,
    `Mejor parcial: ${bestPartialExamGrade}.`,
    `Coloquio: ${finalProjectEvaluation}.`,
  ].join("\n");

  if (template === "promotion") {
    return `${greeting}\n\nTe informamos que tu estado final en Diseno Web es Promociona, con nota final ${finalCourseGrade}.\n\n${summary}\n\nSaludos.`;
  }

  if (template === "regular") {
    return `${greeting}\n\nTe informamos que tu estado final en Diseno Web es Regulariza. Recorda revisar las instancias indicadas por el equipo docente para completar el cierre correspondiente.\n\n${summary}\n\nSaludos.`;
  }

  if (template === "free") {
    return `${greeting}\n\nTe informamos que tu estado final en Diseno Web es Libre. Si tenes dudas sobre tu situacion, podes responder este mensaje para revisar el detalle con el equipo docente.\n\n${summary}\n\nSaludos.`;
  }

  if (template === "custom") {
    return "";
  }

  return `${greeting}\n\nTe compartimos el cierre registrado para Diseno Web:\n\n${summary}\n\nSaludos.`;
}

export default function StudentNotificationMessageComposer(props: StudentNotificationMessageComposerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [template, setTemplate] = useState<MessageTemplate>("status");
  const [subject, setSubject] = useState("Estado final - Diseno Web");
  const [body, setBody] = useState(() => buildTemplate("status", props));
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleTemplateChange(nextTemplate: MessageTemplate) {
    setTemplate(nextTemplate);
    setBody(buildTemplate(nextTemplate, props));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!props.studentId) {
      setFeedback({ type: "error", text: "Este registro no tiene usuario de plataforma para recibir mensajes internos." });
      return;
    }

    startTransition(async () => {
      const result = await sendFinalNotificationMessage({
        studentId: props.studentId!,
        subject,
        content: body,
        returnPath: props.returnPath,
      });

      if (result.success) {
        setFeedback({ type: "success", text: "Mensaje enviado dentro de la plataforma." });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: result.error || "No se pudo enviar el mensaje." });
      }
    });
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">Enviar mensaje en plataforma</h2>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-5 p-5">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Plantilla</span>
          <select
            value={template}
            onChange={(event) => handleTemplateChange(event.target.value as MessageTemplate)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            {(Object.keys(templateLabels) as MessageTemplate[]).map((option) => (
              <option key={option} value={option}>
                {templateLabels[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Asunto</span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mensaje</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={12}
            className="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 shadow-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          {props.studentId ? (
            <button
              type="submit"
              disabled={isPending || !subject.trim() || !body.trim()}
              className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Enviando..." : "Enviar en plataforma"}
            </button>
          ) : (
            <span className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              Sin usuario de plataforma
            </span>
          )}
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(body)}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Copiar mensaje
          </button>
        </div>
        {feedback && (
          <p className={`text-sm ${feedback.type === "error" ? "text-red-600 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}>
            {feedback.text}
          </p>
        )}
      </form>
    </section>
  );
}
