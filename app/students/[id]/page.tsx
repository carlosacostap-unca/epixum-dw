import { getUserDeliveries, getAllAssignments, getUserById } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import StudentGradesSummary from "@/components/StudentGradesSummary";

export const dynamic = 'force-dynamic';

export default async function StudentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'docente' && currentUser.role !== 'admin')) {
    redirect('/');
  }

  const { id } = await params;
  
  const student = await getUserById(id);
  
  if (!student || student.role !== 'estudiante') {
    notFound();
  }

  const userDeliveries = await getUserDeliveries(student.id);
  const assignments = await getAllAssignments();

  return (
    <div className="container mx-auto p-8 min-h-screen">
      <div className="mb-8">
        <Link 
          href="/students"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Volver a Estudiantes
        </Link>
        <div className="flex items-center gap-4">
          {student.avatar ? (
            <img
              src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/_pb_users_auth_/${student.id}/${student.avatar}`}
              alt={student.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-700"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-2xl font-bold text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800">
              {student.name?.[0] || student.email[0]}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{student.name || "Sin nombre"}</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">{student.email}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 mb-8">
        <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">Datos de cursada</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">DNI</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{student.dni || "No registrado"}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Matrícula</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{student.enrollmentId || "No registrada"}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">Diseño Web</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {student.approvedWebDesignModule ? (
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Aprobado
                </span>
              ) : (
                <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Pendiente
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {/* We reuse the StudentGradesSummary component since it does exactly what we want */}
        <div className="pointer-events-none">
          <StudentGradesSummary deliveries={userDeliveries} assignments={assignments} userEmail={student.email} />
        </div>
        <p className="text-sm text-center text-zinc-500 dark:text-zinc-400 mt-4">
          Esta es la misma vista de resumen que el alumno ve en su panel principal.
        </p>
      </div>
    </div>
  );
}