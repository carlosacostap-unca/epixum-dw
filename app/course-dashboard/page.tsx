import { getAllAssignments, getAllDeliveries, getStudents } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { Assignment, Delivery, User } from "@/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

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
};

type CourseState = 'Aprobado' | 'En carrera y bien' | 'En carrera pero complicado' | 'Fuera de carrera';

type AssignmentCourseStatus = {
  assignment: Assignment;
  approvedCount: number;
  submittedCount: number;
  pendingReviewCount: number;
  correctionCount: number;
  missingCount: number;
  overdueCount: number;
};

const specialDeadlineExemptEmail = 'carlosacostap@sfvc.edu.ar';
const onTrackApprovalRate = 70;
const regularApprovalRate = 35;
const administrativelyApprovedAssignmentIds = new Set([
  'vpl8hb0pc7n5ltv',
]);

const courseStateStyles: Record<CourseState, string> = {
  'Aprobado': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'En carrera y bien': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'En carrera pero complicado': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'Fuera de carrera': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function getDeliveryForAssignment(deliveries: Delivery[], assignmentId: string) {
  return deliveries
    .filter((delivery) => delivery.status !== 'draft')
    .filter((delivery) => delivery.assignment === assignmentId || delivery.expand?.assignment?.id === assignmentId)
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())[0];
}

function getLimitDate(assignment: Assignment, delivery?: Delivery) {
  const isCorrection = delivery?.verdict === 'Corregir y reenviar';
  if (isCorrection && assignment.correctionDueDate) {
    return new Date(assignment.correctionDueDate);
  }

  return assignment.dueDate ? new Date(assignment.dueDate) : null;
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

function getCourseState(student: User, expiredApprovedCount: number, expiredSubmittedCount: number, expiredAssignmentCount: number): CourseState {
  if (student.approvedWebDesignModule) {
    return 'Aprobado';
  }

  if (expiredAssignmentCount === 0) {
    return expiredSubmittedCount > 0 ? 'En carrera y bien' : 'En carrera pero complicado';
  }

  const approvalRate = Math.round((expiredApprovedCount / expiredAssignmentCount) * 100);

  if (approvalRate >= onTrackApprovalRate) {
    return 'En carrera y bien';
  }

  if (expiredSubmittedCount > 0 && approvalRate >= regularApprovalRate) {
    return 'En carrera pero complicado';
  }

  return 'Fuera de carrera';
}

function getPerformance(approvedCount: number, assignmentCount: number) {
  return assignmentCount > 0 ? Math.round((approvedCount / assignmentCount) * 100) : 0;
}

function buildStudentStatuses(students: User[], assignments: Assignment[], deliveries: Delivery[]) {
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

      if (delivery.status === 'graded' && delivery.verdict === 'Aprobado') {
        approvedCount += 1;
        if (isExpiredAssignment) {
          expiredApprovedCount += 1;
        }
        return;
      }

      if (delivery.verdict === 'Corregir y reenviar') {
        correctionCount += 1;
        if (isPastDue(assignment, student, delivery)) {
          overdueCount += 1;
        }
        return;
      }

      pendingReviewCount += 1;
    });

    const performance = getPerformance(expiredApprovedCount, expiredAssignmentCount);
    const courseState = getCourseState(student, expiredApprovedCount, expiredSubmittedCount, expiredAssignmentCount);

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
    };
  });
}

function buildAssignmentStatuses(students: User[], assignments: Assignment[], deliveries: Delivery[]) {
  return assignments.map<AssignmentCourseStatus>((assignment) => {
    let approvedCount = 0;
    let submittedCount = 0;
    let pendingReviewCount = 0;
    let correctionCount = 0;
    let missingCount = 0;
    let overdueCount = 0;

    students.forEach((student) => {
      const studentDeliveries = deliveries.filter((delivery) => {
        const deliveryStudentId = delivery.student || delivery.expand?.student?.id;
        return deliveryStudentId === student.id;
      });
      const delivery = getDeliveryForAssignment(studentDeliveries, assignment.id);

      if (!delivery) {
        missingCount += 1;
        if (isPastDue(assignment, student)) {
          overdueCount += 1;
        }
        return;
      }

      submittedCount += 1;

      if (delivery.status === 'graded' && delivery.verdict === 'Aprobado') {
        approvedCount += 1;
        return;
      }

      if (delivery.verdict === 'Corregir y reenviar') {
        correctionCount += 1;
        if (isPastDue(assignment, student, delivery)) {
          overdueCount += 1;
        }
        return;
      }

      pendingReviewCount += 1;
    });

    return {
      assignment,
      approvedCount,
      submittedCount,
      pendingReviewCount,
      correctionCount,
      missingCount,
      overdueCount,
    };
  });
}

function MetricCard({ label, value, detail, tone }: { label: string; value: string | number; detail: string; tone: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-5">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
      </div>
      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">{detail}</p>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${value}%` }} />
    </div>
  );
}

