"use client";

import { submitTeamValidationResponse } from "@/lib/actions";
import { TeamValidationResponse, TeamValidationStatus } from "@/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface StudentTeamValidationFormProps {
  response?: TeamValidationResponse | null;
  hasTeam: boolean;
}

const options: { value: TeamValidationStatus; label: string; helper: string }[] = [
  {
    value: "correct",
    label: "Mi equipo está correcto",
    helper: "El equipo y sus integrantes coinciden con lo acordado.",
  },
  {
    value: "wrong_team",
    label: "Estoy en otro equipo",
    helper: "El equipo asignado no corresponde.",
  },
  {
    value: "missing_member",
    label: "Faltan uno o más compañeros",
    helper: "Una o más personas que deben estar en el equipo no aparecen.",
  },
  {
    value: "extra_member",
    label: "Sobran uno o más compañeros",
    helper: "Aparecen una o más personas que no pertenecen al equipo.",
  },
  {
    value: "no_team",
    label: "No tengo equipo asignado",
    helper: "El sistema no muestra equipo o falta resolver la asignación.",
  },
  {
    value: "other",
    label: "Otro problema",
    helper: "Hay una situación distinta que el docente debe revisar.",
  },
];

export default function StudentTeamValidationForm({ response, hasTeam }: StudentTeamValidationFormProps) {
  const router = useRouter();
  const pendingResponse = response && !response.resolvedAt ? response : null;
  const resolvedResponse = response?.resolvedAt ? response : null;
  const [isEditing, setIsEditing] = useState(!pendingResponse);
  const [selectedStatus, setSelectedStatus] = useState<TeamValidationStatus>(
    pendingResponse?.status || (hasTeam ? "correct" : "no_team")
  );
  const [details, setDetails] = useState(pendingResponse?.details || "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requiresDetails = selectedStatus !== "correct";
  const shouldAskTeamComposition = !hasTeam || selectedStatus === "no_team" || selectedStatus === "wrong_team";
  const detailsLabel = shouldAskTeamComposition
    ? "Indica tu equipo y tus compañeros"
    : "Detalle para el docente";
  const detailsPlaceholder = shouldAskTeamComposition
    ? "Ejemplo: Mi equipo es Equipo 03. Mis compañeros son Ana Pérez (ana@email.com), Juan Gómez (juan@email.com) y Carla Díaz."
    : requiresDetails
      ? "Indica nombres, emails o qué debería corregirse."
      : "Opcional";

  function handleSubmit(formData: FormData) {
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await submitTeamValidationResponse(formData);
      if (result.success) {
        setMessage("Respuesta enviada al docente.");
        setIsEditing(false);
        router.refresh();
      } else {
        setError(result.error || "No se pudo enviar la respuesta.");
      }
    });
  }

  function handleCancelEdit() {
    setSelectedStatus(pendingResponse?.status || (hasTeam ? "correct" : "no_team"));
    setDetails(pendingResponse?.details || "");
    setMessage(null);
    setError(null);
    setIsEditing(false);
  }

  const selectedOption = options.find((option) => option.value === pendingResponse?.status);
  const selectedLabel = selectedOption?.label || "Respuesta enviada";
  const selectedHelper = selectedOption?.helper || "";
  const submittedDate = pendingResponse?.submittedAt
    ? new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(pendingResponse.submittedAt))
    : null;

  if (pendingResponse && !isEditing) {
    return (
      <section className="mt-4 rounded-lg border border-blue-200 bg-white/70 p-4 text-sm dark:border-blue-800 dark:bg-blue-950/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-blue-950 dark:text-blue-100">
              Informe enviado al docente
            </h3>
            <p className="mt-1 text-blue-800 dark:text-blue-200">
              Tu respuesta fue registrada y está esperando revisión del docente.
            </p>
          </div>
          <span className="inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            Esperando respuesta del docente
          </span>
        </div>

        <dl className="mt-4 grid gap-3 rounded-md border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-900/20">
          <div>
            <dt className="text-xs font-semibold uppercase text-blue-800 dark:text-blue-200">Respuesta enviada</dt>
            <dd className="mt-1 font-medium text-blue-950 dark:text-blue-100">{selectedLabel}</dd>
            {selectedHelper && <dd className="mt-1 text-blue-800 dark:text-blue-200">{selectedHelper}</dd>}
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-blue-800 dark:text-blue-200">Detalle para el docente</dt>
            <dd className="mt-1 whitespace-pre-wrap text-blue-950 dark:text-blue-100">
              {pendingResponse.details || "Sin detalle adicional."}
            </dd>
          </div>
          {submittedDate && (
            <div>
              <dt className="text-xs font-semibold uppercase text-blue-800 dark:text-blue-200">Fecha de envío</dt>
              <dd className="mt-1 text-blue-950 dark:text-blue-100">{submittedDate}</dd>
            </div>
          )}
        </dl>

        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setError(null);
            setIsEditing(true);
          }}
          className="mt-4 rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-900 transition-colors hover:bg-blue-100 dark:border-blue-700 dark:text-blue-100 dark:hover:bg-blue-900/40"
        >
          Modificar respuesta
        </button>
      </section>
    );
  }

  return (
    <form action={handleSubmit} className="mt-4 rounded-lg border border-blue-200 bg-white/70 p-4 dark:border-blue-800 dark:bg-blue-950/50">
      {resolvedResponse && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Tu solicitud anterior fue marcada como resuelta por el docente. Revisa nuevamente tu equipo y envía una nueva respuesta según tu situación actual.
        </div>
      )}
      {!hasTeam && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Como todavía no tenés equipo asignado en el sistema, indicá el nombre de tu equipo y quiénes son tus compañeros para que el docente pueda corregir la asignación.
        </div>
      )}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-blue-950 dark:text-blue-100">
          Revisá si tu equipo está bien asignado
        </legend>
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer gap-3 rounded-md border border-transparent p-2 text-sm hover:border-blue-200 hover:bg-blue-50/70 dark:hover:border-blue-800 dark:hover:bg-blue-900/30">
            <input
              type="radio"
              name="status"
              value={option.value}
              checked={selectedStatus === option.value}
              onChange={() => setSelectedStatus(option.value)}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block font-medium text-blue-950 dark:text-blue-100">{option.label}</span>
              <span className="block text-blue-800 dark:text-blue-200">{option.helper}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="mt-4">
        <label htmlFor="team-validation-details" className="mb-1 block text-sm font-medium text-blue-950 dark:text-blue-100">
          {detailsLabel}
        </label>
        <textarea
          id="team-validation-details"
          name="details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          required={requiresDetails}
          rows={3}
          placeholder={detailsPlaceholder}
          className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-800 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>

      {(message || error) && (
        <p className={`mt-3 text-sm ${error ? "text-red-700 dark:text-red-200" : "text-emerald-700 dark:text-emerald-200"}`}>
          {error || message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {isPending ? "Enviando..." : pendingResponse ? "Actualizar respuesta" : "Enviar respuesta"}
        </button>
        {pendingResponse && (
          <button
            type="button"
            onClick={handleCancelEdit}
            disabled={isPending}
            className="rounded-md border border-blue-300 px-4 py-2 text-sm font-medium text-blue-900 transition-colors hover:bg-blue-100 disabled:opacity-60 dark:border-blue-700 dark:text-blue-100 dark:hover:bg-blue-900/40"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
