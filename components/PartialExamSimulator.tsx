"use client";

import { recordPartialExamSimulation } from "@/lib/actions";
import { MultipleChoiceOption, PartialExam, PartialExamQuestion } from "@/types";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

type SimulatedQuestion = PartialExamQuestion & {
  shuffledOptions: MultipleChoiceOption[];
};

type FinishReason = "manual" | "time";

interface PartialExamSimulatorProps {
  partialExam: PartialExam;
  questions: PartialExamQuestion[];
  recordAttempt?: boolean;
}

function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function getRemainingTimeMs(endsAt?: string) {
  if (!endsAt) return null;
  return Math.max(0, new Date(endsAt).getTime() - Date.now());
}

function formatRemainingTime(milliseconds: number | null) {
  if (milliseconds === null) return "Sin limite configurado";

  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export default function PartialExamSimulator({ partialExam, questions, recordAttempt = false }: PartialExamSimulatorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedAttemptRef = useRef(false);
  const [simulatedQuestions] = useState<SimulatedQuestion[]>(() => {
    return questions.map((question) => ({
      ...question,
      shuffledOptions: shuffleItems(question.options || []),
    }));
  });
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [finishReason, setFinishReason] = useState<FinishReason>("manual");
  const [remainingTimeMs, setRemainingTimeMs] = useState<number | null>(() => getRemainingTimeMs(partialExam.endsAt));
  const [recordStatus, setRecordStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const answersForSimulatedQuestions = useMemo(() => {
    return simulatedQuestions.reduce<Record<string, string>>((currentAnswers, question) => {
      const answer = answers[question.id];
      if (answer) currentAnswers[question.id] = answer;
      return currentAnswers;
    }, {});
  }, [answers, simulatedQuestions]);

  const currentQuestion = simulatedQuestions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const answeredCount = Object.keys(answersForSimulatedQuestions).length;
  const correctCount = simulatedQuestions.filter((question) => answersForSimulatedQuestions[question.id] === question.correctOptionId).length;
  const allQuestionsAnswered = simulatedQuestions.every((question) => Boolean(answersForSimulatedQuestions[question.id]));
  const timeExpired = remainingTimeMs !== null && remainingTimeMs <= 0;

  useEffect(() => {
    if (cameraReady && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraReady]);

  useEffect(() => {
    if (!partialExam.endsAt || isFinished) return;

    const updateRemainingTime = () => {
      const nextRemainingTime = getRemainingTimeMs(partialExam.endsAt);
      setRemainingTimeMs(nextRemainingTime);

      if (nextRemainingTime !== null && nextRemainingTime <= 0) {
        setFinishReason("time");
        setIsFinished(true);
      }
    };

    updateRemainingTime();
    const interval = window.setInterval(updateRemainingTime, 1000);
    return () => window.clearInterval(interval);
  }, [isFinished, partialExam.endsAt]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!isFinished || !recordAttempt || recordedAttemptRef.current) return;

    recordedAttemptRef.current = true;
    setRecordStatus("saving");
    recordPartialExamSimulation({
      partialExamId: partialExam.id,
      questionIds: simulatedQuestions.map((question) => question.id),
      answers: answersForSimulatedQuestions,
      finishReason,
    }).then((result) => {
      setRecordStatus(result.success ? "saved" : "error");
    });
  }, [answersForSimulatedQuestions, finishReason, isFinished, partialExam.id, recordAttempt, simulatedQuestions]);

  async function requestCamera() {
    setCameraError(null);
    setIsRequestingCamera(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Este navegador no permite activar la camara desde esta pagina.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0 || !videoTracks.some((track) => track.readyState === "live")) {
        stream.getTracks().forEach((track) => track.stop());
        setCameraError("No se detecto una camara activa. Activa la camara para iniciar el simulacro.");
        return;
      }

      videoTracks.forEach((track) => {
        track.onended = () => {
          setCameraReady(false);
          setCameraError("La camara se detuvo. Debes activarla nuevamente para continuar el simulacro.");
        };
      });
      streamRef.current = stream;
      setCameraReady(true);
    } catch {
      setCameraError("No se pudo activar la camara. Revisa los permisos del navegador e intenta nuevamente.");
    } finally {
      setIsRequestingCamera(false);
    }
  }

  function selectAnswer(optionId: string) {
    if (!currentQuestion || isFinished || !cameraReady || timeExpired) return;
    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: optionId,
    }));
  }

  function finishSimulation(reason: FinishReason) {
    setFinishReason(reason);
    setIsFinished(true);
  }

  if (simulatedQuestions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">No hay preguntas para simular</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Asocia bancos de preguntas al parcial y marca preguntas seleccionadas para poder lanzar una simulacion.
        </p>
        <Link
          href={`/parciales/${partialExam.id}/editar`}
          className="mt-5 inline-flex rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Editar parcial
        </Link>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Simulacion finalizada</h2>
          {finishReason === "time" && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              El tiempo disponible para realizar el simulacro finalizo.
            </div>
          )}
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-200">Nota final</p>
            <p className="mt-1 text-3xl font-bold text-blue-950 dark:text-blue-100">
              {correctCount}/{simulatedQuestions.length}
            </p>
            <p className="mt-2 text-sm text-blue-800 dark:text-blue-200">
              Cada pregunta correcta vale 1 punto. Respondiste {answeredCount} de {simulatedQuestions.length} preguntas.
            </p>
          </div>
          {recordAttempt && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              {recordStatus === "saving" && "Registrando simulacro..."}
              {recordStatus === "saved" && "Simulacro registrado correctamente."}
              {recordStatus === "error" && "No se pudo registrar el simulacro. Avisa al docente."}
              {recordStatus === "idle" && "Preparando registro del simulacro..."}
            </div>
          )}
          <div className="mt-6 space-y-3">
            {simulatedQuestions.map((question, index) => {
              const userAnswer = answersForSimulatedQuestions[question.id];
              const isCorrect = userAnswer === question.correctOptionId;

              return (
                <div
                  key={question.id}
                  className={`rounded-md border p-4 ${
                    isCorrect
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                      : "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {index + 1}. {question.question}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                        isCorrect
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100"
                          : "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-100"
                      }`}
                    >
                      {isCorrect ? "Correcta" : "Incorrecta"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                    Respuesta correcta: {question.correctOptionId.toUpperCase()} | Tu respuesta:{" "}
                    {userAnswer?.toUpperCase() || "Sin responder"}
                  </p>
                  {question.explanation && (
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{question.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        <CameraPreview videoRef={videoRef} />
      </div>
    );
  }

  if (!cameraReady) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Antes de iniciar</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Para simular el parcial, primero activa la camara. La vista previa se mantendra visible durante la simulacion.
        </p>
        {partialExam.endsAt && (
          <p className="mt-3 rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            Tiempo restante: {formatRemainingTime(remainingTimeMs)}
          </p>
        )}
        {cameraError && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {cameraError}
          </div>
        )}
        <button
          type="button"
          onClick={requestCamera}
          disabled={isRequestingCamera || timeExpired}
          className="mt-6 w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
        >
          {timeExpired ? "Tiempo finalizado" : isRequestingCamera ? "Activando camara..." : "Activar camara e iniciar"}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-300">
              Pregunta {currentIndex + 1} de {simulatedQuestions.length}
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 sm:w-64">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${((currentIndex + 1) / simulatedQuestions.length) * 100}%` }}
              />
            </div>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {answeredCount}/{simulatedQuestions.length} respondidas
          </span>
        </div>

        <div className="mb-5 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Tiempo restante</p>
          <p className={`mt-1 text-2xl font-bold ${timeExpired ? "text-red-600 dark:text-red-300" : "text-zinc-900 dark:text-zinc-100"}`}>
            {formatRemainingTime(remainingTimeMs)}
          </p>
        </div>

        <h2 className="text-xl font-bold leading-8 text-zinc-900 dark:text-zinc-100 sm:text-2xl">
          {currentQuestion.question}
        </h2>

        <div className="mt-6 grid gap-3">
          {currentQuestion.shuffledOptions.map((option, optionIndex) => {
            const isSelected = selectedAnswer === option.id;
            const displayLabel = String.fromCharCode(65 + optionIndex);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => selectAnswer(option.id)}
                className={`min-h-14 rounded-lg border px-4 py-3 text-left text-sm font-medium transition sm:text-base ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-100"
                    : "border-zinc-200 text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="mr-2 font-bold">{displayLabel}.</span>
                {option.text}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
            className="rounded-md border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={currentIndex === simulatedQuestions.length - 1}
            onClick={() => setCurrentIndex((value) => Math.min(simulatedQuestions.length - 1, value + 1))}
            className="rounded-md border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Siguiente
          </button>
          <button
            type="button"
            disabled={!allQuestionsAnswered}
            onClick={() => finishSimulation("manual")}
            className="rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            title={allQuestionsAnswered ? undefined : "Responde todas las preguntas para finalizar"}
          >
            Finalizar
          </button>
        </div>
        {!allQuestionsAnswered && (
          <p className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400 sm:text-right">
            Responde todas las preguntas para finalizar el simulacro.
          </p>
        )}
      </section>

      <CameraPreview videoRef={videoRef} />
    </div>
  );
}

function CameraPreview({ videoRef }: { videoRef: RefObject<HTMLVideoElement | null> }) {
  return (
    <aside className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 lg:sticky lg:top-4 lg:self-start">
      <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Camara activa</p>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="aspect-video w-full rounded-md bg-zinc-950 object-cover"
      />
    </aside>
  );
}
