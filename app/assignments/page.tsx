import { getAllAssignments } from "@/lib/data";
import Link from "next/link";
import { getCurrentUser } from "@/lib/pocketbase-server";
import FormattedDate from "@/components/FormattedDate";

export const dynamic = 'force-dynamic';

export default async function AssignmentsPage() {
  const assignments = await getAllAssignments();
  const user = await getCurrentUser();
  const isTeacher = user && (user.role === 'docente' || user.role === 'admin');

  return (
    <div className="container mx-auto p-8 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Trabajos Prácticos</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">Todos los trabajos prácticos del curso.</p>
        </div>
      </div>

      {isTeacher && (
        <div className="mb-8 flex justify-end">
            <Link 
                href="/assignments/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Añadir Nuevo Trabajo Práctico
            </Link>
        </div>
      )}

      <div className="grid gap-6">
        {assignments.length === 0 ? (
          <p className="text-zinc-500">No hay trabajos prácticos registrados aún.</p>
        ) : (
          assignments.map((assignment) => (
            <Link 
              href={`/assignments/${assignment.id}`} 
              key={assignment.id}
              className="block p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {assignment.title}
                  </h2>
                  {assignment.dueDate && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span>Entrega: <FormattedDate date={assignment.dueDate} locale="es-AR" showTime={true} /></span>
                      </div>
                  )}
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                   <svg className="w-5 h-5 text-zinc-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
              <div className="mt-4 text-zinc-600 dark:text-zinc-400 line-clamp-2" dangerouslySetInnerHTML={{ __html: assignment.description }} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
