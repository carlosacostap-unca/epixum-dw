import NotificationStudentsFilterTable, { NotificationStudentRow } from "@/components/NotificationStudentsFilterTable";
import { getExternalSiuStudents, getFinalNotificationThreads, getStudents } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { ExternalSiuStudent, FinalCourseStatus, FinalNotificationThread, User } from "@/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type NotificationStudent = {
  id: string;
  name: string;
  email?: string;
  source: "platform" | "external-siu";
  href: string;
  enrolledInSiu: boolean;
  finalCourseStatus?: FinalCourseStatus;
  finalCourseGrade?: number;
  notificationThread?: FinalNotificationThread;
  hasUnreadMessages: boolean;
};

function getStudentName(student: User) {
  return student.name || [student.firstName, student.lastName].filter(Boolean).join(" ") || student.email;
}

function isTeacherUnread(thread?: FinalNotificationThread) {
  if (!thread?.lastMessageAt) {
    return false;
  }

  if (!thread.teacherReadAt) {
    return true;
  }

  return new Date(thread.lastMessageAt).getTime() > new Date(thread.teacherReadAt).getTime();
}

function toPlatformNotificationStudent(
  student: User,
  threadsByStudent: Map<string, FinalNotificationThread>,
): NotificationStudent {
  const notificationThread = threadsByStudent.get(student.id);

  return {
    id: student.id,
    name: getStudentName(student),
    email: student.email,
    source: "platform",
    href: `/gestion-notificaciones/platform/${student.id}`,
    enrolledInSiu: Boolean(student.enrolledInSiu),
    finalCourseStatus: student.finalCourseStatus,
    finalCourseGrade: student.finalCourseGrade,
    notificationThread,
    hasUnreadMessages: isTeacherUnread(notificationThread),
  };
}

function toExternalNotificationStudent(student: ExternalSiuStudent): NotificationStudent {
  return {
    id: student.id,
    name: student.fullName,
    email: student.email,
    source: "external-siu",
    href: `/gestion-notificaciones/external-siu/${student.id}`,
    enrolledInSiu: true,
    finalCourseStatus: student.finalCourseStatus,
    finalCourseGrade: student.finalCourseGrade,
    hasUnreadMessages: false,
  };
}

function formatFinalGrade(grade?: number) {
  if (typeof grade !== "number") {
    return "Sin nota";
  }

  return grade.toLocaleString("es-AR", { maximumFractionDigits: 1 });
}

function toNotificationStudentRow(student: NotificationStudent): NotificationStudentRow {
  return {
    id: student.id,
    name: student.name,
    email: student.email || "-",
    source: student.source,
    sourceLabel: student.source === "platform" ? "Usuario plataforma" : "SIU sin usuario",
    href: student.href,
    enrolledInSiu: student.enrolledInSiu,
    siuLabel: student.enrolledInSiu ? "Si" : "No",
    finalCourseStatus: student.finalCourseStatus,
    finalCourseStatusLabel: student.finalCourseStatus || "Sin asignar",
    finalCourseGradeLabel: formatFinalGrade(student.finalCourseGrade),
    hasSentMessage: Boolean(student.notificationThread),
    sentMessageLabel: student.notificationThread ? "Enviado" : "Sin mensaje",
    hasUnreadMessages: student.hasUnreadMessages,
    unreadLabel: student.hasUnreadMessages ? "No leido" : "Al dia",
  };
}

export default async function GestionNotificacionesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "docente" && currentUser.role !== "admin")) {
    redirect("/");
  }

  const [students, externalSiuStudents, notificationThreads] = await Promise.all([
    getStudents(),
    getExternalSiuStudents(),
    getFinalNotificationThreads(),
  ]);
  const threadsByStudent = new Map<string, FinalNotificationThread>();
  for (const thread of notificationThreads) {
    const current = threadsByStudent.get(thread.student);
    const currentTime = current ? new Date(current.lastMessageAt || current.created).getTime() : 0;
    const threadTime = new Date(thread.lastMessageAt || thread.created).getTime();

    if (!current || threadTime > currentTime) {
      threadsByStudent.set(thread.student, thread);
    }
  }
  const notificationStudents = [
    ...students.map((student) => toPlatformNotificationStudent(student, threadsByStudent)),
    ...externalSiuStudents.map(toExternalNotificationStudent),
  ].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  const assignedStatusCount = notificationStudents.filter((student) => student.finalCourseStatus).length;
  const assignedGradeCount = notificationStudents.filter((student) => typeof student.finalCourseGrade === "number").length;
  const studentsWithMessageCount = notificationStudents.filter((student) => student.notificationThread).length;
  const unreadMessageCount = notificationStudents.filter((student) => student.hasUnreadMessages).length;
  const notificationStudentRows = notificationStudents.map(toNotificationStudentRow);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 dark:bg-zinc-950 sm:px-6 lg:px-8 2xl:px-10">
      <div className="w-full">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Volver al panel
          </Link>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-100">Gestión de notificaciones</h1>
            <p className="mt-2 max-w-3xl text-zinc-500 dark:text-zinc-400">
              Listado de alumnos con el estado final y la nota final registrada para el cierre de cursada.
            </p>
          </div>
        </div>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total alumnos</p>
            <p className="mt-3 text-3xl font-bold text-zinc-950 dark:text-zinc-100">{notificationStudents.length}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Con estado final</p>
            <p className="mt-3 text-3xl font-bold text-zinc-950 dark:text-zinc-100">{assignedStatusCount}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Con nota final</p>
            <p className="mt-3 text-3xl font-bold text-zinc-950 dark:text-zinc-100">{assignedGradeCount}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Con mensaje</p>
            <p className="mt-3 text-3xl font-bold text-zinc-950 dark:text-zinc-100">{studentsWithMessageCount}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No leidos</p>
            <p className="mt-3 text-3xl font-bold text-zinc-950 dark:text-zinc-100">{unreadMessageCount}</p>
          </div>
        </section>

        <NotificationStudentsFilterTable students={notificationStudentRows} />
      </div>
    </main>
  );
}
