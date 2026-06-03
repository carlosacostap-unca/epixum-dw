"use client";

import { MultipleChoiceOption, PartialExam, PartialExamQuestion } from "@/types";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

type SimulatedQuestion = PartialExamQuestion & {
  shuffledOptions: MultipleChoiceOption[];
};

interface PartialExamSimulatorProps {
  partialExam: PartialExam;
  questions: PartialExamQuestion[];
}

function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

export default function PartialExamSimulator({ partialExam, questions }: PartialExamSimulatorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingCamera, setIsRequestingCamera] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isFinished, setIsFinished] = useState(false);

  const simulatedQuestions = useMemo<SimulatedQuestion[]>(() => {
    return questions.map((question) => ({
      ...question,
      shuffledOptions: shuffleItems(question.options || []),
    }));
  }, [questions]);

  const currentQuestion = simulatedQuestions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const answeredCount = Object.keys(answers).length;
  const correctCount = simulatedQuestions.filter((question) => answers[question.id] === question.correctOptionId).length;

  useEffect(() => {
    if (cameraReady && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraReady]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function requestCamera() {
    setCameraError(null);
    setIsRequestingCamera(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
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
    if (!currentQuestion || isFinished) return;
    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: optionId,
    }));
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

  if (!cameraReady) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Antes de iniciar</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Para simular el parcial, primero activa la camara. La vista previa se mantendra visible durante la simulacion.
        </p>
        {cameraError && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {cameraError}
          </div>
        )}
        <button
          type="button"
          onClick={requestCamera}
          disabled={isRequestingCamera}
          className="mt-6 w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
        >
          {isRequestingCamera ? "Activando camara..." : "Activar camara e iniciar"}
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Simulacion finalizada</h2>
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-200">Nota final</p>
            <p className="mt-1 text-3xl font-bold text-blue-950 dark:text-blue-100">
              {correctCount}/{simulatedQuestions.length}
            </p>
            <p className="mt-2 text-sm text-blue-800 dark:text-blue-200">
              Cada pregunta correcta vale 1 punto. Respondiste {answeredCount} de {simulatedQuestions.length} preguntas.
            </p>
          </div>
          <div className="mt-6 space-y-3">
            {simulatedQuestions.map((question, index) => (
              <div key={question.id} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {index + 1}. {question.question}
                </p>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Respuesta correcta: {question.correctOptionId.toUpperCase()}
                  {answers[question.id] && ` | Tu respuesta: ${answers[question.id].toUpperCase()}`}
                </p>
                {question.explanation && (
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{question.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </section>
        <CameraPreview videoRef={videoRef} />
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
            onClick={() => setIsFinished(true)}
            className="rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Finalizar
          </button>
        </div>
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
