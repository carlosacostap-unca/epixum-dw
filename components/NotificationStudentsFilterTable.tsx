"use client";

import Link from "next/link";
import { ReactNode, useMemo, useState } from "react";
import { FinalCourseStatus } from "@/types";

export type NotificationStudentRow = {
  id: string;
  name: string;
  email: string;
  source: "platform" | "external-siu";
  sourceLabel: string;
  href: string;
  enrolledInSiu: boolean;
  siuLabel: "Si" | "No";
  finalCourseStatus?: FinalCourseStatus;
  finalCourseStatusLabel: string;
  finalCourseGradeLabel: string;
  hasSentMessage: boolean;
  sentMessageLabel: "Enviado" | "Sin mensaje";
  hasUnreadMessages: boolean;
  unreadLabel: "No leido" | "Al dia";
};

type ColumnKey =
  | "name"
  | "sourceLabel"
  | "email"
  | "siuLabel"
  | "finalCourseStatusLabel"
  | "finalCourseGradeLabel"
  | "sentMessageLabel"
  | "unreadLabel";

type Filters = Partial<Record<ColumnKey, string[]>>;

const columns: { key: ColumnKey; label: string }[] = [
  { key: "name", label: "Alumno" },
  { key: "sourceLabel", label: "Origen" },
  { key: "email", label: "Email" },
  { key: "siuLabel", label: "Inscripto SIU" },
  { key: "finalCourseStatusLabel", label: "Estado final" },
  { key: "finalCourseGradeLabel", label: "Nota final" },
  { key: "sentMessageLabel", label: "Mensaje enviado" },
  { key: "unreadLabel", label: "No leidos" },
];

