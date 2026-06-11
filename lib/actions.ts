"use server";

import { createServerClient } from "@/lib/pocketbase-server";
import { revalidatePath } from "next/cache";
import { getPresignedUploadUrl, getPresignedDownloadUrl, configureBucketCors } from "./s3";
import {
  generateAIEvaluation,
  generateMultipleChoiceQuestionsFromUnitDocument,
  generateMultipleChoiceQuestionsFromUnitPrompt,
} from "./ai";
import {
  Assignment,
  PartialExam,
  PartialExamAttempt,
  PartialExamQuestion,
  PartialExamSimulation,
  PartialExamSimulationFinishReason,
  PartialExamStatus,
  PartialExamTurn,
  FinalProjectPresentationSlot,
  FinalProjectMemberEvaluationRating,
  FinalProjectPresentationSlotReservation,
  TeamMember,
  TeamValidationStatus,
} from "@/types";
import PocketBase from "pocketbase";
import { getDeliveryLimitDate } from "./delivery-deadlines";
import { getPartialExamAvailability } from "./partial-exam-availability";
import { normalizeRelationIds, PARTIAL_EXAM_QUESTION_COUNT } from "./partial-exam-rules";
import { getFinalProjectResourceDefinition } from "./final-project-resources";
import { isFinalProjectEvaluatorRole, isTeacherRole } from "./roles";

type PartialExamPayload = {
  title: string;
  description: string;
  topics: string;
  status: PartialExamStatus;
  startsAt?: string;
  endsAt?: string;
  questionBanks?: string[];
};

type PartialExamTurnPayload = {
  id?: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

export async function ensureCorsConfigured() {
  try {
    const success = await configureBucketCors();
    return { success };
  } catch (error) {
    console.error("Failed to configure CORS:", error);
    return { success: false, error: String(error) };
  }
}

async function createAdminClient() {
  const url = process.env['NEXT_PUBLIC_POCKETBASE_URL'];
  const email = process.env['POCKETBASE_ADMIN'];
  const password = process.env['POCKETBASE_PASSWORD'];

  if (!url || !email || !password) {
    throw new Error("PocketBase admin credentials are not configured");
  }

  const adminPb = new PocketBase(url);
  try {
    await adminPb.collection('_superusers').authWithPassword(email, password);
  } catch {
    await (adminPb as any).admins.authWithPassword(email, password);
  }
  return adminPb;
}

async function createAdministrativeClient(authenticatedPb: PocketBase) {
  try {
    return await createAdminClient();
  } catch (error) {
    console.error("Falling back to authenticated PocketBase client for administrative approval:", error);
    return authenticatedPb;
  }
}

async function countQuestionsForBanks(pb: PocketBase, bankIds: string[]) {
  if (bankIds.length === 0) return 0;

  const unitFilter = bankIds.map((unitId) => pb.filter('unit = {:unitId}', { unitId })).join(' || ');
  const questions = await pb.collection('partial_exam_questions').getFullList<PartialExamQuestion>({
    filter: `(${unitFilter})`,
    fields: 'id',
  });

  return questions.length;
}

async function validatePartialExamBanks(pb: PocketBase, bankIds: string[]) {
  if (bankIds.length === 0) {
    return 'Selecciona al menos un banco de preguntas para el parcial.';
  }

  const questionCount = await countQuestionsForBanks(pb, bankIds);
  if (questionCount < PARTIAL_EXAM_QUESTION_COUNT) {
    return `Los bancos seleccionados deben tener al menos ${PARTIAL_EXAM_QUESTION_COUNT} preguntas cargadas. Actualmente tienen ${questionCount}.`;
  }

  return null;
}

function getPartialExamTurnPayloads(formData: FormData) {
  const ids = formData.getAll('turnIds').map(String);
  const names = formData.getAll('turnNames').map(String);
  const startsAtValues = formData.getAll('turnStartsAt').map(String);
  const endsAtValues = formData.getAll('turnEndsAt').map(String);
  const rowCount = Math.max(names.length, startsAtValues.length, endsAtValues.length);
  const turns: PartialExamTurnPayload[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const name = (names[index] || '').trim();
    const startsAt = (startsAtValues[index] || '').trim();
    const endsAt = (endsAtValues[index] || '').trim();
    const id = (ids[index] || '').trim();

    if (!name && !startsAt && !endsAt) continue;

    if (!name || !startsAt || !endsAt) {
      throw new Error('Completa el nombre, inicio y finalización de cada turno.');
    }

    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      throw new Error('La fecha de finalización de cada turno debe ser posterior al inicio.');
    }

    turns.push({
      ...(id ? { id } : {}),
      name,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    });
  }

  if (turns.length === 0) {
    throw new Error('Agrega al menos un turno para el parcial.');
  }

  return turns;
}

async function getPartialExamTurnsForAction(pb: PocketBase, partialExamId: string) {
  try {
    return await pb.collection('partial_exam_turns').getFullList<PartialExamTurn>({
      filter: pb.filter('partialExam = {:partialExamId}', { partialExamId }),
      sort: 'startsAt',
    });
  } catch (error) {
    console.error('Failed to fetch partial exam turns:', error);
    return [];
  }
}

async function syncPartialExamTurns(pb: PocketBase, partialExamId: string, turns: PartialExamTurnPayload[]) {
  const existingTurns = await getPartialExamTurnsForAction(pb, partialExamId);
  const submittedIds = new Set(turns.map((turn) => turn.id).filter(Boolean));

  for (const turn of turns) {
    const data = {
      partialExam: partialExamId,
      name: turn.name,
      startsAt: turn.startsAt,
      endsAt: turn.endsAt,
    };

    if (turn.id && existingTurns.some((existingTurn) => existingTurn.id === turn.id)) {
      await pb.collection('partial_exam_turns').update(turn.id, data);
    } else {
      await pb.collection('partial_exam_turns').create(data);
    }
  }

  for (const existingTurn of existingTurns) {
    if (!submittedIds.has(existingTurn.id)) {
      await pb.collection('partial_exam_turns').delete(existingTurn.id);
    }
  }
}

function withTurns(partialExam: PartialExam, turns: PartialExamTurn[]) {
  return {
    ...partialExam,
    turns,
  };
}

function isAdministrativeApprovalAssignment(assignment: Pick<Assignment, 'title'>) {
  return assignment.title?.trim().toLowerCase() === 'cuestionario 1';
}

async function getFeedbackTeacherId(adminPb: PocketBase, userId?: string) {
  if (!userId) return undefined;

  try {
    const teacher = await adminPb.collection('users').getOne(userId, {
      fields: 'id,role',
    });

    return teacher.role === 'docente' || teacher.role === 'admin' ? teacher.id : undefined;
  } catch {
    return undefined;
  }
}

async function createApprovalFeedback(
  adminPb: PocketBase,
  data: {
    deliveryId: string;
    assignmentId: string;
    studentId: string;
    teacherId?: string;
    feedback: string;
    sentAt?: string;
  }
) {
  try {
    await adminPb.collection('delivery_feedbacks').create({
      delivery: data.deliveryId,
      assignment: data.assignmentId,
      student: data.studentId,
      grade: 10,
      feedback: data.feedback,
      verdict: 'Aprobado',
      sentAt: data.sentAt || new Date().toISOString(),
      ...(data.teacherId ? { teacher: data.teacherId } : {}),
    });

    return true;
  } catch (error) {
    console.error('Failed to create administrative approval feedback:', error);
    return false;
  }
}

export async function getUploadUrl(filename: string, fileType: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || user.role !== 'estudiante') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const { url, fields } = await getPresignedUploadUrl(filename, fileType);
    return { success: true, url, fields };
  } catch (error) {
    console.error('Failed to get upload URL:', error);
    return { success: false, error: 'Failed to get upload URL' };
  }
}

export async function getResourceUploadUrl(filename: string, fileType: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const { url, fields } = await getPresignedUploadUrl(filename, fileType);
    return { success: true, url, fields };
  } catch (error) {
    console.error('Failed to get resource upload URL:', error);
    return { success: false, error: 'Failed to get resource upload URL' };
  }
}

export async function getResourceDownloadUrl(linkId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const link = await pb.collection('links').getOne(linkId);

    // Extract key from url
    // Assuming url is like https://endpoint/bucket/filename.ext or just filename
    let key = link.url;
    if (link.url.startsWith('http')) {
        const urlObj = new URL(link.url);
        key = decodeURIComponent(urlObj.pathname.split('/').pop() || '');
    }

    if (!key) {
        return { success: false, error: 'Invalid file key' };
    }

    const downloadUrl = await getPresignedDownloadUrl(key);
    return { success: true, url: downloadUrl };

  } catch (error) {
    console.error('Failed to get resource download URL:', error);
    return { success: false, error: 'Failed to get resource download URL' };
  }
}

export async function getDeliveryDownloadUrl(deliveryId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const delivery = await pb.collection('deliveries').getOne(deliveryId);

    // Check permissions: Student can access their own, Teacher/Admin can access all
    if (user.role === 'estudiante' && delivery.student !== user.id) {
        return { success: false, error: 'Unauthorized access to delivery' };
    }

    // Extract key from repositoryUrl
    // Assuming repositoryUrl is like https://endpoint/bucket/filename.zip
    const url = new URL(delivery.repositoryUrl);
    const key = decodeURIComponent(url.pathname.split('/').pop() || '');

    if (!key) {
        return { success: false, error: 'Invalid file key' };
    }

    const downloadUrl = await getPresignedDownloadUrl(key);
    return { success: true, url: downloadUrl };

  } catch (error) {
    console.error('Failed to get download URL:', error);
    return { success: false, error: 'Failed to get download URL' };
  }
}

