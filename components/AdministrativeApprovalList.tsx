"use client";

import { approveAssignmentForStudent, unapproveAssignmentForStudent } from "@/lib/actions";
import { Assignment, Delivery, User } from "@/types";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface AdministrativeApprovalListProps {
  assignment: Assignment;
  students: User[];
  deliveries: Delivery[];
}

type RowState = {
  student: User;
  delivery: Delivery | undefined;
  isApproved: boolean;
};

function getFirstName(student: User) {
  return student.firstName || student.name || "-";
}

function getLastName(student: User) {
  return student.lastName || "-";
}

export default function AdministrativeApprovalList({ assignment, students, deliveries }: AdministrativeApprovalListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [studentToUnapprove, setStudentToUnapprove] = useState<User | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const rows = useMemo<RowState[]>(() => {
    const latestDeliveryByStudent = new Map<string, Delivery>();

    for (const delivery of deliveries) {
      const current = latestDeliveryByStudent.get(delivery.student);
      if (!current || new Date(delivery.created).getTime() > new Date(current.created).getTime()) {
        latestDeliveryByStudent.set(delivery.student, delivery);
      }
    }

    return students
      .map((student) => {
        const delivery = latestDeliveryByStudent.get(student.id);
        return {
          student,
          delivery,
          isApproved: delivery?.status === 'graded' && delivery?.verdict === 'Aprobado',
        };
      })
      .sort((a, b) => {
        const firstNameCompare = getFirstName(a.student).localeCompare(getFirstName(b.student), 'es', {
          sensitivity: 'base',
        });
        if (firstNameCompare !== 0) return firstNameCompare;
        return getLastName(a.student).localeCompare(getLastName(b.student), 'es', {
          sensitivity: 'base',
        });
      });
  }, [students, deliveries]);

  const filteredRows = rows.filter(({ student }) => {
    const text = `${student.firstName || ""} ${student.lastName || ""} ${student.name || ""} ${student.email || ""}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const approvedCount = rows.filter((row) => row.isApproved).length;

  const handleApprove = async (student: User) => {
    setPendingStudentId(student.id);
    setMessage(null);

    try {
      const result = await approveAssignmentForStudent(assignment.id, student.id);
      if (!result.success) {
        setMessage(result.error || "No se pudo aprobar al estudiante.");
        return;
      }

      setMessage(`${getFirstName(student)} ${getLastName(student)} quedo aprobado para este trabajo practico.`);
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("No se pudo aprobar al estudiante.");
    } finally {
      setPendingStudentId(null);
    }
  };

  const handleUnapprove = async () => {
    if (!studentToUnapprove) return;

    const student = studentToUnapprove;
    setPendingStudentId(student.id);
    setMessage(null);

    try {
      const result = await unapproveAssignmentForStudent(assignment.id, student.id);
      if (!result.success) {
        setMessage(result.error || "No se pudo desmarcar la aprobacion del estudiante.");
        return;
      }

      setMessage(`${getFirstName(student)} ${getLastName(student)} quedo pendiente de evaluacion.`);
      setStudentToUnapprove(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("No se pudo desmarcar la aprobacion del estudiante.");
    } finally {
      setPendingStudentId(null);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">Aprobacion de estudiantes</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {approvedCount} de {rows.length} estudiantes aprobados.
          </p>
        </div>
        <input
          type="text"
          placeholder="Buscar estudiante..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 sm:max-w-xs"
        />
      </div>

      {message && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          {message}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
          <thead className="bg-zinc-50 dark:bg-zinc-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-300">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-300">Apellido</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-300">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-300">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-300">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-700 dark:bg-zinc-800">
            {filteredRows.length > 0 ? (
              filteredRows.map(({ student, isApproved }) => (
                <tr key={student.id}>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">{getFirstName(student)}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-zinc-700 dark:text-zinc-300">{getLastName(student)}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400">{student.email || "-"}</td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isApproved
                        ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                    }`}>
                      {isApproved ? "Aprobado" : "Pendiente de evaluacion"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm">
                    {isApproved ? (
                      <button
                        type="button"
                        onClick={() => setStudentToUnapprove(student)}
                        disabled={pendingStudentId === student.id}
                        className="inline-flex items-center justify-center rounded-md bg-zinc-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-600 dark:hover:bg-zinc-500"
                      >
                        {pendingStudentId === student.id ? "Desmarcando..." : "Desmarcar aprobado"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApprove(student)}
                        disabled={pendingStudentId === student.id}
                        className="inline-flex items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {pendingStudentId === student.id ? "Aprobando..." : "Marcar aprobado"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  No hay estudiantes para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {studentToUnapprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Desmarcar aprobacion</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Vas a quitar la aprobacion de {getFirstName(studentToUnapprove)} {getLastName(studentToUnapprove)} para este trabajo practico. El estudiante volvera a verlo como pendiente de evaluacion.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStudentToUnapprove(null)}
                disabled={pendingStudentId === studentToUnapprove.id}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUnapprove}
                disabled={pendingStudentId === studentToUnapprove.id}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pendingStudentId === studentToUnapprove.id ? "Desmarcando..." : "Si, desmarcar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
