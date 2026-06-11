"use client";

import { updateUserRole } from "@/lib/actions";
import { User } from "@/types";
import { useState } from "react";

export default function UserRoleSelect({ user }: { user: User }) {
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLoading(true);
    await updateUserRole(user.id, e.target.value);
    setLoading(false);
  };

  return (
    <select
      value={user.role || ""}
      onChange={handleChange}
      disabled={loading}
      className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-sm"
    >
      <option value="">Seleccionar rol</option>
      <option value="estudiante">Estudiante</option>
      <option value="docente">Docente</option>
      <option value="docente_invitado">Docente Invitado</option>
      <option value="admin">Administrador</option>
    </select>
  );
}
