import {
  getAllAssignments,
  getAllDeliveries,
  getAllPartialExamSimulations,
  getAllPartialExams,
  getStudents,
} from "@/lib/data";
import { getDeliveryLimitDate } from "@/lib/delivery-deadlines";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { Assignment, Delivery, PartialExam, PartialExamSimulation, User } from "@/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type StudentCourseStatus = {
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

type CourseState = "En carrera para promocionar" | "En carrera para regularizar" | "Complicado" | "Fuera de carrera";

const specialDeadlineExemptEmail = "carlosacostap@sfvc.edu.ar";
const onTrackApprovedAssignments = 9;
const partialExamPassingGrade = 4;
const partialExamPromotionGrade = 7;
const administrativelyApprovedAssignmentIds = new Set([
  "vpl8hb0pc7n5ltv",
]);

const courseStateStyles: Record<CourseState, string> = {
  "En carrera para promocionar": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "En carrera para regularizar": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Complicado: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Fuera de carrera": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function getDeliveryForAssignment(deliveries: Delivery[], assignmentId: string) {
  return deliveries
    .filter((delivery) => delivery.status !== "draft")
    .filter((delivery) => delivery.assignment === assignmentId || delivery.expand?.assignment?.id === assignmentId)
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())[0];
}

function getLimitDate(assignment: Assignment, delivery?: Delivery) {
  return getDeliveryLimitDate(assignment, delivery);
}

function isPastDue(assignment: Assignment, student: User, delivery?: Delivery) {
  if (student.email === specialDeadlineExemptEmail) {
    return false;
  }

  const limitDate = getLimitDate(assignment, delivery);
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

function formatGrade(value: number | null) {
  return value === null ? "Sin datos" : `${value.toLocaleString("es-AR", { maximumFractionDigits: 1 })}/10`;
}

function buildLatestPartialExamSimulations(simulations: PartialExamSimulation[]) {
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

function buildStudentStatuses(
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

function MetricCard({ label, value, detail, tone }: { label: string; value: string | number; detail: string; tone: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${tone}`} />
      </div>
      <p className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{detail}</p>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const width = Math.min(Math.max(value, 0), 100);

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${width}%` }} />
    </div>
  );
}

function CourseStateBadge({ state }: { state: CourseState }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${courseStateStyles[state]}`}>
      {state}
    </span>
  );
}

function StatPill({ children, tone = "zinc" }: { children: React.ReactNode; tone?: "zinc" | "red" | "amber" | "emerald" }) {
  const styles = {
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    red: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[tone]}`}>{children}</span>;
}

function StudentRows({ statuses }: { statuses: StudentCourseStatus[] }) {
  if (statuses.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="px-5 py-8 text-center text-zinc-500 dark:text-zinc-400">No hay alumnos en este estado.</td>
      </tr>
    );
  }

  return statuses.map((status) => (
    <tr key={status.student.id} className="group relative cursor-pointer text-zinc-600 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50">
      <td className="relative px-5 py-4">
        <Link href={`/students/${status.student.id}`} className="absolute inset-0 z-10" aria-label={`Ver detalle de ${status.student.name || status.student.email}`} />
        <span className="font-medium text-blue-600 group-hover:underline dark:text-blue-400">
          {status.student.name || "Sin nombre"}
        </span>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{status.student.email}</p>
      </td>
      <td className="relative px-5 py-4">
        <Link href={`/students/${status.student.id}`} className="absolute inset-0 z-10" aria-hidden tabIndex={-1} />
        <CourseStateBadge state={status.courseState} />
      </td>
      <td className="relative px-5 py-4">
        <Link href={`/students/${status.student.id}`} className="absolute inset-0 z-10" aria-hidden tabIndex={-1} />
        <div className="flex min-w-52 items-center gap-3">
          <ProgressBar value={status.performance} />
          <span className="w-10 text-right font-semibold text-zinc-950 dark:text-zinc-100">{status.performance}%</span>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          {status.approvedCount} TPs aprobados, {status.expiredSubmittedCount}/{status.expiredAssignmentCount} computables entregados
        </p>
      </td>
      <td className="relative px-5 py-4">
        <Link href={`/students/${status.student.id}`} className="absolute inset-0 z-10" aria-hidden tabIndex={-1} />
        <p className="font-medium text-zinc-950 dark:text-zinc-100">
          {status.partialExamSubmittedCount}/{status.partialExamCount} realizados
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          Mejor nota {formatGrade(status.partialExamBestGrade)}
        </p>
      </td>
      <td className="relative px-5 py-4">
        <Link href={`/students/${status.student.id}`} className="absolute inset-0 z-10" aria-hidden tabIndex={-1} />
        <div className="flex flex-wrap gap-2">
          {(status.missingCount + status.correctionCount + status.pendingReviewCount) > 0 && (
            <StatPill tone="amber">{status.missingCount + status.correctionCount + status.pendingReviewCount} TPs</StatPill>
          )}
          {status.overdueCount > 0 && <StatPill tone="red">{status.overdueCount} vencidos</StatPill>}
          {status.partialExamSubmittedCount === 0 && <StatPill>Sin parcial rendido</StatPill>}
          {status.partialExamSubmittedCount > 0 && (
            <StatPill tone={status.partialExamApproved ? "emerald" : "amber"}>
              Parcial {status.partialExamApproved ? "aprobado" : "no aprobado"}
            </StatPill>
          )}
          {(status.missingCount + status.correctionCount + status.pendingReviewCount + status.overdueCount) === 0 && (
            <StatPill tone="emerald">Al dia</StatPill>
          )}
        </div>
      </td>
    </tr>
  ));
}

