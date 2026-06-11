import Link from "next/link";
import { redirect } from "next/navigation";

import FinalProjectSlotManager from "@/components/FinalProjectSlotManager";
import { getFinalProjectPresentationSlots, getTeamOverview } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";

export const dynamic = "force-dynamic";

export default async function FinalProjectPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "docente" && user.role !== "admin") {
    redirect("/");
  }

  const [{ teams, students, members, validationResponses }, slots] = await Promise.all([
    getTeamOverview(),
    getFinalProjectPresentationSlots(),
  ]);
  const assignedStudentIds = new Set(members.map((member) => member.student).filter(Boolean));
  const unresolvedResponses = validationResponses.filter((response) => !response.resolvedAt);
  const reservedSlots = slots.filter((slot) => slot.team);

  return (
    <main className="container mx-auto min-h-screen p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              Volver al inicio
            </Link>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Proyecto Final
            </h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Seguimiento general de equipos y solicitudes de ajuste para la revisión final.
            </p>
          </div>
          <Link href="/equipos" className="inline-flex w-fit items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Gestionar equipos
          </Link>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Equipos</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{teams.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Estudiantes asignados</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{assignedStudentIds.size}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Sin equipo</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{Math.max(0, students.length - assignedStudentIds.size)}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Solicitudes pendientes</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{unresolvedResponses.length}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Turnos reservados</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{reservedSlots.length}/{slots.length}</p>
          </div>
        </section>

        <FinalProjectSlotManager slots={slots} teams={teams} students={students} />
      </div>
    </main>
  );
}
