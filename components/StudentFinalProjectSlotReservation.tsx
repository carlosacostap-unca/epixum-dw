"use client";

import {
  cancelFinalProjectPresentationSlotReservation,
  reserveFinalProjectPresentationSlot,
} from "@/lib/actions";
import pb from "@/lib/pocketbase";
import { FinalProjectPresentationSlot, User } from "@/types";
import { useEffect, useMemo, useState, useTransition } from "react";

interface StudentFinalProjectSlotReservationProps {
  slots: FinalProjectPresentationSlot[];
  teamId?: string;
}

function formatSlotDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStudentName(user?: User) {
  if (!user) {
    return "";
  }

  return user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "";
}

async function fetchLatestSlots() {
  const response = await fetch("/api/final-project/slots", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("No se pudieron actualizar los turnos.");
  }

  const data = await response.json() as { slots?: FinalProjectPresentationSlot[] };
  return data.slots || [];
}

export default function StudentFinalProjectSlotReservation({ slots, teamId }: StudentFinalProjectSlotReservationProps) {
  const [isPending, startTransition] = useTransition();
  const [liveSlots, setLiveSlots] = useState(slots);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLiveSlots(slots);
  }, [slots]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    async function refreshSlots({ showError = false } = {}) {
      try {
        const updatedSlots = await fetchLatestSlots();
        if (isMounted) {
          setLiveSlots(updatedSlots);
          setError(null);
        }
      } catch {
        if (isMounted && showError) {
          setError("No se pudieron actualizar los turnos. Actualizá la página para ver el estado más reciente.");
        }
      }
    }

    async function subscribeToSlots() {
      try {
        pb.authStore.loadFromCookie(document.cookie);
        const unsubscribeSlots = await pb.collection("final_project_presentation_slots").subscribe("*", () => {
          void refreshSlots();
        });
        const unsubscribeReservations = await pb.collection("final_project_slot_reservations").subscribe("*", () => {
          void refreshSlots();
        });

        unsubscribe = () => {
          unsubscribeSlots?.();
          unsubscribeReservations?.();
        };
      } catch {
        // La lista inicial y las acciones siguen funcionando con refresh server-side.
      }
    }

    void refreshSlots();
    void subscribeToSlots();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const reservedSlot = useMemo(
    () => liveSlots.find((slot) => Boolean(teamId && slot.team === teamId)) || null,
    [liveSlots, teamId],
  );
  const reservedByName = formatStudentName(reservedSlot?.expand?.reservedBy);

  function runAction(key: string, action: () => Promise<{ success: boolean; error?: string }>) {
    setPendingKey(key);
    setError(null);

    startTransition(async () => {
      const result = await action();

      if (result.success) {
        try {
          setLiveSlots(await fetchLatestSlots());
        } catch {
          setError("La reserva se guardó, pero no se pudo actualizar la lista automáticamente.");
        }
      } else {
        setError(result.error || "No se pudo completar la acción.");
      }

      setPendingKey(null);
    });
  }

  if (!teamId) {
    return null;
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Turno de presentación</h2>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Cada equipo puede reservar un turno de 15 minutos para presentar el proyecto final. Los turnos se actualizan en tiempo real.
      </p>

      {error && (
        <div
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="status"
        >
          {error}
        </div>
      )}

      {reservedSlot && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Tu equipo ya tiene un turno reservado</p>
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
            {formatSlotDate(reservedSlot.startsAt)} a {formatSlotDate(reservedSlot.endsAt)}
          </p>
          {reservedByName && (
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
              Reservado por: {reservedByName}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="https://meet.google.com/qgt-hftr-qum"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              Ingresar a Meet
            </a>
            <button
              type="button"
              onClick={() => runAction(`cancel-${reservedSlot.id}`, () => cancelFinalProjectPresentationSlotReservation(reservedSlot.id))}
              disabled={isPending && pendingKey === `cancel-${reservedSlot.id}`}
              className="rounded-md border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
            >
              {isPending && pendingKey === `cancel-${reservedSlot.id}` ? "Cancelando..." : "Cancelar reserva"}
            </button>
          </div>
        </div>
      )}

      {liveSlots.length > 0 ? (
        <div className="mt-4 divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {liveSlots.map((slot) => {
            const isOwnReservation = Boolean(teamId && slot.team === teamId);
            const isAvailable = !slot.team;

            return (
              <div key={slot.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{formatSlotDate(slot.startsAt)}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Duración: 15 minutos</p>
                </div>

                {isOwnReservation ? (
                  <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Tu reserva
                  </span>
                ) : isAvailable && reservedSlot ? (
                  <span className="inline-flex w-fit rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Disponible
                  </span>
                ) : isAvailable ? (
                  <button
                    type="button"
                    onClick={() => runAction(`reserve-${slot.id}`, () => reserveFinalProjectPresentationSlot(slot.id))}
                    disabled={isPending && pendingKey === `reserve-${slot.id}`}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isPending && pendingKey === `reserve-${slot.id}` ? "Reservando..." : "Reservar"}
                  </button>
                ) : (
                  <span className="inline-flex w-fit rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    No disponible
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          Todavía no hay turnos disponibles.
        </p>
      )}
    </section>
  );
}
