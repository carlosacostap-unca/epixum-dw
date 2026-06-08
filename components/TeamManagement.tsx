"use client";

import { assignStudentToTeam, createTeam, deleteTeam, resolveTeamValidationResponse, updateTeam } from "@/lib/actions";
import { Team, TeamMember, TeamValidationResponse, TeamValidationStatus, User } from "@/types";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

interface TeamManagementProps {
  teams: Team[];
  students: User[];
  members: TeamMember[];
  validationResponses: TeamValidationResponse[];
}

function getStudentDisplayName(student: User) {
  const fullName = [student.lastName, student.firstName].filter(Boolean).join(", ");
  return fullName || student.name || student.email;
}

function sortStudents(students: User[]) {
  return [...students].sort((a, b) =>
    getStudentDisplayName(a).localeCompare(getStudentDisplayName(b), "es", { sensitivity: "base" })
  );
}

const validationLabels: Record<TeamValidationStatus, string> = {
  correct: "Equipo correcto",
  wrong_team: "Equipo equivocado",
  missing_member: "Faltan compañeros",
  extra_member: "Sobran compañeros",
  no_team: "Sin equipo",
  other: "Otro problema",
};

function formatValidationDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function TeamManagement({ teams, students, members, validationResponses }: TeamManagementProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const membershipByStudent = useMemo(() => {
    const map = new Map<string, TeamMember>();
    for (const member of members) {
      map.set(member.student, member);
    }
    return map;
  }, [members]);

  const membersByTeam = useMemo(() => {
    const map = new Map<string, TeamMember[]>();
    for (const member of members) {
      const current = map.get(member.team) || [];
      current.push(member);
      map.set(member.team, current);
    }
    return map;
  }, [members]);

  const sortedStudents = useMemo(() => sortStudents(students), [students]);
  const studentById = useMemo(() => {
    const map = new Map<string, User>();
    for (const student of students) {
      map.set(student.id, student);
    }
    return map;
  }, [students]);
  const assignedCount = members.length;
  const unassignedCount = Math.max(0, students.length - assignedCount);
  const latestValidationByStudent = useMemo(() => {
    const map = new Map<string, TeamValidationResponse>();
    for (const response of validationResponses) {
      const current = map.get(response.student);
      if (!current || new Date(response.submittedAt).getTime() > new Date(current.submittedAt).getTime()) {
        map.set(response.student, response);
      }
    }
    return map;
  }, [validationResponses]);
  const latestValidations = useMemo(() => Array.from(latestValidationByStudent.values()), [latestValidationByStudent]);
  const correctValidations = latestValidations.filter((response) => response.status === "correct").length;
  const pendingReviewValidations = latestValidations.filter((response) => response.status !== "correct" && !response.resolvedAt).length;
  const resolvedReviewValidations = latestValidations.filter((response) => response.status !== "correct" && response.resolvedAt).length;
  const teamById = useMemo(() => {
    const map = new Map<string, Team>();
    for (const team of teams) {
      map.set(team.id, team);
    }
    return map;
  }, [teams]);

  function runAction(key: string, action: () => Promise<{ success: boolean; error?: string }>, onSuccess?: () => void) {
    setPendingKey(key);
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await action();
      if (result.success) {
        onSuccess?.();
        setMessage("Cambios guardados.");
        router.refresh();
      } else {
        setError(result.error || "No se pudo completar la acción.");
      }
      setPendingKey(null);
    });
  }

  function handleCreateTeam(formData: FormData) {
    runAction("create-team", () => createTeam(formData), () => {
      const form = document.getElementById("create-team-form") as HTMLFormElement | null;
      form?.reset();
    });
  }

  function handleUpdateTeam(teamId: string, formData: FormData) {
    runAction(`update-${teamId}`, () => updateTeam(teamId, formData), () => setEditingTeamId(null));
  }

  function handleDeleteTeam(team: Team) {
    const teamMembers = membersByTeam.get(team.id) || [];
    const suffix = teamMembers.length > 0
      ? ` También se quitarán ${teamMembers.length} asignación${teamMembers.length === 1 ? "" : "es"} de estudiantes.`
      : "";

    if (!window.confirm(`Eliminar el equipo "${team.name}"?${suffix}`)) return;
    runAction(`delete-${team.id}`, () => deleteTeam(team.id));
  }

  function handleAssignStudent(studentId: string, teamId: string) {
    runAction(`student-${studentId}`, () => assignStudentToTeam(studentId, teamId || null));
  }

  function handleResolveValidation(response: TeamValidationResponse) {
    runAction(`resolve-validation-${response.id}`, () => resolveTeamValidationResponse(response.id));
  }

  return (
    <div className="space-y-8">
      {(message || error) && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
          }`}
          role="status"
        >
          {error || message}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Equipos</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{teams.length}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Estudiantes asignados</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{assignedCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin equipo</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{unassignedCount}</p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Validación de equipos por estudiantes</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Respuestas enviadas desde la pantalla principal del alumno.
          </p>
        </div>
        <div className="grid gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800 sm:grid-cols-4">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Respondieron</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{latestValidations.length}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Confirmaron correcto</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{correctValidations}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Requieren revisión</p>
            <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">{pendingReviewValidations}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Resueltas</p>
            <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{resolvedReviewValidations}</p>
          </div>
        </div>
        {latestValidations.length === 0 ? (
          <p className="p-5 text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay respuestas de estudiantes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-5 py-3">Estudiante</th>
                  <th className="px-5 py-3">Equipo registrado</th>
                  <th className="px-5 py-3">Respuesta</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Detalle</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {latestValidations.map((response) => {
                  const student = studentById.get(response.student);
                  const team = response.team ? teamById.get(response.team) : null;
                  const needsReview = response.status !== "correct";
                  const isResolved = Boolean(response.resolvedAt);
                  const canResolve = needsReview && !isResolved;

                  return (
                    <tr key={response.id} className="text-zinc-700 dark:text-zinc-300">
                      <td className="px-5 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                        {student ? getStudentDisplayName(student) : "Estudiante no encontrado"}
                        {student?.email && <span className="mt-1 block text-xs font-normal text-zinc-500">{student.email}</span>}
                      </td>
                      <td className="px-5 py-4">{team?.name || "Sin equipo registrado"}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            needsReview
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                          }`}
                        >
                          {validationLabels[response.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            isResolved
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                              : needsReview
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                          }`}
                        >
                          {isResolved ? "Resuelta" : needsReview ? "Pendiente" : "Sin ajuste"}
                        </span>
                      </td>
                      <td className="max-w-md px-5 py-4">{response.details || "-"}</td>
                      <td className="px-5 py-4 text-zinc-500">{formatValidationDate(response.submittedAt)}</td>
                      <td className="px-5 py-4">
                        {canResolve ? (
                          <button
                            type="button"
                            onClick={() => handleResolveValidation(response)}
                            disabled={isPending && pendingKey === `resolve-validation-${response.id}`}
                            className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                          >
                            {isPending && pendingKey === `resolve-validation-${response.id}` ? "Marcando..." : "Marcar resuelta"}
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-500">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Nuevo equipo</h2>
        </div>
        <form id="create-team-form" action={handleCreateTeam} className="grid gap-4 p-5 md:grid-cols-[1fr_2fr_auto]">
          <div>
            <label htmlFor="new-team-name" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nombre
            </label>
            <input
              id="new-team-name"
              name="name"
              type="text"
              required
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="new-team-description" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Descripción
            </label>
            <input
              id="new-team-description"
              name="description"
              type="text"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending && pendingKey === "create-team"}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 md:w-auto"
            >
              {isPending && pendingKey === "create-team" ? "Creando..." : "Crear"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Equipos</h2>
        </div>
        {teams.length === 0 ? (
          <p className="p-5 text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay equipos creados.</p>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {teams.map((team) => {
              const teamMembers = membersByTeam.get(team.id) || [];
              const isEditing = editingTeamId === team.id;

              return (
                <div key={team.id} className="p-5">
                  {isEditing ? (
                    <form action={(formData) => handleUpdateTeam(team.id, formData)} className="grid gap-4 md:grid-cols-[1fr_2fr_auto]">
                      <input
                        name="name"
                        defaultValue={team.name}
                        required
                        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                      <input
                        name="description"
                        defaultValue={team.description || ""}
                        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={isPending && pendingKey === `update-${team.id}`}
                          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTeamId(null)}
                          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{team.name}</h3>
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {teamMembers.length} estudiante{teamMembers.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        {team.description && (
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{team.description}</p>
                        )}
                        {teamMembers.length > 0 && (
                          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
                            {teamMembers
                              .map((member) => studentById.get(member.student))
                              .filter(Boolean)
                              .map((student) => getStudentDisplayName(student as User))
                              .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
                              .join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingTeamId(team.id)}
                          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTeam(team)}
                          disabled={isPending && pendingKey === `delete-${team.id}`}
                          className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/40"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Asignación de estudiantes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-3">Estudiante</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Equipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {sortedStudents.map((student) => {
                const membership = membershipByStudent.get(student.id);
                return (
                  <tr key={student.id} className="text-zinc-700 dark:text-zinc-300">
                    <td className="px-5 py-4 font-medium text-zinc-900 dark:text-zinc-100">{getStudentDisplayName(student)}</td>
                    <td className="px-5 py-4">{student.email}</td>
                    <td className="px-5 py-4">
                      <select
                        value={membership?.team || ""}
                        onChange={(event) => handleAssignStudent(student.id, event.target.value)}
                        disabled={isPending && pendingKey === `student-${student.id}`}
                        className="w-full min-w-48 rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      >
                        <option value="">Sin equipo</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                      {latestValidationByStudent.get(student.id) && (
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          Validación: {validationLabels[latestValidationByStudent.get(student.id)!.status]}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    No hay estudiantes registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
