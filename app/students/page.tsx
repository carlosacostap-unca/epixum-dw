import { getStudents } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { User } from "@/types";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'docente' && currentUser.role !== 'admin')) {
    redirect('/');
  }

  const students = await getStudents();

  return (
    <div className="container mx-auto p-8 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Estudiantes</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">Datos de cursada y lista de estudiantes matriculados.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden border border-zinc-200 dark:border-zinc-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs uppercase font-medium">
              <tr>
                <th className="px-6 py-4">Estudiante</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">DNI</th>
                <th className="px-6 py-4">Matrícula</th>
                <th className="px-6 py-4">Diseño Web</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {students.map((student: User) => (
                <tr key={student.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 group cursor-pointer transition-colors relative">
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                    <Link href={`/students/${student.id}`} className="absolute inset-0 z-10">
                      <span className="sr-only">Ver detalles de {student.name}</span>
                    </Link>
                    {student.avatar ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/_pb_users_auth_/${student.id}/${student.avatar}`}
                        alt={student.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                        {student.name?.[0] || student.email[0]}
                      </div>
                    )}
                    <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {student.name || "Sin nombre"}
                    </span>
                  </td>
                  <td className="px-6 py-4 relative z-0">{student.email}</td>
                  <td className="px-6 py-4 relative z-0">{student.dni || "-"}</td>
                  <td className="px-6 py-4 relative z-0">{student.enrollmentId || "-"}</td>
                  <td className="px-6 py-4 relative z-0">
                    {student.approvedWebDesignModule ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Aprobado
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
                        Pendiente
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    No hay estudiantes registrados en el curso.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}