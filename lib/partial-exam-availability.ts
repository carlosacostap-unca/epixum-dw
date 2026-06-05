import { PartialExam, PartialExamTurn } from "@/types";

export type PartialExamAvailability = {
  isPublished: boolean;
  hasStarted: boolean;
  hasEnded: boolean;
  isOpen: boolean;
  startsAtMs: number | null;
  endsAtMs: number | null;
  activeTurn: PartialExamTurn | null;
  nextTurn: PartialExamTurn | null;
  selectedTurn: PartialExamTurn | null;
};

function getSortedTurns(partialExam: PartialExam) {
  return [...(partialExam.turns || [])].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export function getPartialExamAvailability(partialExam: PartialExam, now = new Date(), turnId?: string): PartialExamAvailability {
  const nowMs = now.getTime();
  const isPublished = partialExam.status === "Publicado";
  const turns = getSortedTurns(partialExam);

  if (turns.length > 0) {
    const selectedTurn = turnId ? turns.find((turn) => turn.id === turnId) || null : null;
    const openTurn = turns.find((turn) => {
      const startsAtMs = new Date(turn.startsAt).getTime();
      const endsAtMs = new Date(turn.endsAt).getTime();
      return startsAtMs <= nowMs && endsAtMs > nowMs;
    }) || null;
    const activeTurn = selectedTurn || openTurn;
    const nextTurn = turns.find((turn) => new Date(turn.startsAt).getTime() > nowMs) || null;

    if (activeTurn) {
      const startsAtMs = new Date(activeTurn.startsAt).getTime();
      const endsAtMs = new Date(activeTurn.endsAt).getTime();
      const hasStarted = startsAtMs <= nowMs;
      const hasEnded = endsAtMs <= nowMs;

      return {
        isPublished,
        hasStarted,
        hasEnded,
        isOpen: isPublished && hasStarted && !hasEnded,
        startsAtMs,
        endsAtMs,
        activeTurn: isPublished && hasStarted && !hasEnded ? activeTurn : null,
        nextTurn,
        selectedTurn: activeTurn,
      };
    }

    const hasStarted = turns.some((turn) => new Date(turn.startsAt).getTime() <= nowMs);
    const hasEnded = !nextTurn && turns.every((turn) => new Date(turn.endsAt).getTime() <= nowMs);

    return {
      isPublished,
      hasStarted,
      hasEnded,
      isOpen: false,
      startsAtMs: nextTurn ? new Date(nextTurn.startsAt).getTime() : null,
      endsAtMs: nextTurn ? new Date(nextTurn.endsAt).getTime() : null,
      activeTurn: null,
      nextTurn,
      selectedTurn: null,
    };
  }

  const startsAtMs = partialExam.startsAt ? new Date(partialExam.startsAt).getTime() : null;
  const endsAtMs = partialExam.endsAt ? new Date(partialExam.endsAt).getTime() : null;
  const hasStarted = startsAtMs === null || startsAtMs <= nowMs;
  const hasEnded = endsAtMs !== null && endsAtMs <= nowMs;

  return {
    isPublished,
    hasStarted,
    hasEnded,
    isOpen: isPublished && hasStarted && !hasEnded,
    startsAtMs,
    endsAtMs,
    activeTurn: null,
    nextTurn: null,
    selectedTurn: null,
  };
}
