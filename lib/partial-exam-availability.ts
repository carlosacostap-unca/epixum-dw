import { PartialExam } from "@/types";

export type PartialExamAvailability = {
  isPublished: boolean;
  hasStarted: boolean;
  hasEnded: boolean;
  isOpen: boolean;
  startsAtMs: number | null;
  endsAtMs: number | null;
};

export function getPartialExamAvailability(partialExam: PartialExam, now = new Date()): PartialExamAvailability {
  const nowMs = now.getTime();
  const startsAtMs = partialExam.startsAt ? new Date(partialExam.startsAt).getTime() : null;
  const endsAtMs = partialExam.endsAt ? new Date(partialExam.endsAt).getTime() : null;
  const isPublished = partialExam.status === "Publicado";
  const hasStarted = startsAtMs === null || startsAtMs <= nowMs;
  const hasEnded = endsAtMs !== null && endsAtMs <= nowMs;

  return {
    isPublished,
    hasStarted,
    hasEnded,
    isOpen: isPublished && hasStarted && !hasEnded,
    startsAtMs,
    endsAtMs,
  };
}
