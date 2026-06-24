"use client";

import { createExternalSiuStudent } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState, useTransition } from "react";

export default function ExternalSiuStudentForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);

    startTransition(async () => {
      const result = await createExternalSiuStudent(formData);
      if (!result.success) {
        setMessage({ type: "error", text: result.error || "No se pudo cargar el inscripto SIU externo." });
        return;
      }

      formRef.current?.reset();
      setMessage({ type: "success", text: "Inscripto SIU sin usuario cargado." });
      router.refresh();
    });
  }

  return (
    <section className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">Cargar inscripto SIU sin usuario</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Estos registros no crean usuarios. Se muestran diferenciados y se consideran libres hasta que la persona ingrese a la plataforma.
        </p>
      </div>
      <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-5">
        <label className="grid gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200 lg:col-span-2">
          Nombre y apellido
          <input
            name="fullName"
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-950 shadow-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
          DNI
          <input
            name="dni"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-950 shadow-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Matricula
          <input
            name="enrollmentId"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-950 shadow-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Email
          <input
            name="email"
            type="email"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-950 shadow-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-200 lg:col-span-4">
          Observaciones
          <input
            name="notes"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-950 shadow-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Cargando..." : "Cargar"}
          </button>
        </div>
        {message && (
          <p className={`text-sm lg:col-span-5 ${message.type === "error" ? "text-red-600 dark:text-red-300" : "text-green-700 dark:text-green-300"}`}>
            {message.text}
          </p>
        )}
      </form>
    </section>
  );
}
