import StudentNotificationMessageComposer from "@/components/StudentNotificationMessageComposer";
import FinalNotificationConversation from "@/components/FinalNotificationConversation";
import {
  getAllAssignments,
  getAllDeliveries,
  getAllFinalProjectMemberEvaluations,
  getAllPartialExamSimulations,
  getExternalSiuStudents,
  getFinalNotificationMessages,
  getFinalNotificationThreadsForStudent,
  getStudents,
} from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import {
  Delivery,
  ExternalSiuStudent,
  FinalCourseStatus,
  FinalProjectMemberEvaluation,
  FinalProjectMemberEvaluationRating,
  PartialExamSimulation,
  User,
} from "@/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReactNode } from "react";

export const dynamic = "force-dynamic";

type NotificationStudentSource = "platform" | "external-siu";

type StudentCourseDetail = {
  id: string;
  displayName: string;
  email?: string;
  dni?: string;
  enrollmentId?: string;
  enrolledInSiu: boolean;
  source: NotificationStudentSource;
  approvedAssignments: number | null;
  bestPartialExamGrade: number | null;
  approvedWebDesignModule: boolean | null;
  finalProjectEvaluation: FinalProjectMemberEvaluation | null;
  finalCourseStatus?: FinalCourseStatus;
  finalCourseGrade?: number;
  notes?: string;
};

const statusStyles: Record<FinalCourseStatus, string> = {
  Promociona: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Regulariza: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "En carrera": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Libre: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const finalProjectRatingLabels: Record<FinalProjectMemberEvaluationRating, string> = {
  excellent: "Excelente",
  very_good: "Muy buena",
  good: "Buena",
  regular: "Regular",
  insufficient: "Insuficiente",
};

function getStudentDisplayName(student: User) {
  return student.name || [student.firstName, student.lastName].filter(Boolean).join(" ") || student.email;
}

function getDeliveryForAssignment(deliveries: Delivery[], assignmentId: string) {
  return deliveries
    .filter((delivery) => delivery.status !== "draft")
    .filter((delivery) => delivery.assignment === assignmentId || delivery.expand?.assignment?.id === assignmentId)
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())[0];
}

function getSimulationGrade(simulation: PartialExamSimulation) {
  if (!simulation.totalQuestions) {
    return 0;
  }

  return Math.round((simulation.score / simulation.totalQuestions) * 100) / 10;
}

function formatGrade(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString("es-AR", { maximumFractionDigits: 1 }) : "Sin nota";
}

function formatPartialGrade(value: number | null) {
  return value === null ? "Sin parcial" : value.toLocaleString("es-AR", { maximumFractionDigits: 1 });
}

function getLatestFinalProjectEvaluations(evaluations: FinalProjectMemberEvaluation[]) {
  const latestByStudent = new Map<string, FinalProjectMemberEvaluation>();

  for (const evaluation of evaluations) {
    const current = latestByStudent.get(evaluation.student);
    if (!current || new Date(evaluation.evaluatedAt).getTime() > new Date(current.evaluatedAt).getTime()) {
      latestByStudent.set(evaluation.student, evaluation);
    }
  }

  return latestByStudent;
}

function formatFinalProjectEvaluation(evaluation: FinalProjectMemberEvaluation | null) {
  if (!evaluation) {
    return "Sin evaluar";
  }

  const attendance = evaluation.present ? "Presente" : "Ausente";
  const exposure = evaluation.exposed ? "Expuso" : "No expuso";
  const rating = evaluation.rating ? finalProjectRatingLabels[evaluation.rating] : "Sin calificacion";

  return `${rating} - ${attendance} - ${exposure}`;
}