export async function updateUserRole(userId: string, role: string) {
  const pb = await createServerClient();
  const allowedRoles = ['estudiante', 'docente', 'docente_invitado', 'admin'];
  
  // Verify current user is admin
  if (!pb.authStore.isValid || pb.authStore.model?.role !== 'admin') {
    throw new Error("Unauthorized");
  }

  if (!allowedRoles.includes(role)) {
    return { success: false, error: 'Rol no válido' };
  }

  try {
    await pb.collection('users').update(userId, { role });
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Failed to update role:', error);
    return { success: false, error: 'Failed to update role' };
  }
}

function canManageTeams(user: { role?: unknown } | null | undefined) {
  return isTeacherRole(user?.role);
}

const FINAL_PROJECT_SLOT_DURATION_MINUTES = 15;

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

async function getCurrentStudentTeamId(pb: PocketBase, studentId: string) {
  const memberships = await pb.collection('team_members').getFullList<TeamMember>({
    filter: pb.filter('student = {:studentId}', { studentId }),
  });

  return memberships[0]?.team || '';
}

async function getReservedSlotForTeam(pb: PocketBase, teamId: string) {
  const reservations = await pb.collection('final_project_slot_reservations').getFullList<FinalProjectPresentationSlotReservation>({
    filter: pb.filter('team = {:teamId}', { teamId }),
    expand: 'slot',
  });

  if (reservations[0]?.expand?.slot) {
    return reservations[0].expand.slot;
  }

  const legacySlots = await pb.collection('final_project_presentation_slots').getFullList<FinalProjectPresentationSlot>({
    filter: pb.filter('team = {:teamId}', { teamId }),
  });

  return legacySlots[0] || null;
}

async function getFinalProjectSlotReservation(pb: PocketBase, slotId: string) {
  const reservations = await pb.collection('final_project_slot_reservations').getFullList<FinalProjectPresentationSlotReservation>({
    filter: pb.filter('slot = {:slotId}', { slotId }),
  });

  return reservations[0] || null;
}

export async function createFinalProjectPresentationSlot(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model as { role?: unknown } | null;

  if (!canManageTeams(user)) {
    return { success: false, error: 'Solo los docentes pueden gestionar turnos.' };
  }

  const startsAtValue = String(formData.get('startsAt') || '').trim();
  if (!startsAtValue) {
    return { success: false, error: 'Indica la fecha y hora de inicio del turno.' };
  }

  const startsAt = new Date(startsAtValue);
  if (Number.isNaN(startsAt.getTime())) {
    return { success: false, error: 'La fecha y hora del turno no es válida.' };
  }

  const endsAt = addMinutes(startsAt, FINAL_PROJECT_SLOT_DURATION_MINUTES);

  try {
    const dataPb = await createAdministrativeClient(pb);
    await dataPb.collection('final_project_presentation_slots').create({
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });

    revalidatePath('/proyecto-final');
    revalidatePath('/mi-equipo');
    return { success: true };
  } catch (error) {
    console.error('Failed to create final project presentation slot:', error);
    return { success: false, error: 'No se pudo crear el turno. Verifica que no exista otro turno con el mismo inicio.' };
  }
}