function CourseStateBadge({ state }: { state: CourseState }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium ${courseStateStyles[state]}`}>
      {state}
    </span>
  );
}

export default async function CourseDashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'docente' && currentUser.role !== 'admin')) {
    redirect('/');
  }

  const [students, assignments, deliveries] = await Promise.all([
    getStudents(),
    getAllAssignments(),
    getAllDeliveries(),
  ]);

  const studentStatuses = buildStudentStatuses(students, assignments, deliveries);
  const assignmentStatuses = buildAssignmentStatuses(students, assignments, deliveries);

  const totalStudents = students.length;
  const averagePerformance = totalStudents > 0
    ? Math.round(studentStatuses.reduce((sum, status) => sum + status.performance, 0) / totalStudents)
    : 0;
  const approvedStudents = students.filter((student) => student.approvedWebDesignModule).length;
  const onTrackStudents = studentStatuses.filter((status) => status.courseState === 'En carrera y bien').length;
  const complicatedStudents = studentStatuses.filter((status) => status.courseState === 'En carrera pero complicado').length;
  const outOfRaceStudents = studentStatuses.filter((status) => status.courseState === 'Fuera de carrera').length;
  const pendingReviews = studentStatuses.reduce((sum, status) => sum + status.pendingReviewCount, 0);
  const overdueItems = studentStatuses.reduce((sum, status) => sum + status.overdueCount, 0);
  const studentsWithAlerts = studentStatuses
    .filter((status) => status.overdueCount > 0 || status.correctionCount > 0 || status.pendingReviewCount > 0)
    .sort((a, b) => {
      const alertDiff = (b.overdueCount + b.correctionCount + b.pendingReviewCount) - (a.overdueCount + a.correctionCount + a.pendingReviewCount);
      return alertDiff || a.performance - b.performance;
    })
    .slice(0, 8);

  return (
    <div className="container mx-auto p-8 min-h-screen">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Volver al panel
        </Link>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard de Cursada</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">Estado general de avance, entregas y alertas de estudiantes.</p>
          </div>
          <Link
            href="/students"
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            Ver estudiantes
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Aprobado" value={approvedStudents} detail="Estudiantes con modulo aprobado" tone="bg-green-500" />
        <MetricCard label="En carrera y bien" value={onTrackStudents} detail={`Al menos ${onTrackApprovalRate}% de TPs vencidos aprobados`} tone="bg-emerald-500" />
        <MetricCard label="En carrera pero complicados" value={complicatedStudents} detail={`Actividad regular, desde ${regularApprovalRate}% vencido aprobado`} tone="bg-orange-500" />
        <MetricCard label="Fuera de carrera" value={outOfRaceStudents} detail="Rendimiento muy bajo o sin actividad suficiente" tone="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <MetricCard label="Estudiantes" value={totalStudents} detail="Total de estudiantes registrados" tone="bg-blue-500" />
        <MetricCard label="Rendimiento promedio" value={`${averagePerformance}%`} detail="Aprobados sobre trabajos computables" tone="bg-emerald-500" />
        <MetricCard label="Pendientes de correccion" value={pendingReviews} detail={`${overdueItems} faltantes o reenvios fuera de plazo`} tone="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <section className="xl:col-span-2 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Estado por trabajo practico</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">Trabajo</th>
                  <th className="px-6 py-4">Entregas</th>
                  <th className="px-6 py-4">Aprobados</th>
                  <th className="px-6 py-4">A corregir</th>
                  <th className="px-6 py-4">Vencidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {assignmentStatuses.map((status) => (
                  <tr key={status.assignment.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/assignments/${status.assignment.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        {status.assignment.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">{status.submittedCount}/{totalStudents}</td>
                    <td className="px-6 py-4">{status.approvedCount}</td>
                    <td className="px-6 py-4">{status.correctionCount + status.pendingReviewCount}</td>
                    <td className="px-6 py-4">
                      <span className={status.overdueCount > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                        {status.overdueCount}
                      </span>
                    </td>
                  </tr>
                ))}
                {assignmentStatuses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No hay trabajos practicos registrados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Atencion docente</h2>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {studentsWithAlerts.length > 0 ? (
              studentsWithAlerts.map((status) => (
                <Link
                  key={status.student.id}
                  href={`/students/${status.student.id}`}
                  className="block px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{status.student.name || "Sin nombre"}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{status.student.email}</p>
                    </div>
                    <CourseStateBadge state={status.courseState} />
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={status.performance} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {status.overdueCount > 0 && <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">{status.overdueCount} vencidos</span>}
                    {status.correctionCount > 0 && <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">{status.correctionCount} a reenviar</span>}
                    {status.pendingReviewCount > 0 && <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{status.pendingReviewCount} sin corregir</span>}
                  </div>
                </Link>
              ))
            ) : (
              <p className="px-6 py-8 text-sm text-zinc-500 dark:text-zinc-400">No hay alertas de cursada en este momento.</p>
            )}
          </div>
        </section>
      </div>

      <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Avance por estudiante</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Estudiante</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Rendimiento</th>
                <th className="px-6 py-4">Entregados</th>
                <th className="px-6 py-4">Aprobados</th>
                <th className="px-6 py-4">Pendientes</th>
                <th className="px-6 py-4">Vencidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {studentStatuses.map((status) => (
                <tr key={status.student.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/students/${status.student.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      {status.student.name || "Sin nombre"}
                    </Link>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{status.student.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <CourseStateBadge state={status.courseState} />
                  </td>
                  <td className="px-6 py-4 min-w-52">
                    <div className="flex items-center gap-3">
                      <ProgressBar value={status.performance} />
                      <span className="w-10 text-right font-medium text-zinc-900 dark:text-zinc-100">{status.performance}%</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                      {status.expiredApprovedCount}/{status.expiredAssignmentCount} TPs computables aprobados
                    </p>
                  </td>
                  <td className="px-6 py-4">{status.expiredSubmittedCount}/{status.expiredAssignmentCount}</td>
                  <td className="px-6 py-4">{status.expiredApprovedCount}/{status.expiredAssignmentCount}</td>
                  <td className="px-6 py-4">{status.missingCount + status.correctionCount + status.pendingReviewCount}</td>
                  <td className="px-6 py-4">
                    <span className={status.overdueCount > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                      {status.overdueCount}
                    </span>
                  </td>
                </tr>
              ))}
              {studentStatuses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">No hay estudiantes registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