function StudentStatusSection({
  title,
  description,
  statuses,
  badgeState,
  badgeLabel,
}: {
  title: string;
  description: string;
  statuses: StudentCourseStatus[];
  badgeState?: CourseState;
  badgeLabel?: string;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">{title}</h3>
            {badgeState && <CourseStateBadge state={badgeState} />}
            {badgeLabel && <StatPill tone="emerald">{badgeLabel}</StatPill>}
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{statuses.length} alumnos</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800/70 dark:text-zinc-400">
            <tr>
              <th className="px-5 py-3">Alumno</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3">TPs</th>
              <th className="px-5 py-3">Parciales</th>
              <th className="px-5 py-3">Pendientes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            <StudentRows statuses={statuses} />
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function CourseDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "docente" && currentUser.role !== "admin")) {
    redirect("/");
  }

  const [students, assignments, deliveries, partialExams, partialExamSimulations] = await Promise.all([
    getStudents(),
    getAllAssignments(),
    getAllDeliveries(),
    getAllPartialExams(),
    getAllPartialExamSimulations(),
  ]);

  const latestPartialExamSimulations = buildLatestPartialExamSimulations(partialExamSimulations);
  const studentStatuses = buildStudentStatuses(students, assignments, deliveries, partialExams, latestPartialExamSimulations);

  const totalStudents = students.length;
  const approvedWebDesignModuleStudents = studentStatuses.filter((status) => status.student.approvedWebDesignModule);
  const activeCourseStudents = studentStatuses.filter((status) => !status.student.approvedWebDesignModule);
  const promotionStudents = activeCourseStudents.filter((status) => status.courseState === "En carrera para promocionar").length;
  const regularizationStudents = activeCourseStudents.filter((status) => status.courseState === "En carrera para regularizar").length;
  const complicatedStudents = activeCourseStudents.filter((status) => status.courseState === "Complicado").length;
  const outOfRaceStudents = activeCourseStudents.filter((status) => status.courseState === "Fuera de carrera").length;
  const studentSections: Array<{
    key: string;
    title: string;
    description: string;
    statuses: StudentCourseStatus[];
    badgeState?: CourseState;
    badgeLabel?: string;
  }> = [
    {
      key: "approved-web-design-module",
      title: "Modulo de diseno web aprobado",
      description: "Alumnos con la casilla de modulo de diseno web aprobada en la diplomatura en desarrollo web fullstack con JavaScript.",
      statuses: approvedWebDesignModuleStudents,
      badgeLabel: "Modulo aprobado",
    },
    {
      key: "promotion",
      title: "En carrera para promocionar",
      description: `${onTrackApprovedAssignments}+ TPs aprobados y mejor nota de parcial ${partialExamPromotionGrade} o superior.`,
      statuses: activeCourseStudents.filter((status) => status.courseState === "En carrera para promocionar"),
      badgeState: "En carrera para promocionar",
    },
    {
      key: "regularization",
      title: "En carrera para regularizar",
      description: `${onTrackApprovedAssignments}+ TPs aprobados y parcial aprobado con nota entre ${partialExamPassingGrade} y 6.`,
      statuses: activeCourseStudents.filter((status) => status.courseState === "En carrera para regularizar"),
      badgeState: "En carrera para regularizar",
    },
    {
      key: "complicated",
      title: "Complicado",
      description: `8 o menos TPs aprobados y parcial aprobado.`,
      statuses: activeCourseStudents.filter((status) => status.courseState === "Complicado"),
      badgeState: "Complicado",
    },
    {
      key: "out-of-race",
      title: "Fuera de carrera",
      description: "Sin parcial aprobado o sin las condiciones minimas de cursada.",
      statuses: activeCourseStudents.filter((status) => status.courseState === "Fuera de carrera"),
      badgeState: "Fuera de carrera",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Volver al panel
          </Link>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-100">Dashboard de Cursada</h1>
              <p className="mt-2 max-w-3xl text-zinc-500 dark:text-zinc-400">
                Seguimiento general de estudiantes con avance en trabajos practicos, resultados de parciales y alertas de correccion.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/students"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Ver estudiantes
              </Link>
              <Link
                href="/parciales/gestion"
                className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Gestionar parciales
              </Link>
            </div>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Estudiantes" value={totalStudents} detail="Alumnos registrados en la cursada" tone="bg-blue-500" />
          <MetricCard label="Promocionar" value={promotionStudents} detail={`${onTrackApprovedAssignments}+ TPs y parcial con ${partialExamPromotionGrade}+`} tone="bg-emerald-500" />
          <MetricCard label="Regularizar" value={regularizationStudents} detail={`${onTrackApprovedAssignments}+ TPs y parcial entre ${partialExamPassingGrade} y 6`} tone="bg-blue-500" />
          <MetricCard label="Complicado" value={complicatedStudents} detail={`8 o menos TPs aprobados y parcial aprobado`} tone="bg-orange-500" />
          <MetricCard label="Fuera de carrera" value={outOfRaceStudents} detail="Sin parcial aprobado o sin condiciones suficientes" tone="bg-red-500" />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">Listado de alumnos</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Vista consolidada de trabajos practicos y parciales por estudiante.</p>
          </div>
          <div className="grid gap-5">
            {studentSections.map((section) => (
              <StudentStatusSection
                key={section.key}
                title={section.title}
                description={section.description}
                statuses={section.statuses}
                badgeState={section.badgeState}
                badgeLabel={section.badgeLabel}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