export async function deleteFinalProjectPresentationSlot(slotId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model as { role?: unknown } | null;

  if (!canManageTeams(user)) {
    return { success: false, error: 'Solo los docentes pueden eliminar turnos.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    const reservation = await getFinalProjectSlotReservation(dataPb, slotId);
    if (reservation) {
      await dataPb.collection('final_project_slot_reservations').delete(reservation.id);
    }

    await dataPb.collection('final_project_presentation_slots').delete(slotId);

    revalidatePath('/proyecto-final');
    revalidatePath('/mi-equipo');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete final project presentation slot:', error);
    return { success: false, error: 'No se pudo eliminar el turno.' };
  }
}

export async function releaseFinalProjectPresentationSlot(slotId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model as { role?: unknown } | null;

  if (!canManageTeams(user)) {
    return { success: false, error: 'Solo los docentes pueden liberar turnos.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    const reservation = await getFinalProjectSlotReservation(dataPb, slotId);
    if (reservation) {
      await dataPb.collection('final_project_slot_reservations').delete(reservation.id);
    }

    await dataPb.collection('final_project_presentation_slots').update(slotId, {
      team: null,
      reservedBy: null,
      reservedAt: null,
    });

    revalidatePath('/proyecto-final');
    revalidatePath('/mi-equipo');
    return { success: true };
  } catch (error) {
    console.error('Failed to release final project presentation slot:', error);
    return { success: false, error: 'No se pudo liberar el turno.' };
  }
}

export async function reserveFinalProjectPresentationSlot(slotId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model as { id?: string; role?: unknown } | null;

  if (!user?.id || user.role !== 'estudiante') {
    return { success: false, error: 'Solo los estudiantes pueden reservar un turno.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    const teamId = await getCurrentStudentTeamId(dataPb, user.id);

    if (!teamId) {
      return { success: false, error: 'Necesitas tener un equipo asignado para reservar un turno.' };
    }

    const existingReservation = await getReservedSlotForTeam(dataPb, teamId);
    if (existingReservation && existingReservation.id !== slotId) {
      return { success: false, error: 'Tu equipo ya tiene un turno reservado.' };
    }

    const slot = await dataPb.collection('final_project_presentation_slots').getOne<FinalProjectPresentationSlot>(slotId);
    const reservation = await getFinalProjectSlotReservation(dataPb, slotId);
    if ((reservation?.team && reservation.team !== teamId) || (slot.team && slot.team !== teamId)) {
      return { success: false, error: 'Ese turno ya fue reservado por otro equipo.' };
    }

    const reservedAt = new Date().toISOString();

    try {
      await dataPb.collection('final_project_slot_reservations').create({
        slot: slotId,
        team: teamId,
        reservedBy: user.id,
        reservedAt,
      });
    } catch (error) {
      const currentReservation = await getFinalProjectSlotReservation(dataPb, slotId);
      if (currentReservation?.team === teamId) {
        return { success: false, error: 'Tu equipo ya tiene este turno reservado.' };
      }

      console.error('Failed to create final project slot reservation:', error);
      return { success: false, error: 'Ese turno ya fue reservado por otro equipo.' };
    }

    try {
      await dataPb.collection('final_project_presentation_slots').update(slotId, {
        team: teamId,
        reservedBy: user.id,
        reservedAt,
      });
    } catch (error) {
      console.error('Failed to sync final project presentation slot reservation:', error);
    }

    revalidatePath('/proyecto-final');
    revalidatePath('/mi-equipo');
    return { success: true };
  } catch (error) {
    console.error('Failed to reserve final project presentation slot:', error);
    return { success: false, error: 'No se pudo reservar el turno.' };
  }
}

export async function cancelFinalProjectPresentationSlotReservation(slotId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model as { id?: string; role?: unknown } | null;

  if (!user?.id || user.role !== 'estudiante') {
    return { success: false, error: 'Solo los estudiantes pueden cancelar una reserva.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    const teamId = await getCurrentStudentTeamId(dataPb, user.id);
    const slot = await dataPb.collection('final_project_presentation_slots').getOne<FinalProjectPresentationSlot>(slotId);
    const reservation = await getFinalProjectSlotReservation(dataPb, slotId);

    if (!teamId || (reservation ? reservation.team !== teamId : slot.team !== teamId)) {
      return { success: false, error: 'Solo podés cancelar el turno reservado por tu equipo.' };
    }

    if (reservation) {
      await dataPb.collection('final_project_slot_reservations').delete(reservation.id);
    }

    await dataPb.collection('final_project_presentation_slots').update(slotId, {
      team: null,
      reservedBy: null,
      reservedAt: null,
    });

    revalidatePath('/proyecto-final');
    revalidatePath('/mi-equipo');
    return { success: true };
  } catch (error) {
    console.error('Failed to cancel final project presentation slot reservation:', error);
    return { success: false, error: 'No se pudo cancelar la reserva.' };
  }
}
export async function saveFinalProjectTeamResource(formData: FormData) {
  const maxFileSizeBytes = 50 * 1024 * 1024;
  const pb = await createServerClient();
  const user = pb.authStore.model as { id?: string; role?: unknown } | null;

  if (!user?.id || user.role !== 'estudiante') {
    return { success: false, error: 'Solo los estudiantes pueden cargar recursos del proyecto final.' };
  }

  const resourceKey = String(formData.get('resourceKey') || '').trim();
  const definition = getFinalProjectResourceDefinition(resourceKey);

  if (!definition) {
    return { success: false, error: 'El recurso solicitado no es válido.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    const teamId = await getCurrentStudentTeamId(dataPb, user.id);

    if (!teamId) {
      return { success: false, error: 'Necesitas tener un equipo asignado para cargar recursos.' };
    }

    const existingRecords = await dataPb.collection('final_project_team_resources').getFullList({
      filter: dataPb.filter('team = {:teamId} && resourceKey = {:resourceKey}', { teamId, resourceKey }),
    });
    const existingRecord = existingRecords[0] || null;
    const submittedAt = new Date().toISOString();
    const payload: Record<string, unknown> = {
      team: teamId,
      resourceKey: definition.key,
      moduleName: definition.moduleName,
      title: definition.title,
      kind: definition.kind,
      submittedBy: user.id,
      submittedAt,
    };

    if (definition.kind === 'url') {
      const url = String(formData.get('url') || '').trim();
      if (!url) {
        return { success: false, error: 'Ingresa la URL del recurso.' };
      }

      try {
        new URL(url);
      } catch {
        return { success: false, error: 'Ingresa una URL válida.' };
      }

      payload.url = url;
    } else {
      const file = formData.get('file') as File | null;
      if (!file || file.size === 0) {
        return { success: false, error: 'Selecciona un archivo para subir.' };
      }

      if (file.size > maxFileSizeBytes) {
        return { success: false, error: 'El archivo no puede superar los 50 MB.' };
      }

      payload.file = file;
      payload.originalName = file.name;
    }

    if (existingRecord) {
      await dataPb.collection('final_project_team_resources').update(existingRecord.id, payload);
    } else {
      await dataPb.collection('final_project_team_resources').create(payload);
    }

    revalidatePath('/mi-equipo');
    revalidatePath('/proyecto-final');
    return { success: true };
  } catch (error) {
    console.error('Failed to save final project team resource:', error);
    return { success: false, error: 'No se pudo guardar el recurso.' };
  }
}

export async function deleteFinalProjectTeamResource(resourceId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model as { role?: unknown } | null;

  if (!canManageTeams(user)) {
    return { success: false, error: 'Solo los docentes pueden eliminar recursos del proyecto final.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    await dataPb.collection('final_project_team_resources').delete(resourceId);

    revalidatePath('/mi-equipo');
    revalidatePath('/proyecto-final');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete final project team resource:', error);
    return { success: false, error: 'No se pudo eliminar el recurso.' };
  }
}

export async function saveFinalProjectMemberEvaluations(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model as { id?: string; role?: unknown } | null;

  if (!user?.id || !isFinalProjectEvaluatorRole(user.role)) {
    return { success: false, error: 'Solo los docentes pueden guardar evaluaciones del proyecto final.' };
  }

  const slotId = String(formData.get('slotId') || '').trim();
  const teamId = String(formData.get('teamId') || '').trim();
  const studentIds = formData.getAll('studentIds').map((value) => String(value).trim()).filter(Boolean);
  const allowedRatings: FinalProjectMemberEvaluationRating[] = ['excellent', 'very_good', 'good', 'regular', 'insufficient'];

  if (!slotId || !teamId || studentIds.length === 0) {
    return { success: false, error: 'Faltan datos para guardar la evaluación.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    const [slot, memberships, existingEvaluations] = await Promise.all([
      dataPb.collection('final_project_presentation_slots').getOne<FinalProjectPresentationSlot>(slotId),
      dataPb.collection('team_members').getFullList<TeamMember>({
        filter: dataPb.filter('team = {:teamId}', { teamId }),
      }),
      dataPb.collection('final_project_member_evaluations').getFullList({
        filter: dataPb.filter(
          'slot = {:slotId} && evaluatedBy = {:evaluatedBy}',
          { slotId, evaluatedBy: user.id },
        ),
      }),
    ]);

    if (slot.team && slot.team !== teamId) {
      return { success: false, error: 'El turno no corresponde al equipo indicado.' };
    }

    const teamStudentIds = new Set(memberships.map((membership) => membership.student));
    if (studentIds.some((studentId) => !teamStudentIds.has(studentId))) {
      return { success: false, error: 'Hay estudiantes que no pertenecen a este equipo.' };
    }

    const existingByStudent = new Map(existingEvaluations.map((evaluation: any) => [evaluation.student, evaluation]));
    const evaluatedAt = new Date().toISOString();

    for (const studentId of studentIds) {
      const rating = String(formData.get(`rating_${studentId}`) || '').trim() as FinalProjectMemberEvaluationRating | '';
      if (rating && !allowedRatings.includes(rating)) {
        return { success: false, error: 'La evaluación seleccionada no es válida.' };
      }

      const payload = {
        slot: slotId,
        team: teamId,
        student: studentId,
        evaluatedBy: user.id,
        present: formData.get(`present_${studentId}`) === 'on',
        exposed: formData.get(`exposed_${studentId}`) === 'on',
        rating: rating || '',
        notes: String(formData.get(`notes_${studentId}`) || '').trim(),
        evaluatedAt,
      };
      const existingEvaluation = existingByStudent.get(studentId) as { id?: string } | undefined;

      if (existingEvaluation?.id) {
        await dataPb.collection('final_project_member_evaluations').update(existingEvaluation.id, payload);
      } else {
        await dataPb.collection('final_project_member_evaluations').create(payload);
      }
    }

    revalidatePath(`/proyecto-final/turnos/${slotId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to save final project member evaluation:', error);
    return { success: false, error: 'No se pudo guardar la evaluación.' };
  }
}

function normalizeTeamPayload(formData: FormData) {
  const name = (formData.get('name') as string | null)?.trim() || '';
  const description = (formData.get('description') as string | null)?.trim() || '';

  return { name, description };
}

export async function createTeam(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model as { role?: unknown } | null;

  if (!canManageTeams(user)) {
    return { success: false, error: 'Solo los docentes pueden gestionar equipos.' };
  }

  const data = normalizeTeamPayload(formData);
  if (!data.name) {
    return { success: false, error: 'El nombre del equipo es obligatorio.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    await dataPb.collection('teams').create(data);
    revalidatePath('/');
    revalidatePath('/equipos');
    return { success: true };
  } catch (error) {
    console.error('Failed to create team:', error);
    return { success: false, error: 'No se pudo crear el equipo.' };
  }
}

export async function updateTeam(teamId: string, formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model as { role?: unknown } | null;

  if (!canManageTeams(user)) {
    return { success: false, error: 'Solo los docentes pueden gestionar equipos.' };
  }

  const data = normalizeTeamPayload(formData);
  if (!data.name) {
    return { success: false, error: 'El nombre del equipo es obligatorio.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    await dataPb.collection('teams').update(teamId, data);
    revalidatePath('/equipos');
    return { success: true };
  } catch (error) {
    console.error('Failed to update team:', error);
    return { success: false, error: 'No se pudo actualizar el equipo.' };
  }
}

export async function deleteTeam(teamId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model as { role?: unknown } | null;

  if (!canManageTeams(user)) {
    return { success: false, error: 'Solo los docentes pueden gestionar equipos.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    const memberships = await dataPb.collection('team_members').getFullList({
      filter: dataPb.filter('team = {:teamId}', { teamId }),
    });

    for (const membership of memberships) {
      await dataPb.collection('team_members').delete(membership.id);
    }

    await dataPb.collection('teams').delete(teamId);
    revalidatePath('/');
    revalidatePath('/equipos');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete team:', error);
    return { success: false, error: 'No se pudo eliminar el equipo.' };
  }
}

export async function assignStudentToTeam(studentId: string, teamId: string | null) {
  const pb = await createServerClient();
  const user = pb.authStore.model as { role?: unknown } | null;

  if (!canManageTeams(user)) {
    return { success: false, error: 'Solo los docentes pueden asignar estudiantes a equipos.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    const student = await dataPb.collection('users').getOne(studentId, {
      fields: 'id,role',
    });

    if (student.role !== 'estudiante') {
      return { success: false, error: 'Solo se pueden asignar estudiantes.' };
    }

    const currentMemberships = await dataPb.collection('team_members').getFullList({
      filter: dataPb.filter('student = {:studentId}', { studentId }),
    });

    if (!teamId) {
      for (const membership of currentMemberships) {
        await dataPb.collection('team_members').delete(membership.id);
      }
      revalidatePath('/equipos');
      revalidatePath(`/students/${studentId}`);
      return { success: true };
    }

    await dataPb.collection('teams').getOne(teamId, { fields: 'id' });

    const [currentMembership, ...duplicateMemberships] = currentMemberships;
    for (const membership of duplicateMemberships) {
      await dataPb.collection('team_members').delete(membership.id);
    }

    if (currentMembership) {
      if (currentMembership.team !== teamId) {
        await dataPb.collection('team_members').update(currentMembership.id, {
          team: teamId,
        });
      }
    } else {
      await dataPb.collection('team_members').create({
        team: teamId,
        student: studentId,
      });
    }

    revalidatePath('/equipos');
    revalidatePath(`/students/${studentId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to assign student to team:', error);
    return { success: false, error: 'No se pudo actualizar la asignación del estudiante.' };
  }
}

const teamValidationStatuses = new Set<TeamValidationStatus>([
  'correct',
  'wrong_team',
  'missing_member',
  'extra_member',
  'no_team',
  'other',
]);

export async function submitTeamValidationResponse(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model as { id?: string; role?: unknown } | null;

  if (!user?.id || user.role !== 'estudiante') {
    return { success: false, error: 'Solo los estudiantes pueden validar su equipo.' };
  }

  const status = String(formData.get('status') || '') as TeamValidationStatus;
  const details = String(formData.get('details') || '').trim();

  if (!teamValidationStatuses.has(status)) {
    return { success: false, error: 'Selecciona una opción válida.' };
  }

  if (status !== 'correct' && !details) {
    return { success: false, error: 'Describe brevemente que hay que corregir.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    const memberships = await dataPb.collection('team_members').getFullList<TeamMember>({
      filter: dataPb.filter('student = {:studentId}', { studentId: user.id }),
    });
    const currentTeamId = memberships[0]?.team || '';
    const existingResponses = await dataPb.collection('team_validation_responses').getFullList({
      filter: dataPb.filter('student = {:studentId}', { studentId: user.id }),
    });
    const payload = {
      student: user.id,
      team: currentTeamId || null,
      status,
      details,
      submittedAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null,
    };

    if (existingResponses[0]) {
      await dataPb.collection('team_validation_responses').update(existingResponses[0].id, payload);
    } else {
      await dataPb.collection('team_validation_responses').create(payload);
    }

    revalidatePath('/');
    revalidatePath('/equipos');
    return { success: true };
  } catch (error) {
    console.error('Failed to submit team validation response:', error);
    return { success: false, error: 'No se pudo guardar la respuesta.' };
  }
}

export async function resolveTeamValidationResponse(responseId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model as { id?: string; role?: unknown } | null;

  if (!user?.id || !canManageTeams(user)) {
    return { success: false, error: 'Solo los docentes pueden marcar solicitudes como resueltas.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    await dataPb.collection('team_validation_responses').update(responseId, {
      resolvedAt: new Date().toISOString(),
      resolvedBy: user.id,
    });

    revalidatePath('/');
    revalidatePath('/equipos');
    return { success: true };
  } catch (error) {
    console.error('Failed to resolve team validation response:', error);
    return { success: false, error: 'No se pudo marcar la solicitud como resuelta.' };
  }
}

// Classes

export async function createClass(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const date = formData.get('date') as string;

  if (!title) {
     return { success: false, error: 'Title is required' };
  }

  try {
    const data: any = {
      title,
      description,
      date: date ? new Date(date).toISOString() : null,
    };
    
    await pb.collection('classes').create(data);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to create class:', error);
    return { success: false, error: 'Failed to create class' };
  }
}

export async function updateClass(classId: string, formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const date = formData.get('date') as string;

  try {
    const data: any = {
      title,
      description,
    };
    if (date) data.date = new Date(date).toISOString();

    await pb.collection('classes').update(classId, data);
    
    revalidatePath('/');
    revalidatePath(`/classes/${classId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update class:', error);
    return { success: false, error: 'Failed to update class' };
  }
}

export async function deleteClass(classId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  try {
    await pb.collection('classes').delete(classId);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete class:', error);
    return { success: false, error: 'Failed to delete class' };
  }
}

// Assignments

export async function createAssignment(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const dueDate = formData.get('dueDate') as string;
  const correctionDueDate = formData.get('correctionDueDate') as string;
  const type = formData.get('type') as string;
  const questionsStr = formData.get('questions') as string;
  const aiPrompt = formData.get('aiPrompt') as string;

  if (!title) {
     return { success: false, error: 'Title is required' };
  }

  try {
    const data: any = {
      title,
      description,
      type,
    };
    if (dueDate) data.dueDate = new Date(dueDate).toISOString();
    if (correctionDueDate) data.correctionDueDate = new Date(correctionDueDate).toISOString();
    if (aiPrompt) data.aiPrompt = aiPrompt;
    if (questionsStr) {
      try {
        data.questions = JSON.parse(questionsStr);
      } catch (e) {
        console.error('Failed to parse questions:', e);
      }
    }
    
    await pb.collection('assignments').create(data);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to create assignment:', error);
    return { success: false, error: 'Failed to create assignment' };
  }
}

export async function updateAssignment(assignmentId: string, formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const dueDate = formData.get('dueDate') as string;
  const correctionDueDate = formData.get('correctionDueDate') as string;
  const type = formData.get('type') as string;
  const questionsStr = formData.get('questions') as string;
  const aiPrompt = formData.get('aiPrompt') as string;

  try {
    const data: any = {
      title,
      description,
      type,
    };
    
    // Explicitly update aiPrompt, clearing it if not present
    data.aiPrompt = aiPrompt || "";

    if (dueDate) data.dueDate = new Date(dueDate).toISOString();
    else data.dueDate = ""; // clear if removed

    if (correctionDueDate) data.correctionDueDate = new Date(correctionDueDate).toISOString();
    else data.correctionDueDate = ""; // clear if removed

    if (questionsStr) {
      try {
        data.questions = JSON.parse(questionsStr);
      } catch (e) {
        console.error('Failed to parse questions:', e);
      }
    }

    await pb.collection('assignments').update(assignmentId, data);
    
    revalidatePath('/');
    revalidatePath(`/assignments/${assignmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update assignment:', error);
    return { success: false, error: 'Failed to update assignment' };
  }
}

export async function deleteAssignment(assignmentId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  try {
    await pb.collection('assignments').delete(assignmentId);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete assignment:', error);
    return { success: false, error: 'Failed to delete assignment' };
  }
}

// Partial Exams

export async function createPartialExam(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || user.role !== 'docente') {
    throw new Error("Unauthorized");
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const topics = formData.get('topics') as string;
  const status = (formData.get('status') as PartialExamStatus) || 'Planificado';
  const questionBanks = formData.getAll('questionBanks').map(String).filter(Boolean);

  if (!title) {
     return { success: false, error: 'El titulo es obligatorio' };
  }

  try {
    const turns = getPartialExamTurnPayloads(formData);
    const bankValidationError = await validatePartialExamBanks(pb, questionBanks);
    if (bankValidationError) {
      return { success: false, error: bankValidationError };
    }

    const data: PartialExamPayload = {
      title,
      description,
      topics,
      status,
    };
    data.startsAt = turns[0].startsAt;
    data.endsAt = turns[0].endsAt;
    data.questionBanks = questionBanks;

    const partialExam = await pb.collection('partial_exams').create<PartialExam>(data);
    await syncPartialExamTurns(pb, partialExam.id, turns);
    revalidatePath('/');
    revalidatePath('/parciales');
    return { success: true };
  } catch (error) {
    console.error('Failed to create partial exam:', error);
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo crear el parcial' };
  }
}

export async function updatePartialExam(partialExamId: string, formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || user.role !== 'docente') {
    throw new Error("Unauthorized");
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const topics = formData.get('topics') as string;
  const status = (formData.get('status') as PartialExamStatus) || 'Planificado';
  const questionBanks = formData.getAll('questionBanks').map(String).filter(Boolean);

  try {
    const turns = getPartialExamTurnPayloads(formData);
    const bankValidationError = await validatePartialExamBanks(pb, questionBanks);
    if (bankValidationError) {
      return { success: false, error: bankValidationError };
    }

    const data: PartialExamPayload = {
      title,
      description,
      topics,
      status,
    };
    data.startsAt = turns[0].startsAt;
    data.endsAt = turns[0].endsAt;
    data.questionBanks = questionBanks;

    await pb.collection('partial_exams').update(partialExamId, data);
    await syncPartialExamTurns(pb, partialExamId, turns);

    revalidatePath('/');
    revalidatePath('/parciales');
    revalidatePath(`/parciales/${partialExamId}/editar`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update partial exam:', error);
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo actualizar el parcial' };
  }
}

export async function deletePartialExam(partialExamId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || user.role !== 'docente') {
    throw new Error("Unauthorized");
  }

  try {
    await pb.collection('partial_exams').delete(partialExamId);
    revalidatePath('/');
    revalidatePath('/parciales');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete partial exam:', error);
    return { success: false, error: 'No se pudo eliminar el parcial' };
  }
}

function getAnswersForQuestionIds(answers: Record<string, string> | undefined, questionIds: string[]) {
  return questionIds.reduce<Record<string, string>>((currentAnswers, questionId) => {
    const answer = answers?.[questionId];
    if (answer) currentAnswers[questionId] = answer;
    return currentAnswers;
  }, {});
}

export async function savePartialExamAttemptProgress(params: {
  attemptId: string;
  partialExamId: string;
  answers: Record<string, string>;
}) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || user.role !== 'estudiante') {
    return { success: false, error: 'Solo los estudiantes pueden guardar parciales.' };
  }

  const attemptId = params.attemptId?.trim();
  const partialExamId = params.partialExamId?.trim();

  if (!attemptId || !partialExamId) {
    return { success: false, error: 'No se encontro el intento del parcial.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    const [partialExamRecord, attempt] = await Promise.all([
      dataPb.collection('partial_exams').getOne<PartialExam>(partialExamId),
      dataPb.collection('partial_exam_attempts').getOne<PartialExamAttempt>(attemptId),
    ]);

    if (attempt.partialExam !== partialExamId || attempt.student !== user.id || attempt.status !== 'in_progress') {
      return { success: false, error: 'El intento del parcial no esta disponible.' };
    }

    const turns = await getPartialExamTurnsForAction(dataPb, partialExamId);
    const partialExam = withTurns(partialExamRecord, turns);
    const availability = getPartialExamAvailability(partialExam, new Date(), attempt.turn);
    if (!availability.isOpen) {
      return { success: false, error: 'El parcial no esta abierto para guardar respuestas.' };
    }

    const questionIds = normalizeRelationIds(attempt.questionIds);
    if (questionIds.length !== PARTIAL_EXAM_QUESTION_COUNT) {
      return { success: false, error: `El intento debe tener ${PARTIAL_EXAM_QUESTION_COUNT} preguntas.` };
    }

    await dataPb.collection('partial_exam_attempts').update(attemptId, {
      answers: getAnswersForQuestionIds(params.answers, questionIds),
      lastSavedAt: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save partial exam attempt:', error);
    return { success: false, error: 'No se pudieron guardar las respuestas.' };
  }
}

export async function recordPartialExamSimulation(params: {
  partialExamId: string;
  questionIds: string[];
  answers: Record<string, string>;
  finishReason: PartialExamSimulationFinishReason;
  attemptId?: string;
}) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || user.role !== 'estudiante') {
    return { success: false, error: 'Solo los estudiantes pueden enviar parciales.' };
  }

  const partialExamId = params.partialExamId?.trim();
  const requestedQuestionIds = Array.from(new Set((params.questionIds || []).map(String).filter(Boolean)));

  if (!partialExamId || requestedQuestionIds.length === 0) {
    return { success: false, error: 'No hay preguntas para registrar.' };
  }

  try {
    const dataPb = await createAdministrativeClient(pb);
    const partialExamRecord = await dataPb.collection('partial_exams').getOne<PartialExam>(partialExamId);
    const turns = await getPartialExamTurnsForAction(dataPb, partialExamId);
    const partialExam = withTurns(partialExamRecord, turns);
    const availability = getPartialExamAvailability(partialExam);
    if (!availability.isPublished || !availability.hasStarted) {
      return { success: false, error: 'El parcial no esta disponible para estudiantes.' };
    }

    let attempt: PartialExamAttempt | null = null;
    if (params.attemptId) {
      attempt = await dataPb.collection('partial_exam_attempts').getOne<PartialExamAttempt>(params.attemptId);
      if (attempt.partialExam !== partialExamId || attempt.student !== user.id) {
        return { success: false, error: 'El intento del parcial no corresponde al estudiante.' };
      }

      if (attempt.status === 'submitted') {
        return { success: true, totalQuestions: normalizeRelationIds(attempt.questionIds).length };
      }

      const attemptAvailability = getPartialExamAvailability(partialExam, new Date(), attempt.turn);
      if (!attemptAvailability.hasStarted) {
        return { success: false, error: 'El turno del parcial todavía no inició.' };
      }
    } else if (!availability.isOpen) {
      return { success: false, error: availability.hasEnded ? 'El parcial ya finalizo.' : 'No hay un turno abierto para enviar este parcial.' };
    }

    const previousSimulations = await dataPb.collection('partial_exam_simulations').getFullList<PartialExamSimulation>({
      filter: pb.filter('partialExam = {:partialExamId} && student = {:studentId}', {
        partialExamId,
        studentId: user.id,
      }),
      sort: '-completedAt',
    });

    if (previousSimulations.length > 0) {
      return { success: false, error: 'El parcial ya fue enviado.' };
    }

    const bankIds = normalizeRelationIds(partialExam.questionBanks);
    if (bankIds.length === 0) {
      return { success: false, error: 'El parcial no tiene bancos de preguntas asociados.' };
    }

    const questionIds = attempt ? normalizeRelationIds(attempt.questionIds) : requestedQuestionIds;
    if (questionIds.length !== PARTIAL_EXAM_QUESTION_COUNT) {
      return { success: false, error: `El parcial debe enviarse con ${PARTIAL_EXAM_QUESTION_COUNT} preguntas.` };
    }

    const questionFilter = questionIds.map((questionId) => `id = "${questionId}"`).join(' || ');
    const unitFilter = bankIds.map((unitId) => `unit = "${unitId}"`).join(' || ');
    const questions = await dataPb.collection('partial_exam_questions').getFullList<PartialExamQuestion>({
      filter: `(${questionFilter}) && (${unitFilter})`,
    });
    if (questions.length !== PARTIAL_EXAM_QUESTION_COUNT) {
      return { success: false, error: `No se pudieron validar las ${PARTIAL_EXAM_QUESTION_COUNT} preguntas del parcial.` };
    }

    const questionsById = new Map(questions.map((question) => [question.id, question]));
    let score = 0;
    let answeredQuestions = 0;
    const answers = getAnswersForQuestionIds(params.answers, questionIds);

    for (const questionId of questionIds) {
      const answer = answers[questionId];
      const question = questionsById.get(questionId);
      if (!question || !answer) continue;
      answeredQuestions += 1;
      if (answer === question.correctOptionId) {
        score += 1;
      }
    }

    const attemptAvailability = attempt ? getPartialExamAvailability(partialExam, new Date(), attempt.turn) : availability;
    const finishReason = attemptAvailability.hasEnded ? 'time' : params.finishReason;
    const completedAt = new Date().toISOString();

    const simulation = await dataPb.collection('partial_exam_simulations').create({
      partialExam: partialExamId,
      ...(attempt?.turn ? { turn: attempt.turn } : availability.activeTurn ? { turn: availability.activeTurn.id } : {}),
      student: user.id,
      score,
      totalQuestions: questionIds.length,
      answeredQuestions,
      questionIds,
      answers,
      finishReason,
      completedAt,
      scoreVisible: false,
    });

    if (attempt) {
      await dataPb.collection('partial_exam_attempts').update(attempt.id, {
        answers,
        status: 'submitted',
        finishReason,
        submittedAt: completedAt,
        lastSavedAt: completedAt,
        completedSimulation: simulation.id,
      });
    }

    revalidatePath('/parciales');
    revalidatePath(`/parciales/${partialExamId}/resultados`);
    return { success: true, totalQuestions: questionIds.length };
  } catch (error) {
    console.error('Failed to record partial exam simulation:', error);
    return { success: false, error: 'No se pudo enviar el parcial.' };
  }
}

export async function setPartialExamScoreVisibility(simulationId: string, visible: boolean) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || user.role !== 'docente') {
    return { success: false, error: 'Solo los docentes pueden publicar notas.' };
  }

  try {
    let simulation: PartialExamSimulation;

    try {
      simulation = await pb.collection('partial_exam_simulations').update<PartialExamSimulation>(simulationId, {
        scoreVisible: visible,
      });
    } catch (authenticatedError) {
      console.error('Failed to update partial exam score visibility with docente session:', authenticatedError);
      const adminPb = await createAdministrativeClient(pb);
      simulation = await adminPb.collection('partial_exam_simulations').update<PartialExamSimulation>(simulationId, {
        scoreVisible: visible,
      });
    }

    revalidatePath('/parciales');
    revalidatePath(`/parciales/${simulation.partialExam}/resultados`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update partial exam score visibility:', error);
    return { success: false, error: 'No se pudo actualizar la visibilidad de la nota.' };
  }
}

// Partial Exam Question Bank

function isDocente(user: unknown) {
  return (
    typeof user === 'object' &&
    user !== null &&
    'role' in user &&
    (user as { role?: unknown }).role === 'docente'
  );
}

export async function createPartialExamUnit(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!isDocente(user)) {
    throw new Error("Unauthorized");
  }

  const name = (formData.get('name') as string)?.trim();
  const description = (formData.get('description') as string)?.trim();

  if (!name) {
    return { success: false, error: 'El nombre de la unidad es obligatorio.' };
  }

  try {
    await pb.collection('partial_exam_units').create({
      name,
      description,
    });
    revalidatePath('/parciales');
    revalidatePath('/parciales/banco');
    return { success: true };
  } catch (error) {
    console.error('Failed to create partial exam unit:', error);
    return { success: false, error: 'No se pudo crear la unidad.' };
  }
}

export async function uploadPartialExamUnitDocument(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!isDocente(user)) {
    throw new Error("Unauthorized");
  }

  const unitId = (formData.get('unitId') as string)?.trim();
  const title = (formData.get('title') as string)?.trim();
  const file = formData.get('file') as File | null;

  if (!unitId || !title || !file || file.size === 0) {
    return { success: false, error: 'Unidad, titulo y archivo son obligatorios.' };
  }

  const filename = file.name.toLowerCase();
  const isAcceptedFile = filename.endsWith('.pdf') || filename.endsWith('.docx');
  if (!isAcceptedFile) {
    return { success: false, error: 'Solo se permiten archivos PDF o DOCX.' };
  }

  try {
    await pb.collection('partial_exam_unit_documents').create({
      unit: unitId,
      title,
      originalName: file.name,
      file,
    });
    revalidatePath('/parciales');
    revalidatePath('/parciales/banco');
    revalidatePath(`/parciales/banco/${unitId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to upload partial exam unit document:', error);
    return { success: false, error: 'No se pudo subir el documento.' };
  }
}

export async function generateQuestionsForUnitDocument(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!isDocente(user)) {
    throw new Error("Unauthorized");
  }

  const documentId = (formData.get('documentId') as string)?.trim();
  const questionCount = Number(formData.get('questionCount') || 10);

  if (!documentId) {
    return { success: false, error: 'Selecciona un documento.' };
  }

  try {
    const document = await pb.collection('partial_exam_unit_documents').getOne(documentId, {
      expand: 'unit',
    });
    const unit = document.expand?.unit;

    if (!document.file || !unit) {
      return { success: false, error: 'El documento no esta asociado correctamente a una unidad.' };
    }

    const fileUrl = pb.files.getURL(document, document.file);
    const fileResponse = await fetch(fileUrl, {
      headers: pb.authStore.token ? { Authorization: `Bearer ${pb.authStore.token}` } : undefined,
    });

    if (!fileResponse.ok) {
      return { success: false, error: 'No se pudo leer el archivo de la unidad.' };
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await generateMultipleChoiceQuestionsFromUnitDocument({
      unitName: unit.name,
      documentTitle: document.title,
      filename: document.originalName || document.file,
      mimeType: fileResponse.headers.get('content-type') || '',
      buffer,
      questionCount,
    });

    if (!result.success || !result.questions) {
      return { success: false, error: result.error || 'No se pudieron generar preguntas.' };
    }

    for (const question of result.questions) {
      await pb.collection('partial_exam_questions').create({
        unit: unit.id,
        document: document.id,
        kind: question.kind,
        question: question.question,
        options: question.options,
        correctOptionId: question.correctOptionId,
        explanation: question.explanation,
        difficulty: question.difficulty,
        sourceReference: question.sourceReference,
        selected: true,
      });
    }

    revalidatePath('/parciales');
    revalidatePath('/parciales/banco');
    revalidatePath(`/parciales/banco/${unit.id}`);
    return { success: true, created: result.questions.length };
  } catch (error) {
    console.error('Failed to generate partial exam questions:', error);
    return { success: false, error: 'No se pudieron generar preguntas.' };
  }
}

export async function generateQuestionsForUnitPrompt(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!isDocente(user)) {
    throw new Error("Unauthorized");
  }

  const unitId = (formData.get('unitId') as string)?.trim();
  const prompt = (formData.get('prompt') as string)?.trim();
  const questionCount = Number(formData.get('questionCount') || 10);

  if (!unitId || !prompt) {
    return { success: false, error: 'Unidad y prompt son obligatorios.' };
  }

  try {
    const unit = await pb.collection('partial_exam_units').getOne(unitId);
    const result = await generateMultipleChoiceQuestionsFromUnitPrompt({
      unitName: unit.name,
      prompt,
      questionCount,
    });

    if (!result.success || !result.questions) {
      return { success: false, error: result.error || 'No se pudieron generar preguntas.' };
    }

    for (const question of result.questions) {
      await pb.collection('partial_exam_questions').create({
        unit: unit.id,
        kind: question.kind,
        question: question.question,
        options: question.options,
        correctOptionId: question.correctOptionId,
        explanation: question.explanation,
        difficulty: question.difficulty,
        sourceReference: question.sourceReference || 'Prompt del docente',
        selected: true,
      });
    }

    revalidatePath('/parciales');
    revalidatePath('/parciales/banco');
    revalidatePath(`/parciales/banco/${unit.id}`);
    return { success: true, created: result.questions.length };
  } catch (error) {
    console.error('Failed to generate partial exam questions from prompt:', error);
    return { success: false, error: 'No se pudieron generar preguntas.' };
  }
}

export async function updatePartialExamQuestionSelection(questionId: string, selected: boolean) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!isDocente(user)) {
    throw new Error("Unauthorized");
  }

  try {
    const question = await pb.collection('partial_exam_questions').getOne(questionId);
    await pb.collection('partial_exam_questions').update(questionId, { selected });
    revalidatePath('/parciales');
    revalidatePath('/parciales/banco');
    if (question.unit) {
      revalidatePath(`/parciales/banco/${question.unit}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to update partial exam question selection:', error);
    return { success: false, error: 'No se pudo actualizar la pregunta.' };
  }
}

export async function deletePartialExamQuestion(questionId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!isDocente(user)) {
    throw new Error("Unauthorized");
  }

  try {
    const question = await pb.collection('partial_exam_questions').getOne(questionId);
    await pb.collection('partial_exam_questions').delete(questionId);
    revalidatePath('/parciales');
    revalidatePath('/parciales/banco');
    if (question.unit) {
      revalidatePath(`/parciales/banco/${question.unit}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Failed to delete partial exam question:', error);
    return { success: false, error: 'No se pudo eliminar la pregunta.' };
  }
}

// Links

export async function createLink(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  const title = formData.get('title') as string;
  const url = formData.get('url') as string;
  const type = formData.get('type') as 'link' | 'file' | 'slide' | 'note' | 'study-guide' || 'link';
  const classId = formData.get('classId') as string;
  const assignmentId = formData.get('assignmentId') as string;

  if (!title || !url || (!classId && !assignmentId)) {
     return { success: false, error: 'Title, URL and Parent ID are required' };
  }

  try {
    const data: any = {
      title,
      url,
      type,
    };
    if (classId) data.class = classId;
    if (assignmentId) data.assignment = assignmentId;
    
    await pb.collection('links').create(data);
    
    if (classId) revalidatePath(`/classes/${classId}`);
    if (assignmentId) revalidatePath(`/assignments/${assignmentId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create link:', error);
    // Log detailed error from PocketBase
    if (error.response) {
      console.error('PocketBase response error:', JSON.stringify(error.response, null, 2));
    }
    return { success: false, error: 'Failed to create link: ' + (error.message || String(error)) };
  }
}

export async function updateLink(linkId: string, formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  const title = formData.get('title') as string;
  const url = formData.get('url') as string;
  const type = formData.get('type') as 'link' | 'file' | 'slide' | 'note' | 'study-guide';
  const classId = formData.get('classId') as string;
  const assignmentId = formData.get('assignmentId') as string;

  try {
    const data: any = {
      title,
      url,
    };
    if (type) data.type = type;

    await pb.collection('links').update(linkId, data);
    
    if (classId) revalidatePath(`/classes/${classId}`);
    if (assignmentId) revalidatePath(`/assignments/${assignmentId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to update link:', error);
    return { success: false, error: 'Failed to update link' };
  }
}

export async function deleteLink(linkId: string, parentId?: string, parentType?: 'class' | 'assignment') {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    throw new Error("Unauthorized");
  }

  try {
    await pb.collection('links').delete(linkId);
    
    if (parentId && parentType) {
        if (parentType === 'class') revalidatePath(`/classes/${parentId}`);
        if (parentType === 'assignment') revalidatePath(`/assignments/${parentId}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete link:', error);
    return { success: false, error: 'Failed to delete link' };
  }
}

// Deliveries

export async function createDelivery(formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || user.role !== 'estudiante') {
    return { success: false, error: 'Unauthorized: Only students can submit' };
  }

  const assignmentId = (formData.get('assignmentId') as string)?.trim();
  const repositoryUrl = (formData.get('repositoryUrl') as string)?.trim();
  const contentStr = (formData.get('content') as string);
  const status = (formData.get('status') as string) || 'submitted'; // Default to submitted if not specified

  if (!assignmentId) {
     return { success: false, error: 'Assignment ID is required' };
  }

  // Check assignment due date on the server
  try {
    const assignment = await pb.collection('assignments').getOne(assignmentId);
    const isSpecialStudent = user.email === 'carlosacostap@sfvc.edu.ar';
    if (!isSpecialStudent && status === 'submitted' && assignment.dueDate && new Date(assignment.dueDate) < new Date()) {
      return { success: false, error: 'La fecha límite para este trabajo práctico ha pasado.' };
    }
  } catch (error) {
    return { success: false, error: 'Assignment not found' };
  }

  // Validate based on what is provided. 
  // We might not know the assignment type here easily without fetching it, 
  // but we can check if at least one delivery method is present.
  if (!repositoryUrl && !contentStr) {
     return { success: false, error: 'Either Repository URL or Content is required' };
  }

  try {
    const data: Record<string, any> = {
      assignment: assignmentId,
      student: user.id,
      status,
    };
    
    if (repositoryUrl) data.repositoryUrl = repositoryUrl;
    if (contentStr) {
        try {
            data.content = JSON.parse(contentStr);
        } catch (e) {
            data.content = contentStr; 
        }
    }

    const delivery = await pb.collection('deliveries').create(data);
    
    // --- Clean up drafts ---
    if (status === 'submitted') {
      try {
        // Find all draft deliveries for this user and assignment
        const drafts = await pb.collection('deliveries').getFullList({
          filter: `assignment = "${assignmentId}" && student = "${user.id}" && status = "draft" && id != "${delivery.id}"`
        });
        
        // Delete them
        for (const draft of drafts) {
          await pb.collection('deliveries').delete(draft.id);
        }
      } catch (draftError) {
        console.error("Failed to clean up drafts:", draftError);
      }
    }
    // ------------------------
    
    // ------------------------
    
    revalidatePath(`/assignments/${assignmentId}`);
    return { success: true, id: delivery.id };
  } catch (error) {
    console.error('Failed to create delivery:', error);
    // Check for unique constraint violation
    if (String(error).includes('unique')) {
        return { success: false, error: 'You have already submitted for this assignment' };
    }
    return { success: false, error: 'Failed to create delivery' };
  }
}

// Kept temporarily as a reference while the delivery feedback migration settles.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function updateDeliveryLegacy(deliveryId: string, formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const repositoryUrl = (formData.get('repositoryUrl') as string)?.trim();
  const contentStr = (formData.get('content') as string);
  const status = (formData.get('status') as string);
  const assignmentId = (formData.get('assignmentId') as string)?.trim(); // Needed for revalidation

  // We need to fetch the delivery to check ownership, 
  // although PocketBase API rules should handle this, it's good to be explicit or just try/catch
  let currentDelivery;
  let latestFeedback: any = null;
  try {
    currentDelivery = await pb.collection('deliveries').getOne(deliveryId, { expand: 'assignment' });
    try {
      latestFeedback = await pb.collection('delivery_feedbacks').getFirstListItem(
        `delivery = "${deliveryId}"`,
        { sort: '-sentAt' }
      );
    } catch {
      latestFeedback = null;
    }
    if (!latestFeedback) {
      try {
        const previousDeliveries = await pb.collection('deliveries').getFullList({
          filter: `assignment = "${currentDelivery.assignment}" && student = "${currentDelivery.student}" && status = "graded" && created < "${currentDelivery.created}"`,
          sort: '-created',
        });

        for (const previousDelivery of previousDeliveries) {
          try {
            const previousFeedback = await pb.collection('delivery_feedbacks').getFirstListItem(
              `delivery = "${previousDelivery.id}"`,
              { sort: '-sentAt' }
            );
            if (previousFeedback?.verdict === 'Corregir y reenviar') {
              latestFeedback = previousFeedback;
              break;
            }
          } catch {}
        }
      } catch {}
    }

    if (!latestFeedback) {
      try {
        const previousDeliveries = await pb.collection('deliveries').getFullList({
          filter: `assignment = "${currentDelivery.assignment}" && student = "${currentDelivery.student}" && status = "graded" && created < "${currentDelivery.created}"`,
          sort: '-created',
        });

        for (const previousDelivery of previousDeliveries) {
          try {
            const previousFeedback = await pb.collection('delivery_feedbacks').getFirstListItem(
              `delivery = "${previousDelivery.id}"`,
              { sort: '-sentAt' }
            );
            if (previousFeedback?.verdict === 'Corregir y reenviar') {
              latestFeedback = previousFeedback;
              break;
            }
          } catch {}
        }
      } catch {}
    }

    const assignment = currentDelivery.expand?.assignment;
    if (assignment) {
      const limitDate = getDeliveryLimitDate(assignment, {
        verdict: latestFeedback?.verdict,
        latestFeedback,
      });
      
      const isSpecialStudent = user.email === 'carlosacostap@sfvc.edu.ar';
      if (!isSpecialStudent && status === 'submitted' && limitDate && limitDate < new Date()) {
        return { success: false, error: 'La fecha límite para este trabajo práctico ha pasado.' };
      }
    }
  } catch (error) {
    return { success: false, error: 'Delivery not found' };
  }

  if (!repositoryUrl && !contentStr && !status) {
     return { success: false, error: 'Nothing to update' };
  }

  try {
    const data: any = {};
    if (repositoryUrl) data.repositoryUrl = repositoryUrl;
    if (status) {
        data.status = status;
        // Si el estudiante vuelve a enviar o guarda borrador, se limpia la calificación previa pero se guarda en el historial si fue evaluado
        if (status === 'submitted' || status === 'draft') {
            if (currentDelivery.status === 'graded' && currentDelivery.verdict === 'Corregir y reenviar') {
                const historyEntry = {
                    repositoryUrl: currentDelivery.repositoryUrl,
                    content: currentDelivery.content,
                    grade: currentDelivery.grade,
                    feedback: currentDelivery.feedback,
                    verdict: currentDelivery.verdict,
                    gradedAt: currentDelivery.updated,
                    submittedAt: new Date().toISOString()
                };
                const existingHistory = currentDelivery.history || [];
                data.history = [...existingHistory, historyEntry];
            }
            
            data.grade = null;
            data.feedback = "";
            data.verdict = "";
        }
    }
    if (contentStr) {
        try {
            data.content = JSON.parse(contentStr);
        } catch (e) {
            data.content = contentStr;
        }
    }

    // Save data first
    await pb.collection('deliveries').update(deliveryId, data);
    
    // --- Clean up drafts ---
    if (status === 'submitted') {
      try {
        const actualAssignmentId = assignmentId || currentDelivery.assignment;
        
        // Find all draft deliveries for this user and assignment
        const drafts = await pb.collection('deliveries').getFullList({
          filter: `assignment = "${actualAssignmentId}" && student = "${user.id}" && status = "draft" && id != "${deliveryId}"`
        });
        
        // Delete them
        for (const draft of drafts) {
          await pb.collection('deliveries').delete(draft.id);
        }
      } catch (draftError) {
        console.error("Failed to clean up drafts:", draftError);
      }
    }
    // ------------------------

    if (assignmentId) revalidatePath(`/assignments/${assignmentId}`);
    return { success: true, id: deliveryId };
  } catch (error) {
    console.error('Failed to update delivery:', error);
    return { success: false, error: 'Failed to update delivery' };
  }
}

export async function updateDelivery(deliveryId: string, formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const repositoryUrl = (formData.get('repositoryUrl') as string)?.trim();
  const contentStr = (formData.get('content') as string);
  const status = (formData.get('status') as string);
  const assignmentId = (formData.get('assignmentId') as string)?.trim();

  let currentDelivery;
  let latestFeedback: any = null;

  try {
    currentDelivery = await pb.collection('deliveries').getOne(deliveryId, { expand: 'assignment' });
    try {
      latestFeedback = await pb.collection('delivery_feedbacks').getFirstListItem(
        `delivery = "${deliveryId}"`,
        { sort: '-sentAt' }
      );
    } catch {
      latestFeedback = null;
    }

    if (!latestFeedback) {
      try {
        const previousDeliveries = await pb.collection('deliveries').getFullList({
          filter: `assignment = "${currentDelivery.assignment}" && student = "${currentDelivery.student}" && status = "graded" && created < "${currentDelivery.created}"`,
          sort: '-created',
        });

        for (const previousDelivery of previousDeliveries) {
          try {
            const previousFeedback = await pb.collection('delivery_feedbacks').getFirstListItem(
              `delivery = "${previousDelivery.id}"`,
              { sort: '-sentAt' }
            );
            if (previousFeedback?.verdict === 'Corregir y reenviar') {
              latestFeedback = previousFeedback;
              break;
            }
          } catch {}
        }
      } catch {}
    }

    const assignment = currentDelivery.expand?.assignment;
    if (assignment) {
      const limitDate = getDeliveryLimitDate(assignment, {
        verdict: latestFeedback?.verdict,
        latestFeedback,
      });

      const isSpecialStudent = user.email === 'carlosacostap@sfvc.edu.ar';
      if (!isSpecialStudent && status === 'submitted' && limitDate && limitDate < new Date()) {
        return { success: false, error: 'La fecha limite para este trabajo practico ha pasado.' };
      }
    }
  } catch {
    return { success: false, error: 'Delivery not found' };
  }

  if (!repositoryUrl && !contentStr && !status) {
     return { success: false, error: 'Nothing to update' };
  }

  try {
    const data: any = {};
    if (repositoryUrl) data.repositoryUrl = repositoryUrl;
    if (status) data.status = status;
    if (contentStr) {
      try {
        data.content = JSON.parse(contentStr);
      } catch {
        data.content = contentStr;
      }
    }

    if ((status === 'submitted' || status === 'draft') && currentDelivery.status === 'graded') {
      const newDelivery = await pb.collection('deliveries').create({
        assignment: currentDelivery.assignment,
        student: user.id,
        status,
        ...(repositoryUrl ? { repositoryUrl } : {}),
        ...(contentStr ? { content: data.content } : {}),
      });

      if (status === 'submitted') {
        try {
          const drafts = await pb.collection('deliveries').getFullList({
            filter: `assignment = "${currentDelivery.assignment}" && student = "${user.id}" && status = "draft" && id != "${newDelivery.id}"`
          });

          for (const draft of drafts) {
            await pb.collection('deliveries').delete(draft.id);
          }
        } catch (draftError) {
          console.error("Failed to clean up drafts:", draftError);
        }
      }

      if (assignmentId) revalidatePath(`/assignments/${assignmentId}`);
      return { success: true, id: newDelivery.id };
    }

    await pb.collection('deliveries').update(deliveryId, data);

    if (status === 'submitted') {
      try {
        const actualAssignmentId = assignmentId || currentDelivery.assignment;
        const drafts = await pb.collection('deliveries').getFullList({
          filter: `assignment = "${actualAssignmentId}" && student = "${user.id}" && status = "draft" && id != "${deliveryId}"`
        });

        for (const draft of drafts) {
          await pb.collection('deliveries').delete(draft.id);
        }
      } catch (draftError) {
        console.error("Failed to clean up drafts:", draftError);
      }
    }

    if (assignmentId) revalidatePath(`/assignments/${assignmentId}`);
    return { success: true, id: deliveryId };
  } catch (error) {
    console.error('Failed to update delivery:', error);
    return { success: false, error: 'Failed to update delivery' };
  }
}

export async function gradeDelivery(deliveryId: string, formData: FormData) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    return { success: false, error: 'Unauthorized' };
  }

  const grade = formData.get('grade') as string;
  const feedback = formData.get('feedback') as string;
  const verdict = formData.get('verdict') as string;
  const assignmentId = formData.get('assignmentId') as string;

  try {
    const delivery = await pb.collection('deliveries').getOne(deliveryId);
    const feedbackData: any = {
      delivery: deliveryId,
      assignment: delivery.assignment,
      student: delivery.student,
      teacher: user.id,
      sentAt: new Date().toISOString(),
    };
    if (grade) feedbackData.grade = parseFloat(grade);
    if (feedback) feedbackData.feedback = feedback;
    if (verdict) feedbackData.verdict = verdict;
    if (delivery.aiGrade !== undefined && delivery.aiGrade !== null) feedbackData.aiGrade = delivery.aiGrade;
    if (delivery.aiFeedback) feedbackData.aiFeedback = delivery.aiFeedback;
    if (delivery.aiVerdict) feedbackData.aiVerdict = delivery.aiVerdict;

    await pb.collection('delivery_feedbacks').create(feedbackData);
    await pb.collection('deliveries').update(deliveryId, { status: 'graded' });
    
    if (assignmentId) revalidatePath(`/assignments/${assignmentId}`);
    revalidatePath(`/deliveries/${deliveryId}`);
    return { success: true, id: deliveryId };
  } catch (error) {
    console.error('Failed to grade delivery:', error);
    return { success: false, error: 'Failed to grade delivery' };
  }
}

export async function approveAssignmentForAllStudents(assignmentId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const adminPb = await createAdministrativeClient(pb);
    const assignment = await adminPb.collection('assignments').getOne<Assignment>(assignmentId);

    if (!isAdministrativeApprovalAssignment(assignment)) {
      return { success: false, error: 'La aprobación administrativa solo está habilitada para Cuestionario 1.' };
    }

    const students = await adminPb.collection('users').getFullList({
      filter: 'role = "estudiante"',
      fields: 'id',
    });
    const deliveries = await adminPb.collection('deliveries').getFullList({
      filter: `assignment = "${assignmentId}"`,
      sort: '-created',
      fields: 'id,student,status,created,grade,feedback,verdict',
    });
    const feedbacks = await adminPb.collection('delivery_feedbacks').getFullList({
      filter: `assignment = "${assignmentId}"`,
      sort: '-sentAt',
      fields: 'id,student,verdict,sentAt',
    });

    const latestDeliveryByStudent = new Map<string, any>();
    for (const delivery of deliveries) {
      if (!latestDeliveryByStudent.has(delivery.student)) {
        latestDeliveryByStudent.set(delivery.student, delivery);
      }
    }

    const approvedStudents = new Set(
      feedbacks
        .filter((feedback) => feedback.verdict === 'Aprobado')
        .map((feedback) => feedback.student)
    );

    const sentAt = new Date().toISOString();
    const feedbackText = "<p>Desafio aprobado por trabajo realizado en clase. Este desafio no requeria entrega digital.</p>";
    const teacherId = await getFeedbackTeacherId(adminPb, user.id);
    let createdDeliveries = 0;
    let updatedDeliveries = 0;
    let createdFeedbacks = 0;
    let skippedAlreadyApproved = 0;

    for (const student of students) {
      if (approvedStudents.has(student.id)) {
        skippedAlreadyApproved++;
        continue;
      }

      let delivery = latestDeliveryByStudent.get(student.id);

      if (!delivery) {
        delivery = await adminPb.collection('deliveries').create({
          assignment: assignmentId,
          student: student.id,
          status: 'graded',
          grade: 10,
          feedback: feedbackText,
          verdict: 'Aprobado',
          content: {
            administrativeApproval: true,
            reason: 'No requiere entrega digital',
          },
        });
        createdDeliveries++;
      } else if (delivery.status !== 'graded' || delivery.verdict !== 'Aprobado' || delivery.grade !== 10) {
        delivery = await adminPb.collection('deliveries').update(delivery.id, {
          status: 'graded',
          grade: 10,
          feedback: feedbackText,
          verdict: 'Aprobado',
        });
        updatedDeliveries++;
      }

      const feedbackCreated = await createApprovalFeedback(adminPb, {
        deliveryId: delivery.id,
        assignmentId,
        studentId: student.id,
        teacherId,
        feedback: feedbackText,
        sentAt,
      });
      if (feedbackCreated) createdFeedbacks++;
    }

    revalidatePath(`/assignments/${assignmentId}`);
    revalidatePath('/course-dashboard');

    return {
      success: true,
      createdDeliveries,
      updatedDeliveries,
      createdFeedbacks,
      skippedAlreadyApproved,
      totalStudents: students.length,
    };
  } catch (error) {
    console.error('Failed to approve assignment for all students:', error);
    return { success: false, error: 'Failed to approve assignment for all students' };
  }
}

