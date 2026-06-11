"use client";

import {
  deleteFinalProjectPresentationSlot,
  releaseFinalProjectPresentationSlot,
} from "@/lib/actions";
import { FinalProjectPresentationSlot } from "@/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface FinalProjectSlotDetailActionsProps {
  slot: FinalProjectPresentationSlot;
}

export default function FinalProjectSlotDetailActions({ slot }: FinalProjectSlotDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runAction(key: string, action: () => Promise<{ success: boolean; error?: string }>, onSuccess?: () => void) {
    setPendingKey(key);
    setError(null);

    startTransition(async () => {
      const result = await action();
      if (result.success) {
        onSuccess?.();
        router.refresh();
      } else {
        setError(result.error || "No se pudo completar la acción.");
      }
      setPendingKey(null);
    });
  }

  function handleRelease() {
    if (!window.confirm("Liberar este turno para que otro equipo pueda reservarlo?")) return;
    runAction("release", () => releaseFinalProjectPresentationSlot(slot.id));
  }

  function handleDelete() {
    const suffix = slot.team ? " El turno tiene una reserva activa." : "";
    if (!window.confirm(`Eliminar este turno?${suffix}`)) return;
    runAction("delete", () => deleteFinalProjectPresentationSlot(slot.id), () => router.push("/proyecto-final"));
  }

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {slot.team && (
          <button
            type="button"
            onClick={handleRelease}
            disabled={isPending && pendingKey === "release"}
            className="rounded-md border border-amber-200 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-900 dark:text-amber-200 dark:hover:bg-amber-950/40"
          >
            {isPending && pendingKey === "release" ? "Liberando..." : "Liberar turno"}
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending && pendingKey === "delete"}
          className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/40"
        >
          {isPending && pendingKey === "delete" ? "Eliminando..." : "Eliminar turno"}
        </button>
      </div>
    </div>
  );
}
