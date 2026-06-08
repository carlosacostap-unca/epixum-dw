import TeamManagement from "@/components/TeamManagement";
import { getTeamOverview } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "docente" && currentUser.role !== "admin")) {
    redirect("/");
  }

  const { teams, students, members, validationResponses } = await getTeamOverview();

  return (
    <div className="container mx-auto min-h-screen p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Equipos</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Gestiona equipos de trabajo y asigna estudiantes a un único equipo o dejalos sin equipo.
        </p>
      </div>

      <TeamManagement teams={teams} students={students} members={members} validationResponses={validationResponses} />
    </div>
  );
}