export async function approveAssignmentForStudent(assignmentId: string, studentId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const adminPb = await createAdministrativeClient(pb);
    const assignment = await adminPb.collection('assignments').getOne<Assignment>(assignmentId);

    if (!isAdministrativeApprovalAssignment(assignment)) {
      return { success: false, error: 'La aprobación administrativa solo está habilitada para Cuestionario 1.' };
    }

    const student = await adminPb.collection('users').getOne(studentId);
    const teacherId = await getFeedbackTeacherId(adminPb, user.id);

    if (student.role !== 'estudiante') {
      return { success: false, error: 'El usuario seleccionado no es estudiante.' };
    }

    const existingApprovedFeedbacks = await adminPb.collection('delivery_feedbacks').getFullList({
      filter: `assignment = "${assignmentId}" && student = "${studentId}" && verdict = "Aprobado"`,
      fields: 'id',
    });

    if (existingApprovedFeedbacks.length > 0) {
      revalidatePath(`/assignments/${assignmentId}`);
      revalidatePath('/');
      revalidatePath('/course-dashboard');
      return { success: true, alreadyApproved: true };
    }

    const deliveries = await adminPb.collection('deliveries').getFullList({
      filter: `assignment = "${assignmentId}" && student = "${studentId}"`,
      sort: '-created',
      fields: 'id,status,created,grade,feedback,verdict',
    });

    let delivery = deliveries[0];
    const feedbackText = '<p>Trabajo aprobado. No requiere entrega digital.</p>';

    if (!delivery) {
      delivery = await adminPb.collection('deliveries').create({
        assignment: assignmentId,
        student: studentId,
        status: 'graded',
        grade: 10,
        feedback: feedbackText,
        verdict: 'Aprobado',
        content: {
          administrativeApproval: true,
          reason: 'No requiere entrega digital',
        },
      });
    } else if (delivery.status !== 'graded' || delivery.verdict !== 'Aprobado' || delivery.grade !== 10) {
      delivery = await adminPb.collection('deliveries').update(delivery.id, {
        status: 'graded',
        grade: 10,
        feedback: feedbackText,
        verdict: 'Aprobado',
      });
    }

    await createApprovalFeedback(adminPb, {
      deliveryId: delivery.id,
      assignmentId,
      studentId,
      teacherId,
      feedback: feedbackText,
    });

    revalidatePath(`/assignments/${assignmentId}`);
    revalidatePath('/');
    revalidatePath('/course-dashboard');

    return { success: true, alreadyApproved: false };
  } catch (error) {
    console.error('Failed to approve assignment for student:', error);
    return { success: false, error: 'No se pudo aprobar al estudiante.' };
  }
}

