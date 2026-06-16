import { getDeliveryLimitDate } from "@/lib/delivery-deadlines";
import type { Assignment, Delivery, PartialExam, PartialExamSimulation, User } from "@/types";

export type CourseState =
  | "En carrera para promocionar"
  | "En carrera para regularizar"
  | "Complicado"
  | "Fuera de carrera";

export type StudentCourseStatus = {
  student: User;
  courseState: CourseState;
  approvedCount: number;
  submittedCount: number;
  missingCount: number;
  overdueCount: number;
  correctionCount: number;
  pendingReviewCount: number;
  performance: number;
  expiredAssignmentCount: number;
  expiredApprovedCount: number;
  expiredSubmittedCount: number;
  partialExamSubmittedCount: number;
  partialExamCount: number;
  partialExamBestGrade: number | null;
  partialExamApproved: boolean;
  partialExamPendingCount: number;
};

export const onTrackApprovedAssignments = 9;
export const partialExamPassingGrade = 4;
export const partialExamPromotionGrade = 7;

const specialDeadlineExemptEmail = "carlosacostap@sfvc.edu.ar";
const administrativelyApprovedAssignmentIds = new Set(["vpl8hb0pc7n5ltv"]);

export const courseStateStyles: Record<CourseState, string> = {
  "En carrera para promocionar": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "En carrera para regularizar": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Complicado: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Fuera de carrera": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function getDeliveryForAssignment(deliveries: Delivery[], assignmentId: string) {
  return deliveries
    .filter((delivery) => delivery.status !== "draft")
    .filter((delivery) => delivery.assignment === assignmentId || delivery.expand?.assignment?.id === assignmentId)
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())[0];
}

function isPastDue(assignment: Assignment, student: User, delivery?: Delivery) {
  if (student.email === specialDeadlineExemptEmail) {
    return false;
  }

  const limitDate = getDeliveryLimitDate(assignment, delivery);
  return limitDate ? limitDate < new Date() : false;
}

function isAdministrativelyApprovedAssignment(assignment: Assignment) {
  return administrativelyApprovedAssignmentIds.has(assignment.id);
}

function getPerformanceAssignments(assignments: Assignment[]) {
  const now = new Date();
  return assignments.filter((assignment) => {
    if (isAdministrativelyApprovedAssignment(assignment)) {
      return true;
    }

    return assignment.dueDate && new Date(assignment.dueDate) <= now;
  });
}

function getCourseState(approvedAssignmentCount: number, partialExamBestGrade: number | null): CourseState {
  if (partialExamBestGrade === null || partialExamBestGrade < partialExamPassingGrade) {
    return "Fuera de carrera";
  }

  if (approvedAssignmentCount < onTrackApprovedAssignments) {
    return "Complicado";
  }

  if (partialExamBestGrade >= partialExamPromotionGrade) {
    return "En carrera para promocionar";
  }

  return "En carrera para regularizar";
}

function getPerformance(approvedCount: number, assignmentCount: number) {
  return assignmentCount > 0 ? Math.round((approvedCount / assignmentCount) * 100) : 0;
}

function getSimulationGrade(simulation: PartialExamSimulation) {
  if (!simulation.totalQuestions) {
    return 0;
  }

  return Math.round((simulation.score / simulation.totalQuestions) * 100) / 10;
}

export function formatGrade(value: number | null) {
  return value === null ? "Sin datos" : `${value.toLocaleString("es-AR", { maximumFractionDigits: 1 })}/10`;
}

export function buildLatestPartialExamSimulations(simulations: PartialExamSimulation[]) {
  const latestByStudentAndExam = new Map<string, PartialExamSimulation>();

  for (const simulation of simulations) {
    const key = `${simulation.student}:${simulation.partialExam}`;
    const current = latestByStudentAndExam.get(key);
    if (!current || new Date(simulation.completedAt).getTime() > new Date(current.completedAt).getTime()) {
      latestByStudentAndExam.set(key, simulation);
    }
  }

  return latestByStudentAndExam;
}

export function buildStudentCourseStatuses(
  students: User[],
  assignments: Assignment[],
  deliveries: Delivery[],
  partialExams: PartialExam[],
  latestPartialExamSimulations: Map<string, PartialExamSimulation>,
) {
  const expiredAssignmentIds = new Set(getPerformanceAssignments(assignments).map((assignment) => assignment.id));
  const expiredAssignmentCount = expiredAssignmentIds.size;

  return students.map<StudentCourseStatus>((student) => {
    const studentDeliveries = deliveries.filter((delivery) => {
      const deliveryStudentId = delivery.student || delivery.expand?.student?.id;
      return deliveryStudentId === student.id;
    });

    let approvedCount = 0;
    let submittedCount = 0;
    let missingCount = 0;
    let overdueCount = 0;
    let correctionCount = 0;
    let pendingReviewCount = 0;
    let expiredApprovedCount = 0;
    let expiredSubmittedCount = 0;

    assignments.forEach((assignment) => {
      const isExpiredAssignment = expiredAssignmentIds.has(assignment.id);
      const delivery = getDeliveryForAssignment(studentDeliveries, assignment.id);

      if (!delivery) {
        missingCount += 1;
        if (isPastDue(assignment, student)) {
          overdueCount += 1;
        }
        return;
      }

      submittedCount += 1;
      if (isExpiredAssignment) {
        expiredSubmittedCount += 1;
      }

      if (delivery.status === "graded" && delivery.verdict === "Aprobado") {
        approvedCount += 1;
        if (isExpiredAssignment) {
          expiredApprovedCount += 1;
        }
        return;
      }

      if (delivery.verdict === "Corregir y reenviar") {
        correctionCount += 1;
        if (isPastDue(assignment, student, delivery)) {
          overdueCount += 1;
        }
        return;
      }

      pendingReviewCount += 1;
    });

    const studentPartialExamGrades = partialExams
      .map((partialExam) => latestPartialExamSimulations.get(`${student.id}:${partialExam.id}`))
      .filter(Boolean)
      .map((simulation) => getSimulationGrade(simulation as PartialExamSimulation));
    const partialExamSubmittedCount = studentPartialExamGrades.length;
    const partialExamBestGrade = partialExamSubmittedCount > 0 ? Math.max(...studentPartialExamGrades) : null;
    const partialExamApproved = partialExamBestGrade !== null && partialExamBestGrade >= partialExamPassingGrade;
    const performance = getPerformance(expiredApprovedCount, expiredAssignmentCount);
    const courseState = getCourseState(approvedCount, partialExamBestGrade);

    return {
      student,
      courseState,
      approvedCount,
      submittedCount,
      missingCount,
      overdueCount,
      correctionCount,
      pendingReviewCount,
      performance,
      expiredAssignmentCount,
      expiredApprovedCount,
      expiredSubmittedCount,
      partialExamSubmittedCount,
      partialExamCount: partialExams.length,
      partialExamBestGrade,
      partialExamApproved,
      partialExamPendingCount: Math.max(partialExams.length - partialExamSubmittedCount, 0),
    };
  });
}
