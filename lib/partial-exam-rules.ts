export const PARTIAL_EXAM_QUESTION_COUNT = 10;

export function normalizeRelationIds(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return value ? [String(value)] : [];
}
