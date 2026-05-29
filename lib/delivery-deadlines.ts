import type { Assignment, Delivery, DeliveryFeedback } from "@/types";

const correctionWindowDays = 7;

function asValidDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getFeedbackCorrectionLimitDate(feedback?: Pick<DeliveryFeedback, 'sentAt' | 'created'> | null) {
  const sentAt = asValidDate(feedback?.sentAt || feedback?.created);
  if (!sentAt) return null;

  return new Date(sentAt.getTime() + correctionWindowDays * 24 * 60 * 60 * 1000);
}

export function getDeliveryLimitDate(
  assignment: Pick<Assignment, 'dueDate' | 'correctionDueDate'>,
  delivery?: Pick<Delivery, 'verdict' | 'latestFeedback'> | null
) {
  const isCorrection = delivery?.verdict === 'Corregir y reenviar';

  if (isCorrection) {
    const feedbackLimitDate = getFeedbackCorrectionLimitDate(delivery.latestFeedback);
    if (feedbackLimitDate) return feedbackLimitDate;

    const assignmentCorrectionLimitDate = asValidDate(assignment.correctionDueDate);
    if (assignmentCorrectionLimitDate) return assignmentCorrectionLimitDate;
  }

  return asValidDate(assignment.dueDate);
}

export function getCorrectionWindowDays() {
  return correctionWindowDays;
}
