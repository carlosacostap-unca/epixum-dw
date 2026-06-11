import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import FinalProjectMemberEvaluationForm from "@/components/FinalProjectMemberEvaluationForm";
import FinalProjectSlotDetailActions from "@/components/FinalProjectSlotDetailActions";
import FinalProjectTeamResourceDeleteButton from "@/components/FinalProjectTeamResourceDeleteButton";
import { FINAL_PROJECT_RESOURCE_DEFINITIONS } from "@/lib/final-project-resources";
import {
  getFinalProjectMemberEvaluations,
  getFinalProjectPresentationSlot,
  getFinalProjectTeamResources,
  getTeamOverview,
} from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { isFinalProjectEvaluatorRole, isTeacherRole } from "@/lib/roles";
import { FinalProjectTeamResource, User } from "@/types";

export const dynamic = "force-dynamic";

interface FinalProjectSlotPageProps {
  params: Promise<{ id: string }>;
}

function formatSlotDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStudentName(student?: User | null) {
  if (!student) {
    return "";
  }

  return student.name || [student.firstName, student.lastName].filter(Boolean).join(" ") || student.email || "";
}

function getResourceFileUrl(resource: FinalProjectTeamResource) {
  const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL?.replace(/\/$/, "");
  if (!pbUrl || !resource.file) {
    return "";
  }

  return `${pbUrl}/api/files/${resource.collectionId}/${resource.id}/${resource.file}`;
}

export default async function FinalProjectSlotPage({ params }: FinalProjectSlotPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!isFinalProjectEvaluatorRole(user.role)) {
    redirect("/");
  }

  const { id } = await params;
  const [slot, { teams, students, members }] = await Promise.all([
    getFinalProjectPresentationSlot(id),
    getTeamOverview(),
  ]);

  if (!slot) {
    notFound();
  }

  const team = slot.team ? teams.find((candidate) => candidate.id === slot.team) : null;
  const reservedBy = slot.reservedBy ? students.find((student) => student.id === slot.reservedBy) : null;
  const isReserved = Boolean(slot.team);
  const teamMembers = team
    ? members
        .filter((member) => member.team === team.id)
        .map((member) => students.find((student) => student.id === member.student))
        .filter((student): student is User => Boolean(student))
        .sort((a, b) => formatStudentName(a).localeCompare(formatStudentName(b), "es"))
    : [];
  const [resources, memberEvaluations] = await Promise.all([
    team ? getFinalProjectTeamResources(team.id) : [],
    team ? getFinalProjectMemberEvaluations(slot.id) : [],
  ]);
  const resourceByKey = new Map(resources.map((resource) => [resource.resourceKey, resource]));
  const canManageProject = isTeacherRole(user.role);

  return (
    <main className="container mx-auto min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link href="/proyecto-final" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            Volver a Proyecto Final
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Turno de presentación
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Duración fija: 15 minutos.
          </p>
        </div>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Inicio</p>
              <h2 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{formatSlotDate(slot.startsAt)}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Finaliza: {formatSlotDate(slot.endsAt)}</p>
            </div>
            <span className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${
              isReserved
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            }`}>
              {isReserved ? "Reservado" : "Disponible"}
            </span>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Equipo</dt>
              <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{team?.name || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Reservado por</dt>
              <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{formatStudentName(reservedBy) || "-"}</dd>
              {reservedBy?.email && <dd className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{reservedBy.email}</dd>}
            </div>
            <div>
              <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Fecha de reserva</dt>
              <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{slot.reservedAt ? formatSlotDate(slot.reservedAt) : "-"}</dd>
            </div>
          </dl>

          {canManageProject && <FinalProjectSlotDetailActions slot={slot} />}
        </section>

        {team && (
          <>
            <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Integrantes del equipo</h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {teamMembers.length} estudiante{teamMembers.length === 1 ? "" : "s"} asignado{teamMembers.length === 1 ? "" : "s"}.
                  </p>
                </div>
              </div>

              {teamMembers.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="grid grid-cols-1 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400 sm:grid-cols-2">
                    <span>Nombre</span>
                    <span>Email</span>
                  </div>
                  <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {teamMembers.map((student) => (
                      <li key={student.id} className="grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-2 sm:items-center">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatStudentName(student) || "Sin nombre"}</span>
                        <span className="text-zinc-600 dark:text-zinc-400">{student.email || "Sin email"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                  No hay integrantes registrados para este equipo.
                </p>
              )}
            </section>

            <FinalProjectMemberEvaluationForm
              slotId={slot.id}
              teamId={team.id}
              students={teamMembers}
              evaluations={memberEvaluations}
              currentTeacherId={user.id}
            />

            <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Recursos cargados</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Archivos y enlaces entregados por el equipo para la revisión.
              </p>

              <div className="mt-5 divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {FINAL_PROJECT_RESOURCE_DEFINITIONS.map((definition) => {
                  const resource = resourceByKey.get(definition.key);
                  const submittedBy = resource?.expand?.submittedBy;
                  const submittedByName = formatStudentName(submittedBy);
                  const fileUrl = resource ? getResourceFileUrl(resource) : "";

                  return (
                    <div key={definition.key} className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{definition.moduleName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{definition.title}</p>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            resource
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}>
                            {resource ? "Cargado" : "Pendiente"}
                          </span>
                        </div>
                        {resource?.submittedAt && (
                          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                            {submittedByName ? `Subido por ${submittedByName}` : "Subido"} · {formatSlotDate(resource.submittedAt)}
                          </p>
                        )}
                      </div>

                      <div className="min-w-0 lg:text-right">
                        {resource?.url ? (
                          <a href={resource.url} target="_blank" rel="noreferrer" className="break-all text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                            {resource.url}
                          </a>
                        ) : resource?.file && fileUrl ? (
                          <a href={fileUrl} target="_blank" rel="noreferrer" className="break-all text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                            {resource.originalName || resource.file}
                          </a>
                        ) : (
                          <span className="text-zinc-500 dark:text-zinc-400">Sin cargar</span>
                        )}
                      </div>

                      <div>
                        {resource && canManageProject && (
                          <FinalProjectTeamResourceDeleteButton
                            resourceId={resource.id}
                            resourceTitle={definition.title}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
