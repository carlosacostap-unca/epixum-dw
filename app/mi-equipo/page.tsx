import Link from "next/link";
import { redirect } from "next/navigation";

import FinalProjectTeamResources from "@/components/FinalProjectTeamResources";
import StudentFinalProjectSlotReservation from "@/components/StudentFinalProjectSlotReservation";
import { getFinalProjectPresentationSlots, getFinalProjectTeamResources, getStudentTeam } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";

export const dynamic = "force-dynamic";

export default async function MyTeamPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "estudiante") {
    redirect("/");
  }

  const studentTeam = await getStudentTeam(user.id);
  const [slots, finalProjectResources] = await Promise.all([
    getFinalProjectPresentationSlots(),
    getFinalProjectTeamResources(studentTeam?.team?.id),
  ]);
  const teamMembers = studentTeam?.members || [];

  return (
    <main className="container mx-auto min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            Volver al inicio
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Mi Equipo
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Revisá el equipo asignado para la revisión del proyecto final.
          </p>
        </div>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Equipo asignado
              </p>
              <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {studentTeam?.team?.name || "Sin equipo asignado todavía"}
              </h2>
            </div>
            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${
              studentTeam?.team
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            }`}>
              {studentTeam?.team ? "Equipo registrado" : "Pendiente de asignación"}
            </span>
          </div>

          {studentTeam?.team ? (
            <div className="mt-6">
              {teamMembers.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="grid grid-cols-1 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400 sm:grid-cols-2">
                    <span>Nombre</span>
                    <span>Email</span>
                  </div>
                  <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {teamMembers.map((teammate) => (
                      <li key={teammate.id} className="grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-2 sm:items-center">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {teammate.name || [teammate.lastName, teammate.firstName].filter(Boolean).join(", ") || "Sin nombre"}
                        </span>
                        <span className="text-zinc-600 dark:text-zinc-400">{teammate.email}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                  Todavía no hay otros compañeros asignados a este equipo.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Todavía no tenés equipo asignado en el sistema. Coordiná tu asignación con los docentes.
            </div>
          )}
        </section>

        {studentTeam?.team && <FinalProjectTeamResources resources={finalProjectResources} />}

        <StudentFinalProjectSlotReservation slots={slots} teamId={studentTeam?.team?.id} />
      </div>
    </main>
  );
}
