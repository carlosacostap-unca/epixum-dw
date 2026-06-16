import StudentGradesSummary from "@/components/StudentGradesSummary";
import { getAllAssignments, getUserById, getUserDeliveries } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

function formatDate(date?: string) {
  if (!date) return "No registrada";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function getEquivalenceStatusLabel(status?: string) {
  if (status === "confirmed") return "Confirmada";
  if (status === "dismissed") return "Desestimada";
  return "Dudosa";
}

function DataItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="font-medium text-zinc-900 dark:text-zinc-100">{value || "No registrado"}</div>
    </div>
  );
}

export default async function StudentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "docente" && currentUser.role !== "admin")) {
    redirect("/");
  }

  const { id } = await params;
  const student = await getUserById(id);

  if (!student || student.role !== "estudiante") {
    notFound();
  }

  const userDeliveries = await getUserDeliveries(student.id);
  const assignments = await getAllAssignments();
  const fullName = student.name || [student.firstName, student.lastName].filter(Boolean).join(" ");

  return (
    <div className="container mx-auto min-h-screen p-8">
      <div className="mb-8">
        <Link
          href="/students"
          className="mb-4 inline-flex items-center text-sm text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a Estudiantes
        </Link>
        <div className="flex items-center gap-4">
          {student.avatar ? (
            <img
              src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/_pb_users_auth_/${student.id}/${student.avatar}`}
              alt={fullName || student.email}
              className="h-16 w-16 rounded-full border-2 border-zinc-200 object-cover dark:border-zinc-700"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-200 bg-blue-100 text-2xl font-bold text-blue-600 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              {fullName?.[0] || student.email[0]}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{fullName || "Sin nombre"}</h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">{student.email}</p>
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="mb-5 text-xl font-bold text-zinc-900 dark:text-zinc-100">Datos personales del alumno</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <DataItem label="Nombre completo" value={fullName || "No registrado"} />
          <DataItem label="Nombres" value={student.firstName || "No registrados"} />
          <DataItem label="Apellidos" value={student.lastName || "No registrados"} />
          <DataItem label="Email" value={student.email || "No registrado"} />
          <DataItem label="Usuario" value={student.username || "No registrado"} />
          <DataItem label="DNI" value={student.dni || "No registrado"} />
          <DataItem label="Fecha de nacimiento" value={formatDate(student.birthDate)} />
          <DataItem label="Telefono" value={student.phone || "No registrado"} />
          <DataItem label="Matricula universitaria" value={student.enrollmentId || "No registrada"} />
          <DataItem
            label="Modulo de Diseno Web"
            value={
              student.approvedWebDesignModule ? (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Aprobado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pendiente
                </span>
              )
            }
          />
          <DataItem
            label="Estado de equivalencia"
            value={student.approvedWebDesignModule ? getEquivalenceStatusLabel(student.webDesignModuleEquivalenceStatus) : "No aplica"}
          />
        </div>
      </div>

      <div className="mt-8">
        <div className="pointer-events-none">
          <StudentGradesSummary deliveries={userDeliveries} assignments={assignments} userEmail={student.email} />
        </div>
        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Esta es la misma vista de resumen que el alumno ve en su panel principal.
        </p>
      </div>
    </div>
  );
}
