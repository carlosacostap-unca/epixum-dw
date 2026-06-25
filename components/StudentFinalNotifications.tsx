import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";
import { FinalNotificationThread } from "@/types";

interface StudentFinalNotificationsProps {
  threads: FinalNotificationThread[];
}

export default function StudentFinalNotifications({ threads }: StudentFinalNotificationsProps) {
  if (threads.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-lg border border-blue-200 bg-white shadow-sm dark:border-blue-900/40 dark:bg-zinc-900">
      <div className="border-b border-blue-100 px-5 py-4 dark:border-blue-900/40">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">Mensajes del docente</h2>
      </div>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {threads.map((thread) => (
          <Link
            key={thread.id}
            href={`/notificaciones/${thread.id}`}
            className={`block px-5 py-4 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/20 ${
              !thread.studentReadAt || (thread.lastMessageAt && new Date(thread.lastMessageAt).getTime() > new Date(thread.studentReadAt).getTime())
                ? "bg-blue-50/70 dark:bg-blue-950/10"
                : ""
            }`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-blue-700 dark:text-blue-300">{thread.subject}</h3>
                {(!thread.studentReadAt || (thread.lastMessageAt && new Date(thread.lastMessageAt).getTime() > new Date(thread.studentReadAt).getTime())) && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                    No leido
                  </span>
                )}
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                <FormattedDate date={thread.lastMessageAt || thread.created} showTime />
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Abrir conversacion y responder al equipo docente.
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
