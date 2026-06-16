import DiplomaEquivalenceStatusActions from "@/components/DiplomaEquivalenceStatusActions";
import { getStudents } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import type { User, WebDesignModuleEquivalenceStatus } from "@/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const statusLabels: Record<WebDesignModuleEquivalenceStatus, string> = {
  confirmed: "Confirmado",
  doubtful: "Dudoso",
  dismissed: "Desestimado",
};

const statusStyles: Record<WebDesignModuleEquivalenceStatus, string> = {
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  doubtful: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  dismissed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function getEquivalenceStatus(student: User): WebDesignModuleEquivalenceStatus {
  return student.webDesignModuleEquivalenceStatus || "doubtful";
}

function StatusBadge({ status }: { status: WebDesignModuleEquivalenceStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

function EquivalenceRows({ students }: { students: User[] }) {
  if (students.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="px-6 py-8 text-center text-zinc-500 dark:text-zinc-400">
          No hay estudiantes en este estado.
        </td>
      </tr>
    );
  }

  return students.map((student) => {
    const status = getEquivalenceStatus(student);

    return (
      <tr key={student.id} className="group relative transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
        <td className="relative px-6 py-4">
          <Link href={`/students/${student.id}`} className="absolute inset-0 z-10" aria-label={`Ver detalle de ${student.name || student.email}`} />
          <span className="font-medium text-blue-600 group-hover:underline dark:text-blue-400">
            {student.name || "Sin nombre"}
          </span>
        </td>
        <td className="relative px-6 py-4">
          <Link href={`/students/${student.id}`} className="absolute inset-0 z-10" aria-hidden tabIndex={-1} />
          {student.email}
        </td>
        <td className="relative px-6 py-4">
          <Link href={`/students/${student.id}`} className="absolute inset-0 z-10" aria-hidden tabIndex={-1} />
          {student.dni || "-"}
        </td>
        <td className="relative px-6 py-4">
          <Link href={`/students/${student.id}`} className="absolute inset-0 z-10" aria-hidden tabIndex={-1} />
          {student.enrollmentId || "-"}
        </td>
        <td className="relative px-6 py-4">
          <Link href={`/students/${student.id}`} className="absolute inset-0 z-10" aria-hidden tabIndex={-1} />
          <StatusBadge status={status} />
        </td>
        <td className="px-6 py-4">
          <DiplomaEquivalenceStatusActions
            studentId={student.id}
            studentName={student.name || student.email}
            currentStatus={status}
          />
        </td>
      </tr>
    );
  });
}

function EquivalenceSection({
  title,
  description,
  students,
}: {
  title: string;
  description: string;
  students: User[];
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{students.length} estudiantes</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm text-zinc-500 dark:text-zinc-400">
          <thead className="bg-zinc-50 text-xs font-medium uppercase dark:bg-zinc-800/70">
            <tr>
              <th className="px-6 py-4">Estudiante</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">DNI</th>
              <th className="px-6 py-4">Matricula</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            <EquivalenceRows students={students} />
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function EquivalenciasDiplomaturaPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "docente" && currentUser.role !== "admin")) {
    redirect("/");
  }

  const students = await getStudents();
  const declaredStudents = students.filter((student) => student.approvedWebDesignModule);
  const confirmedStudents = declaredStudents.filter((student) => getEquivalenceStatus(student) === "confirmed");
  const doubtfulStudents = declaredStudents.filter((student) => getEquivalenceStatus(student) === "doubtful");
  const dismissedStudents = declaredStudents.filter((student) => getEquivalenceStatus(student) === "dismissed");

  return (
    <main className="container mx-auto min-h-screen p-8">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Volver al panel
        </Link>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Equivalencias Diplomatura</h1>
            <p className="mt-2 max-w-3xl text-zinc-500 dark:text-zinc-400">
              Estudiantes que declararon tener aprobado el modulo de diseno web en la diplomatura en desarrollo web fullstack con JavaScript.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Declarados" value={declaredStudents.length} tone="bg-blue-500" />
            <SummaryCard label="Confirmados" value={confirmedStudents.length} tone="bg-emerald-500" />
            <SummaryCard label="Dudosos" value={doubtfulStudents.length} tone="bg-amber-500" />
            <SummaryCard label="Desestimados" value={dismissedStudents.length} tone="bg-red-500" />
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <EquivalenceSection
          title="Confirmados"
          description="Casos revisados y aceptados por el equipo docente."
          students={confirmedStudents}
        />
        <EquivalenceSection
          title="Dudosos"
          description="Casos declarados por estudiantes que todavia requieren revision docente."
          students={doubtfulStudents}
        />
        <EquivalenceSection
          title="Desestimados"
          description="Casos mantenidos como declaracion del alumno, pero rechazados para equivalencia."
          students={dismissedStudents}
        />
      </div>
    </main>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone}`} />
      </div>
      <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}
