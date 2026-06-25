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

const statusStyles: Record<FinalCourseStatus, string> = {
  Promociona: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Regulariza: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "En carrera": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Libre: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
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

function StatusBadge({ status }: { status?: FinalCourseStatus }) {
  if (!status) {
    return (
      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        Sin asignar
      </span>
    );
  }

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

function SourceBadge({ source }: { source: NotificationStudent["source"] }) {
  const styles = source === "platform"
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
    : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {source === "platform" ? "Usuario plataforma" : "SIU sin usuario"}
    </span>
  );
}

function SiuEnrollmentBadge({ enrolled }: { enrolled: boolean }) {
  if (!enrolled) {
    return (
      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        No
      </span>
    );
  }

  return (
    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
      Si
    </span>
  );
}

function SentMessageBadge({ thread }: { thread?: FinalNotificationThread }) {
  if (!thread) {
    return (
      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        Sin mensaje
      </span>
    );
  }

  return (
    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
      Enviado
    </span>
  );
}

function UnreadMessageBadge({ hasUnreadMessages }: { hasUnreadMessages: boolean }) {
  if (!hasUnreadMessages) {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
        Al dia
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
      No leido
    </span>
  );
}

function NotificationRows({ students }: { students: NotificationStudent[] }) {
  if (students.length === 0) {
    return (
      <tr>
        <td colSpan={8} className="px-5 py-8 text-center text-zinc-500 dark:text-zinc-400">
          No hay alumnos para mostrar.
        </td>
      </tr>
    );
  }

  return students.map((student) => (
    <tr key={`${student.source}-${student.id}`} className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <td className="px-0 py-0">
        <Link href={student.href} className="block px-5 py-4 font-medium text-zinc-950 group-hover:underline dark:text-zinc-100">
          {student.name}
        </Link>
      </td>
      <td className="px-0 py-0">
        <Link href={student.href} className="block px-5 py-4">
          <SourceBadge source={student.source} />
        </Link>
      </td>
      <td className="px-0 py-0">
        <Link href={student.href} className="block px-5 py-4">
          {student.email || "-"}
        </Link>
      </td>
      <td className="px-0 py-0">
        <Link href={student.href} className="block px-5 py-4">
          <SiuEnrollmentBadge enrolled={student.enrolledInSiu} />
        </Link>
      </td>
      <td className="px-0 py-0">
        <Link href={student.href} className="block px-5 py-4">
          <StatusBadge status={student.finalCourseStatus} />
        </Link>
      </td>
      <td className="px-0 py-0">
        <Link href={student.href} className="block px-5 py-4 font-medium text-zinc-950 dark:text-zinc-100">
          {formatFinalGrade(student.finalCourseGrade)}
        </Link>
      </td>
      <td className="px-0 py-0">
        <Link href={student.href} className="block px-5 py-4">
          <SentMessageBadge thread={student.notificationThread} />
        </Link>
      </td>
      <td className="px-0 py-0">
        <Link href={student.href} className="block px-5 py-4">
          <UnreadMessageBadge hasUnreadMessages={student.hasUnreadMessages} />
        </Link>
      </td>
    </tr>
  ));
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

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
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

        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">Alumnos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm text-zinc-600 dark:text-zinc-300">
              <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800/70 dark:text-zinc-400">
                <tr>
                  <th className="px-5 py-3">Alumno</th>
                  <th className="px-5 py-3">Origen</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Inscripto SIU</th>
                  <th className="px-5 py-3">Estado final</th>
                  <th className="px-5 py-3">Nota final</th>
                  <th className="px-5 py-3">Mensaje enviado</th>
                  <th className="px-5 py-3">No leidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <NotificationRows students={notificationStudents} />
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
