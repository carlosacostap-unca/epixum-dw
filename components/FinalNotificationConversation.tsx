"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { replyFinalNotificationThread, setFinalNotificationThreadReadState } from "@/lib/actions-notifications";
import FormattedDate from "@/components/FormattedDate";
import { FinalNotificationMessage, FinalNotificationThread, User } from "@/types";

interface FinalNotificationConversationProps {
  thread: FinalNotificationThread | null;
  messages: FinalNotificationMessage[];
  currentUser: User;
  returnPath: string;
}

function getAuthorName(message: FinalNotificationMessage) {
  return message.expand?.author?.name || message.expand?.author?.email || "Usuario";
}

function isTeacherMessage(message: FinalNotificationMessage) {
  const role = message.expand?.author?.role;
  return role === "docente" || role === "admin";
}

function isTeacherRole(role?: string) {
  return role === "docente" || role === "admin";
}

function getReadAtForUser(thread: FinalNotificationThread, currentUser: User) {
  return isTeacherRole(currentUser.role) ? thread.teacherReadAt : thread.studentReadAt;
}

function isUnreadForUser(thread: FinalNotificationThread, currentUser: User) {
  const readAt = getReadAtForUser(thread, currentUser);
  if (!thread.lastMessageAt) {
    return false;
  }

  if (!readAt) {
    return true;
  }

  return new Date(thread.lastMessageAt).getTime() > new Date(readAt).getTime();
}

export default function FinalNotificationConversation({
  thread,
  messages,
  currentUser,
  returnPath,
}: FinalNotificationConversationProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isReadPending, startReadTransition] = useTransition();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!thread || !content.trim()) {
      return;
    }

    startTransition(async () => {
      const result = await replyFinalNotificationThread({
        threadId: thread.id,
        content,
        returnPath,
      });

      if (result.success) {
        setContent("");
        router.refresh();
      } else {
        setError(result.error || "No se pudo enviar la respuesta.");
      }
    });
  }

  function handleReadStateChange(read: boolean) {
    if (!thread) {
      return;
    }

    setError("");
    startReadTransition(async () => {
      const result = await setFinalNotificationThreadReadState({
        threadId: thread.id,
        read,
        returnPath,
      });

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "No se pudo actualizar el estado.");
      }
    });
  }

  if (!thread) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">Conversacion</h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Todavia no se envio un mensaje interno a este estudiante.
        </p>
      </section>
    );
  }

  const unread = isUnreadForUser(thread, currentUser);
  const readAt = getReadAtForUser(thread, currentUser);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Conversacion</p>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  unread
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                }`}
              >
                {unread ? "No leido" : "Leido"}
              </span>
            </div>
            <h2 className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-100">{thread.subject}</h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span>
                Ultimo mensaje: <FormattedDate date={thread.lastMessageAt || thread.created} showTime />
              </span>
              {readAt && (
                <span>
                  Leido: <FormattedDate date={readAt} showTime />
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleReadStateChange(true)}
              disabled={isReadPending || !unread}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Marcar leido
            </button>
            <button
              type="button"
              onClick={() => handleReadStateChange(false)}
              disabled={isReadPending || unread}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Marcar no leido
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay mensajes todavia.</p>
        ) : (
          messages.map((message) => {
            const fromCurrentUser = message.author === currentUser.id;
            const teacherMessage = isTeacherMessage(message);

            return (
              <div
                key={message.id}
                className={`rounded-lg border p-4 ${
                  teacherMessage
                    ? "border-blue-100 bg-blue-50/60 dark:border-blue-900/30 dark:bg-blue-950/20"
                    : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                      {getAuthorName(message)}
                    </span>
                    {teacherMessage && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                        Docente
                      </span>
                    )}
                    {fromCurrentUser && (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        Vos
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Fecha y hora:</span>
                    <FormattedDate date={message.created} showTime />
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                  {message.content}
                </p>
              </div>
            );
          })
        )}

        <form onSubmit={handleSubmit} className="grid gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Responder</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={4}
              className="resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 shadow-sm outline-none transition-colors focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              placeholder="Escribi tu respuesta..."
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isPending || !content.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Enviando..." : "Responder"}
            </button>
            {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
          </div>
        </form>
      </div>
    </section>
  );
}