const statusStyles: Record<FinalCourseStatus, string> = {
  Promociona: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Regulariza: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "En carrera": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Libre: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function getCellValue(row: NotificationStudentRow, key: ColumnKey) {
  return row[key];
}

function isFilterActive(filters: Filters, key: ColumnKey, allValues: string[]) {
  const selected = filters[key];
  return Boolean(selected && selected.length < allValues.length);
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function SourceBadge({ source }: { source: NotificationStudentRow["source"] }) {
  return source === "platform" ? (
    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
      Usuario plataforma
    </Badge>
  ) : (
    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
      SIU sin usuario
    </Badge>
  );
}

function SiuEnrollmentBadge({ enrolled }: { enrolled: boolean }) {
  return enrolled ? (
    <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">Si</Badge>
  ) : (
    <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">No</Badge>
  );
}

function StatusBadge({ status }: { status?: FinalCourseStatus }) {
  if (!status) {
    return <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Sin asignar</Badge>;
  }

  return <Badge className={statusStyles[status]}>{status}</Badge>;
}

function SentMessageBadge({ sent }: { sent: boolean }) {
  return sent ? (
    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Enviado</Badge>
  ) : (
    <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Sin mensaje</Badge>
  );
}

function UnreadMessageBadge({ unread }: { unread: boolean }) {
  return unread ? (
    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">No leido</Badge>
  ) : (
    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">Al dia</Badge>
  );
}

function FilterMenu({
  column,
  values,
  selected,
  onApply,
  onClose,
}: {
  column: { key: ColumnKey; label: string };
  values: string[];
  selected?: string[];
  onApply: (values: string[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>(selected ?? values);
  const visibleValues = values.filter((value) => value.toLowerCase().includes(query.trim().toLowerCase()));
  const allVisibleSelected = visibleValues.length > 0 && visibleValues.every((value) => draft.includes(value));

  function toggleValue(value: string) {
    setDraft((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function toggleVisibleValues() {
    setDraft((current) => {
      if (allVisibleSelected) {
        return current.filter((value) => !visibleValues.includes(value));
      }

      return Array.from(new Set([...current, ...visibleValues]));
    });
  }

  return (
    <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-lg border border-zinc-200 bg-white p-3 text-zinc-700 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">{column.label}</p>
        <button type="button" onClick={onClose} className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Cerrar
        </button>
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar..."
        className="mb-2 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
      />
      <label className="mb-2 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
        <input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleValues} />
        Seleccionar visibles
      </label>
      <div className="max-h-56 overflow-y-auto border-y border-zinc-100 py-1 dark:border-zinc-800">
        {visibleValues.length === 0 ? (
          <p className="px-2 py-3 text-sm text-zinc-500 dark:text-zinc-400">Sin coincidencias.</p>
        ) : (
          visibleValues.map((value) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <input
                type="checkbox"
                checked={draft.includes(value)}
                onChange={() => toggleValue(value)}
              />
              <span className="truncate">{value}</span>
            </label>
          ))
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setDraft(values)}
          className="rounded-md px-3 py-1.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(draft);
            onClose();
          }}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

export default function NotificationStudentsFilterTable({ students }: { students: NotificationStudentRow[] }) {
  const [filters, setFilters] = useState<Filters>({});
  const [openColumn, setOpenColumn] = useState<ColumnKey | null>(null);
  const optionsByColumn = useMemo(() => {
    return columns.reduce<Record<ColumnKey, string[]>>((options, column) => {
      options[column.key] = Array.from(new Set(students.map((student) => getCellValue(student, column.key))))
        .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base", numeric: true }));
      return options;
    }, {} as Record<ColumnKey, string[]>);
  }, [students]);
  const filteredStudents = useMemo(() => {
    return students.filter((student) =>
      columns.every((column) => {
        const selected = filters[column.key];
        if (!selected) {
          return true;
        }

        return selected.includes(getCellValue(student, column.key));
      }),
    );
  }, [filters, students]);
  const activeFilterCount = columns.filter((column) =>
    isFilterActive(filters, column.key, optionsByColumn[column.key] || []),
  ).length;

  function applyFilter(key: ColumnKey, values: string[]) {
    const allValues = optionsByColumn[key] || [];
    setFilters((current) => {
      const next = { ...current };
      if (values.length === 0) {
        next[key] = [];
      } else if (values.length === allValues.length) {
        delete next[key];
      } else {
        next[key] = values;
      }
      return next;
    });
  }

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">Alumnos</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {filteredStudents.length} de {students.length} alumnos visibles
          </p>
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => setFilters({})}
            className="w-fit rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Limpiar filtros ({activeFilterCount})
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-left text-sm text-zinc-600 dark:text-zinc-300">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800/70 dark:text-zinc-400">
            <tr>
              {columns.map((column) => {
                const values = optionsByColumn[column.key] || [];
                const active = isFilterActive(filters, column.key, values);

                return (
                  <th key={column.key} className="relative px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      <button
                        type="button"
                        onClick={() => setOpenColumn((current) => current === column.key ? null : column.key)}
                        className={`rounded border px-1.5 py-0.5 text-[11px] font-bold transition-colors ${
                          active
                            ? "border-blue-500 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
                            : "border-zinc-300 text-zinc-500 hover:bg-zinc-200 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
                        }`}
                        aria-label={`Filtrar ${column.label}`}
                      >
                        v
                      </button>
                    </div>
                    {openColumn === column.key && (
                      <FilterMenu
                        column={column}
                        values={values}
                        selected={filters[column.key]}
                        onApply={(nextValues) => applyFilter(column.key, nextValues)}
                        onClose={() => setOpenColumn(null)}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No hay alumnos que coincidan con los filtros aplicados.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={`${student.source}-${student.id}`} className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-0 py-0">
                    <Link href={student.href} className="block px-5 py-4 font-medium text-zinc-950 group-hover:underline dark:text-zinc-100">
                      {student.name}
                    </Link>
                  </td>
                  <td className="px-0 py-0">
                    <Link href={student.href} className="block px-5 py-4">
                      <SourceBadge source={student.source} />
                    </Link>
                  </td>
                  <td className="px-0 py-0">
                    <Link href={student.href} className="block px-5 py-4">
                      {student.email}
                    </Link>
                  </td>
                  <td className="px-0 py-0">
                    <Link href={student.href} className="block px-5 py-4">
                      <SiuEnrollmentBadge enrolled={student.enrolledInSiu} />
                    </Link>
                  </td>
                  <td className="px-0 py-0">
                    <Link href={student.href} className="block px-5 py-4">
                      <StatusBadge status={student.finalCourseStatus} />
                    </Link>
                  </td>
                  <td className="px-0 py-0">
                    <Link href={student.href} className="block px-5 py-4 font-medium text-zinc-950 dark:text-zinc-100">
                      {student.finalCourseGradeLabel}
                    </Link>
                  </td>
                  <td className="px-0 py-0">
                    <Link href={student.href} className="block px-5 py-4">
                      <SentMessageBadge sent={student.hasSentMessage} />
                    </Link>
                  </td>
                  <td className="px-0 py-0">
                    <Link href={student.href} className="block px-5 py-4">
                      <UnreadMessageBadge unread={student.hasUnreadMessages} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
