"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "./pocketbase-server";
import { FinalNotificationThread } from "@/types";

function isTeacherRole(role?: unknown) {
  return role === "docente" || role === "admin";
}

function getReadPatchForAuthor(role?: unknown, now?: string) {
  const timestamp = now || new Date().toISOString();

  if (isTeacherRole(role)) {
    return {
      teacherReadAt: timestamp,
      studentReadAt: "",
    };
  }

  return {
    teacherReadAt: "",
    studentReadAt: timestamp,
  };
}

async function getThreadForStudent(studentId: string) {
  const pb = await createServerClient();

  const threads = await pb.collection("final_notification_threads").getFullList<FinalNotificationThread>({
    filter: pb.filter("student = {:studentId}", { studentId }),
    sort: "-lastMessageAt",
  });

  return threads.sort((a, b) => {
    const aTime = new Date(a.lastMessageAt || a.created).getTime();
    const bTime = new Date(b.lastMessageAt || b.created).getTime();
    return bTime - aTime;
  })[0] || null;
}

async function assertThreadAccess(threadId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) {
    return { ok: false as const, error: "No autorizado" };
  }

  const thread = await pb.collection("final_notification_threads").getOne<FinalNotificationThread>(threadId);
  const canAccess = isTeacherRole(user.role) || thread.student === user.id;

  if (!canAccess) {
    return { ok: false as const, error: "No autorizado" };
  }

  return { ok: true as const, pb, user, thread };
}

export async function sendFinalNotificationMessage(data: {
  studentId: string;
  subject: string;
  content: string;
  returnPath?: string;
}) {
  const pb = await createServerClient();
  const user = pb.authStore.model;
  const subject = data.subject.trim();
  const content = data.content.trim();

  if (!user || !isTeacherRole(user.role)) {
    return { success: false, error: "No autorizado" };
  }

  if (!data.studentId || !subject || !content) {
    return { success: false, error: "Completá asunto y mensaje antes de enviar." };
  }

  try {
    const student = await pb.collection("users").getOne(data.studentId);
    if (student.role !== "estudiante") {
      return { success: false, error: "El destinatario no es un estudiante de plataforma." };
    }

    const now = new Date().toISOString();
    let thread = await getThreadForStudent(data.studentId);

    if (!thread) {
      thread = await pb.collection("final_notification_threads").create<FinalNotificationThread>({
        student: data.studentId,
        subject,
        status: "open",
        createdBy: user.id,
        lastMessageAt: now,
        teacherReadAt: now,
        studentReadAt: "",
      });
    } else {
      thread = await pb.collection("final_notification_threads").update<FinalNotificationThread>(thread.id, {
        subject,
        status: "open",
        lastMessageAt: now,
        teacherReadAt: now,
        studentReadAt: "",
      });
    }

    await pb.collection("final_notification_messages").create({
      thread: thread.id,
      student: data.studentId,
      author: user.id,
      content,
    });

    revalidatePath("/");
    revalidatePath("/gestion-notificaciones");
    revalidatePath(`/gestion-notificaciones/platform/${data.studentId}`);
    if (data.returnPath) revalidatePath(data.returnPath);

    return { success: true, threadId: thread.id };
  } catch (error: any) {
    console.error("Error sending final notification message:", error);
    return { success: false, error: error?.message || "No se pudo enviar el mensaje." };
  }
}

export async function replyFinalNotificationThread(data: {
  threadId: string;
  content: string;
  returnPath?: string;
}) {
  const content = data.content.trim();

  if (!data.threadId || !content) {
    return { success: false, error: "Escribí un mensaje antes de responder." };
  }

  try {
    const access = await assertThreadAccess(data.threadId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    const now = new Date().toISOString();
    await access.pb.collection("final_notification_messages").create({
      thread: access.thread.id,
      student: access.thread.student,
      author: access.user.id,
      content,
    });
    await access.pb.collection("final_notification_threads").update(access.thread.id, {
      status: "open",
      lastMessageAt: now,
      ...getReadPatchForAuthor(access.user.role, now),
    });

    revalidatePath("/");
    revalidatePath(`/notificaciones/${access.thread.id}`);
    revalidatePath(`/gestion-notificaciones/platform/${access.thread.student}`);
    if (data.returnPath) revalidatePath(data.returnPath);

    return { success: true };
  } catch (error: any) {
    console.error("Error replying final notification thread:", error);
    return { success: false, error: error?.message || "No se pudo enviar la respuesta." };
  }
}

export async function setFinalNotificationThreadReadState(data: {
  threadId: string;
  read: boolean;
  returnPath?: string;
}) {
  try {
    const access = await assertThreadAccess(data.threadId);
    if (!access.ok) {
      return { success: false, error: access.error };
    }

    const readField = isTeacherRole(access.user.role) ? "teacherReadAt" : "studentReadAt";
    await access.pb.collection("final_notification_threads").update(access.thread.id, {
      [readField]: data.read ? new Date().toISOString() : "",
    });

    revalidatePath("/");
    revalidatePath(`/notificaciones/${access.thread.id}`);
    revalidatePath(`/gestion-notificaciones/platform/${access.thread.student}`);
    if (data.returnPath) revalidatePath(data.returnPath);

    return { success: true };
  } catch (error: any) {
    console.error("Error updating final notification read state:", error);
    return { success: false, error: error?.message || "No se pudo actualizar el estado del mensaje." };
  }
}