function buildPlatformStudentDetail(
  student: User,
  assignmentIds: string[],
  deliveries: Delivery[],
  simulations: PartialExamSimulation[],
  finalProjectEvaluation: FinalProjectMemberEvaluation | null,
): StudentCourseDetail {
  const studentDeliveries = deliveries.filter((delivery) => {
    const deliveryStudentId = delivery.student || delivery.expand?.student?.id;
    return deliveryStudentId === student.id;
  });
  const approvedAssignments = assignmentIds.filter((assignmentId) => {
    const delivery = getDeliveryForAssignment(studentDeliveries, assignmentId);
    return delivery?.status === "graded" && delivery.verdict === "Aprobado";
  }).length;
  const partialGrades = simulations
    .filter((simulation) => simulation.student === student.id)
    .map(getSimulationGrade);

  return {
    id: student.id,
    displayName: getStudentDisplayName(student),
    email: student.email,
    dni: student.dni,
    enrollmentId: student.enrollmentId,
    enrolledInSiu: Boolean(student.enrolledInSiu),
    source: "platform",
    approvedAssignments,
    bestPartialExamGrade: partialGrades.length > 0 ? Math.max(...partialGrades) : null,
    approvedWebDesignModule: Boolean(student.approvedWebDesignModule),
    finalProjectEvaluation,
    finalCourseStatus: student.finalCourseStatus,
    finalCourseGrade: student.finalCourseGrade,
  };
}

function buildExternalStudentDetail(student: ExternalSiuStudent): StudentCourseDetail {
  return {
    id: student.id,
    displayName: student.fullName,
    email: student.email,
    dni: student.dni,
    enrollmentId: student.enrollmentId,
    enrolledInSiu: true,
    source: "external-siu",
    approvedAssignments: null,
    bestPartialExamGrade: null,
    approvedWebDesignModule: null,
    finalProjectEvaluation: null,
    finalCourseStatus: student.finalCourseStatus,
    finalCourseGrade: student.finalCourseGrade,
    notes: student.notes,
  };
}

function StatusBadge({ status }: { status?: FinalCourseStatus }) {
  if (!status) {
    return (
      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        Sin asignar
      </span>
    );
  }

  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}>{status}</span>;
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="mt-2 text-base font-medium text-zinc-950 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function getNotificationListReturnPath(returnTo: string | string[] | undefined) {
  const value = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  if (!value || !value.startsWith("/gestion-notificaciones") || value.startsWith("//") || value.includes("\n")) {
    return "/gestion-notificaciones";
  }

  return value;
}

