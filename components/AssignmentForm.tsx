"use client";

import { createAssignment, updateAssignment } from "@/lib/actions";
import { Assignment } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import RichTextEditor from "./RichTextEditor";

interface AssignmentFormProps {
  assignment?: Assignment;
  onClose?: () => void;
}

export default function AssignmentForm({ assignment, onClose }: AssignmentFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState(assignment?.description || "");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      // Ensure description is included in formData
      formData.set("description", description);

      let result;
      if (assignment) {
        // Update assignment
        result = await updateAssignment(assignment.id, formData);
      } else {
        result = await createAssignment(formData);
      }

      if (result.success) {
        if (onClose) onClose();
        router.refresh();
      } else {
        setError(result.error || "Ocurrió un error");
      }
    } catch (e) {
      setError("Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 max-w-md w-full">
      <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
        {assignment ? "Editar Trabajo Práctico" : "Nuevo Trabajo Práctico"}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Título
          </label>
          <input
            type="text"
            name="title"
            id="title"
            defaultValue={assignment?.title}
            required
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Descripción
          </label>
          <RichTextEditor
            content={description}
            onChange={setDescription}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
