"use client";

import { createAssignment, updateAssignment } from "@/lib/actions";
import { Assignment, AssignmentType, Question } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import RichTextEditor from "./RichTextEditor";
import { v4 as uuidv4 } from "uuid";

interface AssignmentFormProps {
  assignment?: Assignment;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export default function AssignmentForm({ assignment, onClose, isEmbedded = false }: AssignmentFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Helper to convert UTC date string to local datetime-local string
  const getLocalDateTime = (isoDate: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16);
  };
  const [description, setDescription] = useState(assignment?.description || "");
  const [type, setType] = useState<AssignmentType>(assignment?.type || "file_upload");
  const [questions, setQuestions] = useState<Question[]>(assignment?.questions || []);
  const [aiPrompt, setAiPrompt] = useState(assignment?.aiPrompt || "");

  const handleAddQuestion = () => {
    setQuestions([...questions, { id: uuidv4(), text: "" }]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleQuestionChange = (id: string, text: string) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, text } : q)));
  };

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    
    // Convert local datetime to UTC before sending
    const dateStr = formData.get("dueDate") as string;
    if (dateStr) {
        const date = new Date(dateStr);
        formData.set("dueDate", date.toISOString());
    }

    const correctionDateStr = formData.get("correctionDueDate") as string;
    if (correctionDateStr) {
        const correctionDate = new Date(correctionDateStr);
        formData.set("correctionDueDate", correctionDate.toISOString());
    }
    
    try {
      // Ensure description is included in formData
      formData.set("description", description);
      formData.set("type", type);
      formData.set("aiPrompt", aiPrompt);
      
      if (type === "questionnaire") {
        formData.set("questions", JSON.stringify(questions));
      }

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

  const formContent = (
    <div className="space-y-4">
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
        <label htmlFor="dueDate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Fecha límite de entrega (opcional)
        </label>
        <input
          type="datetime-local"
          name="dueDate"
          id="dueDate"
          defaultValue={assignment?.dueDate ? getLocalDateTime(assignment.dueDate) : ""}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
        />
      </div>

      <div>
        <label htmlFor="correctionDueDate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Fecha límite para corregir y reenviar (opcional)
        </label>
        <input
          type="datetime-local"
          name="correctionDueDate"
          id="correctionDueDate"
          defaultValue={assignment?.correctionDueDate ? getLocalDateTime(assignment.correctionDueDate) : ""}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Descripción
        </label>
        <RichTextEditor content={description} onChange={setDescription} />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Tipo de Entrega
        </label>
        <select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as AssignmentType)}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
        >
          <option value="file_upload">Entrega de Archivo (Código Fuente)</option>
          <option value="questionnaire">Cuestionario</option>
        </select>
      </div>

      {type === "file_upload" && (
        <div>
          <label htmlFor="aiPrompt" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Prompt de Preevaluación (IA)
          </label>
          <textarea
            id="aiPrompt"
            name="aiPrompt"
            rows={4}
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ej: Verifica que el código incluya un archivo index.html y un archivo styles.css, que no tenga errores de sintaxis y utilice etiquetas semánticas de HTML5..."
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          ></textarea>
          <p className="text-xs text-zinc-500 mt-1">Este prompt se añadirá a las instrucciones base de la IA al momento de preevaluar las entregas de los estudiantes.</p>
        </div>
      )}

      {type === "questionnaire" && (
        <div className="space-y-3 border-t border-zinc-200 dark:border-zinc-700 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Preguntas</h3>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              + Agregar Pregunta
            </button>
          </div>
          
          {questions.length === 0 && (
            <p className="text-sm text-zinc-500 italic">No hay preguntas definidas.</p>
          )}

          {questions.map((question, index) => (
            <div key={question.id} className="flex gap-2 items-start">
              <span className="text-sm font-bold text-zinc-500 mt-2">{index + 1}.</span>
              <div className="flex-1">
                <textarea
                  value={question.text}
                  onChange={(e) => handleQuestionChange(question.id, e.target.value)}
                  placeholder="Escribe la pregunta aquí..."
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm"
                  rows={2}
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveQuestion(question.id)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Eliminar pregunta"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="w-full">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        <form action={handleSubmit}>
           {formContent}
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
        {assignment ? "Editar Trabajo Práctico" : "Nuevo Trabajo Práctico"}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form action={handleSubmit}>
        {formContent}
      </form>
    </div>
  );
}