export default async function GestionNotificacionesDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ source: string; id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "docente" && currentUser.role !== "admin")) {
    redirect("/");
  }

  const { source, id } = await params;
  if (source !== "platform" && source !== "external-siu") {
    notFound();
  }

  const [students, assignments, deliveries, simulations, externalSiuStudents, finalProjectEvaluations] = await Promise.all([
    getStudents(),
    getAllAssignments(),
    getAllDeliveries(),
    getAllPartialExamSimulations(),
    getExternalSiuStudents(),
    getAllFinalProjectMemberEvaluations(),
  ]);
  const latestFinalProjectEvaluations = getLatestFinalProjectEvaluations(finalProjectEvaluations);
  const student = source === "platform"
    ? students.find((item) => item.id === id)
    : externalSiuStudents.find((item) => item.id === id);

  if (!student) {
    notFound();
  }

  const detail = source === "platform"
    ? buildPlatformStudentDetail(
        student as User,
        assignments.map((assignment) => assignment.id),
        deliveries,
        simulations,
        latestFinalProjectEvaluations.get(id) || null,
      )
    : buildExternalStudentDetail(student as ExternalSiuStudent);
  const finalProjectEvaluation = formatFinalProjectEvaluation(detail.finalProjectEvaluation);
  const approvedAssignments = detail.approvedAssignments === null ? "No disponible" : String(detail.approvedAssignments);
  const bestPartialExamGrade = detail.bestPartialExamGrade === null ? "Sin parcial" : formatPartialGrade(detail.bestPartialExamGrade);
  const finalCourseStatus = detail.finalCourseStatus || "Sin asignar";
  const finalCourseGrade = formatGrade(detail.finalCourseGrade);
  const notificationThreads = detail.source === "platform" ? await getFinalNotificationThreadsForStudent(detail.id) : [];
  const notificationThread = notificationThreads[0] || null;
  const notificationMessages = notificationThread ? await getFinalNotificationMessages(notificationThread.id) : [];
  const { returnTo } = await searchParams;
  const listReturnPath = getNotificationListReturnPath(returnTo);
  const detailPath = listReturnPath === "/gestion-notificaciones"
    ? `/gestion-notificaciones/${detail.source}/${detail.id}`
    : `/gestion-notificaciones/${detail.source}/${detail.id}?returnTo=${encodeURIComponent(listReturnPath)}`;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <div>
          <Link
            href={listReturnPath}
            className="inline-flex items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Volver a gestión de notificaciones
          </Link>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-100">{detail.displayName}</h1>
              <p className="mt-2 text-zinc-500 dark:text-zinc-400">
                Detalle de cursada y configuración del mensaje para el estudiante.
              </p>
            </div>
            <StatusBadge status={detail.finalCourseStatus} />
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="Estado final" value={<StatusBadge status={detail.finalCourseStatus} />} />
          <DetailItem label="Nota final" value={finalCourseGrade} />
          <DetailItem label="Mejor parcial" value={bestPartialExamGrade} />
          <DetailItem label="TPs aprobados" value={approvedAssignments} />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">Datos del estudiante</h2>
            </div>
            <dl className="grid gap-4 p-5 text-sm">
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-400">Origen</dt>
                <dd className="mt-1 text-zinc-950 dark:text-zinc-100">
                  {detail.source === "platform" ? "Usuario plataforma" : "SIU sin usuario"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-400">Email</dt>
                <dd className="mt-1 text-zinc-950 dark:text-zinc-100">{detail.email || "-"}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-400">Matricula</dt>
                <dd className="mt-1 text-zinc-950 dark:text-zinc-100">{detail.enrollmentId || "-"}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-400">Inscripto SIU</dt>
                <dd className="mt-1 text-zinc-950 dark:text-zinc-100">{detail.enrolledInSiu ? "Si" : "No"}</dd>
              </div>
              {detail.notes && (
                <div>
                  <dt className="font-medium text-zinc-500 dark:text-zinc-400">Notas</dt>
                  <dd className="mt-1 text-zinc-950 dark:text-zinc-100">{detail.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">Detalle de resultados</h2>
            </div>
            <dl className="grid gap-4 p-5 text-sm">
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-400">Equivalencia Diplomatura</dt>
                <dd className="mt-1 text-zinc-950 dark:text-zinc-100">
                  {detail.approvedWebDesignModule === null
                    ? "No disponible"
                    : detail.approvedWebDesignModule
                      ? "Aprobado"
                      : "Pendiente"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-400">Coloquio</dt>
                <dd className="mt-1 text-zinc-950 dark:text-zinc-100">{finalProjectEvaluation}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-400">Estado final</dt>
                <dd className="mt-1 text-zinc-950 dark:text-zinc-100">{finalCourseStatus}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-500 dark:text-zinc-400">Nota final</dt>
                <dd className="mt-1 text-zinc-950 dark:text-zinc-100">{finalCourseGrade}</dd>
              </div>
            </dl>
          </div>
        </section>

        <StudentNotificationMessageComposer
          studentId={detail.source === "platform" ? detail.id : undefined}
          studentName={detail.displayName}
          finalCourseStatus={finalCourseStatus}
          finalCourseGrade={finalCourseGrade}
          approvedAssignments={approvedAssignments}
          bestPartialExamGrade={bestPartialExamGrade}
          finalProjectEvaluation={finalProjectEvaluation}
          returnPath={detailPath}
        />

        <FinalNotificationConversation
          thread={notificationThread}
          messages={notificationMessages}
          currentUser={currentUser}
          returnPath={detailPath}
        />
      </div>
    </main>
  );
}
