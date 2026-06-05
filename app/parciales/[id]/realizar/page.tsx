import PartialExamSimulator from "@/components/PartialExamSimulator";
import {
  autoSubmitExpiredPartialExamAttempt,
  getOrCreatePartialExamAttempt,
  getLatestStudentPartialExamSimulation,
  getPartialExam,
  getPartialExamSimulationQuestions,
} from "@/lib/data";
import { getPartialExamAvailability } from "@/lib/partial-exam-availability";
import { PARTIAL_EXAM_QUESTION_COUNT } from "@/lib/partial-exam-rules";
import { getCurrentUser } from "@/lib/pocketbase-server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function TakePartialExamPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "docente" && user.role !== "estudiante")) {
    redirect("/");
  }

  const { id } = await params;
  const partialExam = await getPartialExam(id).catch(() => null);

  if (!partialExam) {
    notFound();
  }

  const availability = getPartialExamAvailability(partialExam);
  const canStudentView = availability.isPublished;

  if (user.role === "estudiante" && !canStudentView) {
    redirect("/parciales");
  }

  let questions = user.role === "docente" ? await getPartialExamSimulationQuestions(partialExam, PARTIAL_EXAM_QUESTION_COUNT) : [];
  let attemptId: string | undefined;
  let initialAnswers: Record<string, string> = {};

  if (user.role === "estudiante") {
    const submittedSimulation = await getLatestStudentPartialExamSimulation(partialExam.id);
    if (submittedSimulation) {
      return (
        <PartialExamShell partialExamTitle={partialExam.title} backHref="/parciales" backLabel="Volver a Parciales">
          <AvailabilityMessage
            title="Parcial enviado correctamente"
            message={
              submittedSimulation.scoreVisible
                ? `Tu nota es ${submittedSimulation.score}/${submittedSimulation.totalQuestions}.`
                : "Tu entrega quedo registrada. La nota se mostrara cuando el docente la habilite."
            }
          />
        </PartialExamShell>
      );
    }

    if (!availability.hasStarted) {
      return (
        <PartialExamShell partialExamTitle={partialExam.title} backHref="/parciales" backLabel="Volver a Parciales">
          <AvailabilityMessage
            title="El parcial todavia no esta habilitado"
            message={
              partialExam.startsAt
                ? `Podras iniciarlo desde ${new Date(partialExam.startsAt).toLocaleString("es-AR")}.`
                : "El docente todavia no habilito la fecha de inicio."
            }
          />
        </PartialExamShell>
      );
    }

    if (availability.hasEnded) {
      await autoSubmitExpiredPartialExamAttempt(partialExam);
      return (
        <PartialExamShell partialExamTitle={partialExam.title} backHref="/parciales" backLabel="Volver a Parciales">
          <AvailabilityMessage
            title="El parcial ya finalizo"
            message="La fecha y hora de cierre ya se cumplieron. Si tenias respuestas guardadas, el intento pendiente se registro automaticamente."
          />
        </PartialExamShell>
      );
    }

    const attempt = await getOrCreatePartialExamAttempt(partialExam, PARTIAL_EXAM_QUESTION_COUNT);
    if (attempt) {
      attemptId = attempt.id;
      initialAnswers = attempt.answers || {};
      questions = await getPartialExamSimulationQuestions(partialExam, PARTIAL_EXAM_QUESTION_COUNT, attempt.questionIds);
    } else {
      questions = [];
    }
  }

  return (
    <PartialExamShell
      partialExamTitle={partialExam.title}
      backHref={user.role === "docente" ? "/parciales/gestion" : "/parciales"}
      backLabel={user.role === "docente" ? "Volver a Gestionar parciales" : "Volver a Parciales"}
    >
      <PartialExamSimulator
        partialExam={partialExam}
        questions={questions}
        attemptId={attemptId}
        initialAnswers={initialAnswers}
        recordAttempt={user.role === "estudiante"}
      />
    </PartialExamShell>
  );
}

function PartialExamShell({
  partialExamTitle,
  backHref,
  backLabel,
  children,
}: {
  partialExamTitle: string;
  backHref: string;
  backLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="container mx-auto min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link
          href={backHref}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
        >
          {backLabel}
        </Link>
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-3xl">Realizar parcial</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">{partialExamTitle}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

function AvailabilityMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  );
}
