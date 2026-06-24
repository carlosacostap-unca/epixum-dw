"use client";

import { useMemo, useState } from "react";

type MessageTemplate = "status" | "promotion" | "regular" | "free" | "custom";

interface StudentNotificationMessageComposerProps {
  studentName: string;
  studentEmail?: string;
  finalCourseStatus: string;
  finalCourseGrade: string;
  approvedAssignments: string;
  bestPartialExamGrade: string;
  finalProjectEvaluation: string;
}

const templateLabels: Record<MessageTemplate, string> = {
  status: "Estado final",
  promotion: "Promoción",
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
  }: Omit<StudentNotificationMessageComposerProps, "studentEmail">,
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
    return `${greeting}\n\nTe informamos que tu estado final en Diseño Web es Promociona, con nota final ${finalCourseGrade}.\n\n${summary}\n\nSaludos.`;
  }

  if (template === "regular") {
    return `${greeting}\n\nTe informamos que tu estado final en Diseño Web es Regulariza. Recorda revisar las instancias indicadas por el equipo docente para completar el cierre correspondiente.\n\n${summary}\n\nSaludos.`;
  }

  if (template === "free") {
    return `${greeting}\n\nTe informamos que tu estado final en Diseño Web es Libre. Si tenes dudas sobre tu situacion, podes responder este mensaje para revisar el detalle con el equipo docente.\n\n${summary}\n\nSaludos.`;
  }

  if (template === "custom") {
    return "";
  }

  return `${greeting}\n\nTe compartimos el cierre registrado para Diseño Web:\n\n${summary}\n\nSaludos.`;
}

export default function StudentNotificationMessageComposer(props: StudentNotificationMessageComposerProps) {
  const [template, setTemplate] = useState<MessageTemplate>("status");
  const [subject, setSubject] = useState(`Estado final - Diseño Web`);
  const [body, setBody] = useState(() => buildTemplate("status", props));
  const mailtoHref = useMemo(() => {
    if (!props.studentEmail) {
      return "";
    }

    return `mailto:${encodeURIComponent(props.studentEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [body, props.studentEmail, subject]);

  function handleTemplateChange(nextTemplate: MessageTemplate) {
    setTemplate(nextTemplate);
    setBody(buildTemplate(nextTemplate, props));
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">Mensaje al estudiante</h2>
      </div>
      <div className="grid gap-5 p-5">
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
          {props.studentEmail ? (
            <a
              href={mailtoHref}
              className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Enviar por email
            </a>
          ) : (
            <span className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              Sin email registrado
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
      </div>
    </section>
  );
}
