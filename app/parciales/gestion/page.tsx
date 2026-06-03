import ParcialesNav from "@/components/ParcialesNav";
import PartialExamsList from "@/components/PartialExamsList";
import { getPartialExamsManagementData } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ManagePartialExamsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "docente") {
    redirect("/");
  }

  const { partialExams, collectionReady } = await getPartialExamsManagementData();

  return (
    <div className="container mx-auto min-h-screen p-8">
      <ParcialesNav />

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Gestionar parciales</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">Alta, edicion y seguimiento de examenes parciales.</p>
        </div>
        {collectionReady && (
          <Link
            href="/parciales/nuevo"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Parcial
          </Link>
        )}
      </div>

      {!collectionReady ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <h2 className="text-lg font-bold">Configuracion pendiente en PocketBase</h2>
          <p className="mt-2 leading-relaxed">
            Falta crear la coleccion <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900">partial_exams</code>.
          </p>
        </div>
      ) : (
        <PartialExamsList partialExams={partialExams} />
      )}
    </div>
  );
}
