"use client";

import {
  createFinalProjectPresentationSlot,
} from "@/lib/actions";
import { FinalProjectPresentationSlot, Team, User } from "@/types";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

interface FinalProjectSlotManagerProps {
  slots: FinalProjectPresentationSlot[];
  teams: Team[];
  students: User[];
  canManageSlots?: boolean;
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

export default function FinalProjectSlotManager({ slots, teams, students, canManageSlots = true }: FinalProjectSlotManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);

  function runAction(key: string, action: () => Promise<{ success: boolean; error?: string }>, onSuccess?: () => void) {
    setPendingKey(key);
    setMessage(null);
    setError(null);

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

  function handleCreateSlot(formData: FormData) {
    runAction("create-slot", () => createFinalProjectPresentationSlot(formData), () => {
      const form = document.getElementById("create-final-project-slot-form") as HTMLFormElement | null;
      form?.reset();
    });
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Turnos de presentación</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Cada turno dura 15 minutos. Los equipos pueden reservar uno de los turnos disponibles.
        </p>
      </div>

      {(message || error) && (
        <div
          className={`mx-6 mt-5 rounded-md border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
          }`}
          role="status"
        >
          {error || message}
        </div>
      )}

      {canManageSlots && (
        <form id="create-final-project-slot-form" action={handleCreateSlot} className="grid gap-4 border-b border-zinc-200 p-6 dark:border-zinc-800 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label htmlFor="slot-starts-at" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Inicio del turno
            </label>
            <input
              id="slot-starts-at"
              name="startsAt"
              type="datetime-local"
              required
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={isPending && pendingKey === "create-slot"}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isPending && pendingKey === "create-slot" ? "Creando..." : "Crear turno"}
          </button>
        </form>
      )}

      {slots.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-3">Inicio</th>
                <th className="px-6 py-3">Fin</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Equipo</th>
                <th className="px-6 py-3">Reservado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {slots.map((slot) => {
                const team = slot.team ? teamById.get(slot.team) : null;
                const reservedBy = slot.reservedBy ? studentById.get(slot.reservedBy) : null;
                const isReserved = Boolean(slot.team);

                return (
                  <tr
                    key={slot.id}
                    tabIndex={0}
                    onClick={() => router.push(`/proyecto-final/turnos/${slot.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/proyecto-final/turnos/${slot.id}`);
                      }
                    }}
                    className="cursor-pointer text-zinc-700 transition-colors hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none dark:text-zinc-300 dark:hover:bg-zinc-800/50 dark:focus:bg-zinc-800/50"
                  >
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{formatSlotDate(slot.startsAt)}</td>
                    <td className="px-6 py-4">{formatSlotDate(slot.endsAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        isReserved
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      }`}>
                        {isReserved ? "Reservado" : "Disponible"}
                      </span>
                    </td>
                    <td className="px-6 py-4">{team?.name || "-"}</td>
                    <td className="px-6 py-4">{reservedBy?.name || reservedBy?.email || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-6 py-8 text-sm text-zinc-500 dark:text-zinc-400">
          Todavía no hay turnos creados.
        </p>
      )}
    </section>
  );
}
