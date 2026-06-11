"use client";

import { saveFinalProjectTeamResource } from "@/lib/actions";
import { FINAL_PROJECT_RESOURCE_DEFINITIONS } from "@/lib/final-project-resources";
import { FinalProjectTeamResource, FinalProjectTeamResourceKey } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

interface FinalProjectTeamResourcesProps {
  resources: FinalProjectTeamResource[];
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = "50 MB";

function getResourceFileUrl(resource: FinalProjectTeamResource) {
  const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL?.replace(/\/$/, "");
  if (!pbUrl || !resource.file) {
    return "";
  }

  return `${pbUrl}/api/files/${resource.collectionId}/${resource.id}/${resource.file}`;
}

function formatSubmittedAt(value?: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function FinalProjectTeamResources({ resources }: FinalProjectTeamResourcesProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<FinalProjectTeamResourceKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resourceByKey = useMemo(
    () => new Map(resources.map((resource) => [resource.resourceKey, resource])),
    [resources],
  );
  const groupedDefinitions = useMemo(() => {
    return FINAL_PROJECT_RESOURCE_DEFINITIONS.reduce<Record<string, typeof FINAL_PROJECT_RESOURCE_DEFINITIONS>>((groups, definition) => {
      groups[definition.moduleName] = groups[definition.moduleName] || [];
      groups[definition.moduleName].push(definition);
      return groups;
    }, {});
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  function handleSubmit(formData: FormData) {
    const resourceKey = String(formData.get("resourceKey") || "") as FinalProjectTeamResourceKey;
    const definition = FINAL_PROJECT_RESOURCE_DEFINITIONS.find((item) => item.key === resourceKey);
    const submittedFile = formData.get("file");

    if (definition?.kind === "file" && submittedFile instanceof File && submittedFile.size > MAX_FILE_SIZE_BYTES) {
      setMessage(null);
      setError(`El archivo no puede superar los ${MAX_FILE_SIZE_LABEL}.`);
      return;
    }

    setPendingKey(resourceKey);
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await saveFinalProjectTeamResource(formData);
      if (result.success) {
        setMessage("Recurso guardado.");
        router.refresh();
      } else {
        setError(result.error || "No se pudo guardar el recurso.");
      }
      setPendingKey(null);
    });
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {message && (
        <div
          className="fixed right-6 top-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          role="status"
        >
          {message}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Recursos del proyecto final</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Cargá los archivos y enlaces que el equipo debe presentar para la revisión.
        </p>
      </div>

      {error && (
        <div
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="status"
        >
          {error}
        </div>
      )}

      <div className="mt-5 space-y-5">
        {Object.entries(groupedDefinitions).map(([moduleName, definitions]) => (
          <div key={moduleName} className="rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{moduleName}</h3>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {definitions.map((definition) => {
                const resource = resourceByKey.get(definition.key);
                const fileUrl = resource ? getResourceFileUrl(resource) : "";
                const submittedBy = resource?.expand?.submittedBy;
                const submittedByName = submittedBy?.name || [submittedBy?.firstName, submittedBy?.lastName].filter(Boolean).join(" ") || submittedBy?.email || "";

                return (
                  <form key={definition.key} action={handleSubmit} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,380px)_auto] lg:items-center">
                    <input type="hidden" name="resourceKey" value={definition.key} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{definition.title}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            resource
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {resource ? "Cargado" : "Pendiente"}
                        </span>
                      </div>

                      {resource && (
                        <div className="mt-1 space-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {definition.kind === "url" && resource.url && (
                            <a href={resource.url} target="_blank" rel="noreferrer" className="break-all text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                              {resource.url}
                            </a>
                          )}
                          {definition.kind === "file" && resource.file && (
                            <a href={fileUrl} target="_blank" rel="noreferrer" className="break-all text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                              {resource.originalName || resource.file}
                            </a>
                          )}
                          {(submittedByName || resource.submittedAt) && (
                            <p>
                              {submittedByName && <>Subido por {submittedByName}</>}
                              {submittedByName && resource.submittedAt && " · "}
                              {formatSubmittedAt(resource.submittedAt)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      {definition.kind === "url" ? (
                        <input
                          name="url"
                          type="url"
                          required
                          defaultValue={resource?.url || ""}
                          placeholder="https://..."
                          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      ) : (
                        <input
                          name="file"
                          type="file"
                          required={!resource}
                          accept={definition.accept}
                          className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200 dark:text-zinc-300 dark:file:bg-zinc-800 dark:file:text-zinc-200"
                        />
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isPending && pendingKey === definition.key}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isPending && pendingKey === definition.key ? "Guardando..." : resource ? "Actualizar" : "Cargar"}
                    </button>
                  </form>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
