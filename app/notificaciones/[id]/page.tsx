import FinalNotificationConversation from "@/components/FinalNotificationConversation";
import { getFinalNotificationMessages, getFinalNotificationThread } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NotificationThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/");
  }

  const { id } = await params;
  const thread = await getFinalNotificationThread(id);
  if (!thread) {
    notFound();
  }

  const canAccess = currentUser.role === "docente" || currentUser.role === "admin" || thread.student === currentUser.id;
  if (!canAccess) {
    redirect("/");
  }

  const messages = await getFinalNotificationMessages(thread.id);
  const backHref = currentUser.role === "estudiante" ? "/" : `/gestion-notificaciones/platform/${thread.student}`;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-4xl gap-6">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Volver
          </Link>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-zinc-950 dark:text-zinc-100">Mensaje del curso</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              Conversacion privada entre estudiante y equipo docente.
            </p>
          </div>
        </div>

        <FinalNotificationConversation
          thread={thread}
          messages={messages}
          currentUser={currentUser}
          returnPath={`/notificaciones/${thread.id}`}
        />
      </div>
    </main>
  );
}
