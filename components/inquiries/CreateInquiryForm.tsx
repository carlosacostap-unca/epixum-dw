"use client";

import { useState, useEffect } from "react";
import { createInquiry } from "@/lib/actions-inquiries";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Class, Assignment } from "@/types";

interface CreateInquiryFormProps {
  initialClassId?: string;
  initialAssignmentId?: string;
  classes: Class[];
  assignments: Assignment[];
}

export default function CreateInquiryForm({ initialClassId, initialAssignmentId, classes, assignments }: CreateInquiryFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || "");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(initialAssignmentId || "");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Reset assignment if class is selected, and vice versa
  useEffect(() => {
    if (selectedClassId) setSelectedAssignmentId("");
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedAssignmentId) setSelectedClassId("");
  }, [selectedAssignmentId]);

  const cancelHref = initialClassId 
    ? `/classes/${initialClassId}` 
    : initialAssignmentId 
      ? `/assignments/${initialAssignmentId}` 
      : "/inquiries";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await createInquiry({
      title,
      description,
      classId: selectedClassId || undefined,
      assignmentId: selectedAssignmentId || undefined,
    });

    setIsLoading(false);

    if (result.success) {
      router.refresh();
      router.push(cancelHref);
    } else {
      alert(result.error || "Error al crear la consulta");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Título
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          placeholder="Resumen breve de tu consulta"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Descripción detallada
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={5}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          placeholder="Describe tu duda con el mayor detalle posible..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="class" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Relacionado con la clase (opcional)
          </label>
          <select
            id="class"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={!!selectedAssignmentId}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
          >
            <option value="">-- Seleccionar clase --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="assignment" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Relacionado con el trabajo práctico (opcional)
          </label>
          <select
            id="assignment"
            value={selectedAssignmentId}
            onChange={(e) => setSelectedAssignmentId(e.target.value)}
            disabled={!!selectedClassId}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
          >
            <option value="">-- Seleccionar TP --</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Link
          href={cancelHref}
          className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors disabled:opacity-50"
        >
          {isLoading ? "Enviando..." : "Crear Consulta"}
        </button>
      </div>
    </form>
  );
}
