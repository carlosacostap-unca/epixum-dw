import DeleteStudentButton from "@/components/DeleteStudentButton";
import StudentSiuEnrollmentCheckbox from "@/components/StudentSiuEnrollmentCheckbox";
import { getStudents, getTeamMembers, getTeams } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { User } from "@/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "docente" && currentUser.role !== "admin")) {
    redirect("/");
  }

  const [students, teams, teamMembers] = await Promise.all([getStudents(), getTeams(), getTeamMembers()]);
  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));
  const teamByStudent = new Map(teamMembers.map((member) => [member.student, teamNameById.get(member.team) || "Equipo asignado"]));

  return (
    <div className="container mx-auto min-h-screen p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Estudiantes</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">Datos de cursada y lista de estudiantes matriculados.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow dark:border-zinc-700 dark:bg-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
            <thead className="bg-zinc-50 text-xs font-medium uppercase dark:bg-zinc-900">
              <tr>
                <th className="px-6 py-4">Estudiante</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">DNI</th>
                <th className="px-6 py-4">Matricula</th>
                <th className="px-6 py-4">Inscripto SIU</th>
                <th className="px-6 py-4">Equipo</th>
                <th className="px-6 py-4">Diseno Web</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {students.map((student: User) => (
                <tr key={student.id} className="group relative cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="flex items-center gap-3 px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                    <Link href={`/students/${student.id}`} className="absolute inset-0 z-10">
                      <span className="sr-only">Ver detalles de {student.name}</span>
                    </Link>
                    {student.avatar ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/_pb_users_auth_/${student.id}/${student.avatar}`}
                        alt={student.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        {student.name?.[0] || student.email[0]}
                      </div>
                    )}
                    <span className="transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {student.name || "Sin nombre"}
                    </span>
                  </td>
                  <td className="relative z-0 px-6 py-4">{student.email}</td>
                  <td className="relative z-0 px-6 py-4">{student.dni || "-"}</td>
                  <td className="relative z-0 px-6 py-4">{student.enrollmentId || "-"}</td>
                  <td className="relative z-20 px-6 py-4">
                    <StudentSiuEnrollmentCheckbox
                      studentId={student.id}
                      studentName={student.name || student.email}
                      initialValue={Boolean(student.enrolledInSiu)}
                    />
                  </td>
                  <td className="relative z-0 px-6 py-4">{teamByStudent.get(student.id) || "Sin equipo"}</td>
                  <td className="relative z-0 px-6 py-4">
                    {student.approvedWebDesignModule ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Aprobado
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="relative z-20 px-6 py-4">
                    <DeleteStudentButton
                      studentId={student.id}
                      studentName={student.name || student.email}
                    />
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-zinc-500">
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
