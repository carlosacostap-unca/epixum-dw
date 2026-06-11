"use client";

import { deleteFinalProjectTeamResource } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface FinalProjectTeamResourceDeleteButtonProps {
  resourceId: string;
  resourceTitle: string;
}

export default function FinalProjectTeamResourceDeleteButton({
  resourceId,
  resourceTitle,
}: FinalProjectTeamResourceDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm(`Eliminar el recurso "${resourceTitle}"?`)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteFinalProjectTeamResource(resourceId);
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "No se pudo eliminar el recurso.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/40"
      >
        {isPending ? "Eliminando..." : "Eliminar"}
      </button>
      {error && <p className="max-w-xs text-sm text-red-600 dark:text-red-300">{error}</p>}
    </div>
  );
}
