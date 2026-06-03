"use client";

import { deletePartialExam } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeletePartialExamButton({ partialExamId }: { partialExamId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Estas seguro de que deseas eliminar este parcial?")) {
      return;
    }

    setIsDeleting(true);
    const result = await deletePartialExam(partialExamId);

    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "Error al eliminar el parcial");
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
    >
      {isDeleting ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
