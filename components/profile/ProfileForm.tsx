"use client";

import { User } from "@/types";
import { useState } from "react";
import { updateUserProfile } from "@/lib/actions-users";

export default function ProfileForm({ user }: { user: User }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      dni: formData.get("dni") as string,
      enrollmentId: formData.get("enrollmentId") as string,
      birthDate: formData.get("birthDate") as string,
      phone: formData.get("phone") as string,
      approvedWebDesignModule: formData.get("approvedWebDesignModule") === "on",
    };

    const result = await updateUserProfile(user.id, data);

    setLoading(false);
    if (result.success) {
      setSuccess("Perfil actualizado correctamente");
    } else {
      setError(result.error || "Error al actualizar perfil");
    }
  };

  // Helper to format date for input type="date"
  const formattedBirthDate = user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : "";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        
        {/* Email (Read Only) */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-zinc-700 dark:border-zinc-600 dark:text-gray-400 cursor-not-allowed p-2 border"
          />
          <p className="mt-1 text-xs text-gray-500">El email no se puede modificar.</p>
        </div>

        {/* First Name */}
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombres</label>
          <input
            type="text"
            name="firstName"
            id="firstName"
            defaultValue={user.firstName || ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-zinc-800 dark:border-zinc-600 dark:text-white p-2 border"
          />
        </div>

        {/* Last Name */}
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Apellidos</label>
          <input
            type="text"
            name="lastName"
            id="lastName"
            defaultValue={user.lastName || ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-zinc-800 dark:border-zinc-600 dark:text-white p-2 border"
          />
        </div>

        {/* DNI */}
        <div>
          <label htmlFor="dni" className="block text-sm font-medium text-gray-700 dark:text-gray-300">DNI</label>
          <input
            type="text"
            name="dni"
            id="dni"
            defaultValue={user.dni || ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-zinc-800 dark:border-zinc-600 dark:text-white p-2 border"
          />
        </div>

        {/* Enrollment ID (Matrícula) */}
        <div>
          <label htmlFor="enrollmentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Matrícula Universitaria</label>
          <input
            type="text"
            name="enrollmentId"
            id="enrollmentId"
            defaultValue={user.enrollmentId || ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-zinc-800 dark:border-zinc-600 dark:text-white p-2 border"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono</label>
          <input
            type="tel"
            name="phone"
            id="phone"
            defaultValue={user.phone || ""}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-zinc-800 dark:border-zinc-600 dark:text-white p-2 border"
          />
        </div>

        {/* Birth Date */}
        <div className="col-span-2 md:col-span-1">
          <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Nacimiento</label>
          <input
            type="date"
            name="birthDate"
            id="birthDate"
            defaultValue={formattedBirthDate}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-zinc-800 dark:border-zinc-600 dark:text-white p-2 border"
          />
        </div>

        {/* Approved Web Design Module */}
        <div className="col-span-2">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="approvedWebDesignModule"
                name="approvedWebDesignModule"
                type="checkbox"
                defaultChecked={user.approvedWebDesignModule}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="approvedWebDesignModule" className="font-medium text-gray-700 dark:text-gray-300">
                Aprobado Módulo de Diseño Web
              </label>
              <p className="text-gray-500 dark:text-gray-400">
                Diplomatura Universitaria en Desarrollo Web Fullstack con JavaScript (UNCA - Nodo Tecnológico SFVC)
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Messages */}
      {error && (
        <div className="mt-4 p-4 text-red-700 bg-red-100 rounded-md dark:bg-red-900 dark:text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 p-4 text-green-700 bg-green-100 rounded-md dark:bg-green-900 dark:text-green-200">
          {success}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </form>
  );
}