export async function unapproveAssignmentForStudent(assignmentId: string, studentId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const adminPb = await createAdministrativeClient(pb);
    const assignment = await adminPb.collection('assignments').getOne<Assignment>(assignmentId);

    if (!isAdministrativeApprovalAssignment(assignment)) {
      return { success: false, error: 'La aprobación administrativa solo está habilitada para Cuestionario 1.' };
    }

    const student = await adminPb.collection('users').getOne(studentId);

    if (student.role !== 'estudiante') {
      return { success: false, error: 'El usuario seleccionado no es estudiante.' };
    }

    const approvedFeedbacks = await adminPb.collection('delivery_feedbacks').getFullList({
      filter: `assignment = "${assignmentId}" && student = "${studentId}" && verdict = "Aprobado"`,
      fields: 'id',
    });

    for (const feedback of approvedFeedbacks) {
      await adminPb.collection('delivery_feedbacks').delete(feedback.id);
    }

    const deliveries = await adminPb.collection('deliveries').getFullList({
      filter: `assignment = "${assignmentId}" && student = "${studentId}"`,
      sort: '-created',
      fields: 'id,status,content,repositoryUrl',
    });

    for (const delivery of deliveries) {
      const isAdministrativeDelivery = delivery.content?.administrativeApproval === true && !delivery.repositoryUrl;
      await adminPb.collection('deliveries').update(delivery.id, {
        status: isAdministrativeDelivery ? 'draft' : 'submitted',
      });
    }

    revalidatePath(`/assignments/${assignmentId}`);
    revalidatePath('/');
    revalidatePath('/course-dashboard');

    return { success: true, removedFeedbacks: approvedFeedbacks.length };
  } catch (error) {
    console.error('Failed to unapprove assignment for student:', error);
    return { success: false, error: 'No se pudo desmarcar la aprobación del estudiante.' };
  }
}

export async function evaluateDeliveryWithAI(deliveryId: string, customContent?: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const delivery = await pb.collection('deliveries').getOne(deliveryId, { expand: 'assignment' });
    if (!delivery) {
      return { success: false, error: 'Delivery not found' };
    }

    const assignment = delivery.expand?.assignment as Assignment;
    if (!assignment) {
      return { success: false, error: 'Assignment not found' };
    }

    const contentToEvaluate = customContent || delivery.content;
    const aiResult = await generateAIEvaluation(assignment, contentToEvaluate, delivery.repositoryUrl);
    if (!aiResult) {
      return { success: false, error: 'Failed to generate AI evaluation' };
    }

    // Opcional: Si el usuario proveyó contenido custom (el editado), podríamos guardarlo
    const updateData: any = {
      aiGrade: aiResult.aiGrade,
      aiFeedback: aiResult.aiFeedback,
      aiVerdict: aiResult.aiVerdict
    };
    if (customContent) {
      updateData.content = customContent;
    }

    await pb.collection('deliveries').update(deliveryId, updateData);

    revalidatePath(`/deliveries/${deliveryId}`);
    return { success: true, data: aiResult };
  } catch (error) {
    console.error('Failed to evaluate delivery with AI:', error);
    return { success: false, error: 'Failed to evaluate delivery with AI' };
  }
}
