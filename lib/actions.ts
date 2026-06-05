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
} from "@/types";
import PocketBase from "pocketbase";
import { getDeliveryLimitDate } from "./delivery-deadlines";
import { getPartialExamAvailability } from "./partial-exam-availability";
import { normalizeRelationIds, PARTIAL_EXAM_QUESTION_COUNT } from "./partial-exam-rules";

type PartialExamPayload = {
  title: string;
  description: string;
  topics: string;
  status: PartialExamStatus;
  startsAt?: string;
  endsAt?: string;
  questionBanks?: string[];
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

async function countSelectedQuestionsForBanks(pb: PocketBase, bankIds: string[]) {
  if (bankIds.length === 0) return 0;

  const unitFilter = bankIds.map((unitId) => pb.filter('unit = {:unitId}', { unitId })).join(' || ');
  const questions = await pb.collection('partial_exam_questions').getFullList<PartialExamQuestion>({
    filter: `selected = true && (${unitFilter})`,
    fields: 'id',
  });

  return questions.length;
}

async function validatePartialExamBanks(pb: PocketBase, bankIds: string[]) {
  if (bankIds.length === 0) {
    return 'Selecciona al menos un banco de preguntas para el parcial.';
  }

  const selectedQuestions = await countSelectedQuestionsForBanks(pb, bankIds);
  if (selectedQuestions < PARTIAL_EXAM_QUESTION_COUNT) {
    return `Los bancos seleccionados deben tener al menos ${PARTIAL_EXAM_QUESTION_COUNT} preguntas seleccionadas. Actualmente tienen ${selectedQuestions}.`;
  }

  return null;
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
  
  // Verify current user is admin
  if (!pb.authStore.isValid || pb.authStore.model?.role !== 'admin') {
    throw new Error("Unauthorized");
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
  const startsAt = formData.get('startsAt') as string;
  const endsAt = formData.get('endsAt') as string;
  const topics = formData.get('topics') as string;
  const status = (formData.get('status') as PartialExamStatus) || 'Planificado';
  const questionBanks = formData.getAll('questionBanks').map(String).filter(Boolean);

  if (!title) {
     return { success: false, error: 'El titulo es obligatorio' };
  }

  if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
    return { success: false, error: 'La fecha de finalizacion debe ser posterior al inicio' };
  }

  try {
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
    if (startsAt) data.startsAt = new Date(startsAt).toISOString();
    if (endsAt) data.endsAt = new Date(endsAt).toISOString();
    data.questionBanks = questionBanks;

    await pb.collection('partial_exams').create(data);
    revalidatePath('/');
    revalidatePath('/parciales');
    return { success: true };
  } catch (error) {
    console.error('Failed to create partial exam:', error);
    return { success: false, error: 'No se pudo crear el parcial' };
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
  const startsAt = formData.get('startsAt') as string;
  const endsAt = formData.get('endsAt') as string;
  const topics = formData.get('topics') as string;
  const status = (formData.get('status') as PartialExamStatus) || 'Planificado';
  const questionBanks = formData.getAll('questionBanks').map(String).filter(Boolean);

  if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
    return { success: false, error: 'La fecha de finalizacion debe ser posterior al inicio' };
  }

  try {
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
    data.startsAt = startsAt ? new Date(startsAt).toISOString() : "";
    data.endsAt = endsAt ? new Date(endsAt).toISOString() : "";
    data.questionBanks = questionBanks;

    await pb.collection('partial_exams').update(partialExamId, data);

    revalidatePath('/');
    revalidatePath('/parciales');
    revalidatePath(`/parciales/${partialExamId}/editar`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update partial exam:', error);
    return { success: false, error: 'No se pudo actualizar el parcial' };
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
    const [partialExam, attempt] = await Promise.all([
      pb.collection('partial_exams').getOne<PartialExam>(partialExamId),
      pb.collection('partial_exam_attempts').getOne<PartialExamAttempt>(attemptId),
    ]);

    if (attempt.partialExam !== partialExamId || attempt.student !== user.id || attempt.status !== 'in_progress') {
      return { success: false, error: 'El intento del parcial no esta disponible.' };
    }

    const availability = getPartialExamAvailability(partialExam);
    if (!availability.isOpen) {
      return { success: false, error: 'El parcial no esta abierto para guardar respuestas.' };
    }

    const questionIds = normalizeRelationIds(attempt.questionIds);
    if (questionIds.length !== PARTIAL_EXAM_QUESTION_COUNT) {
      return { success: false, error: `El intento debe tener ${PARTIAL_EXAM_QUESTION_COUNT} preguntas.` };
    }

    await pb.collection('partial_exam_attempts').update(attemptId, {
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
    const partialExam = await pb.collection('partial_exams').getOne<PartialExam>(partialExamId);
    const availability = getPartialExamAvailability(partialExam);
    if (!availability.isPublished || !availability.hasStarted) {
      return { success: false, error: 'El parcial no esta disponible para estudiantes.' };
    }

    let attempt: PartialExamAttempt | null = null;
    if (params.attemptId) {
      attempt = await pb.collection('partial_exam_attempts').getOne<PartialExamAttempt>(params.attemptId);
      if (attempt.partialExam !== partialExamId || attempt.student !== user.id) {
        return { success: false, error: 'El intento del parcial no corresponde al estudiante.' };
      }

      if (attempt.status === 'submitted') {
        return { success: true, totalQuestions: normalizeRelationIds(attempt.questionIds).length };
      }
    } else if (availability.hasEnded) {
      return { success: false, error: 'El parcial ya finalizo.' };
    }

    const previousSimulations = await pb.collection('partial_exam_simulations').getFullList<PartialExamSimulation>({
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
    const questions = await pb.collection('partial_exam_questions').getFullList<PartialExamQuestion>({
      filter: `selected = true && (${questionFilter}) && (${unitFilter})`,
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

    const finishReason = availability.hasEnded ? 'time' : params.finishReason;
    const completedAt = new Date().toISOString();

    const simulation = await pb.collection('partial_exam_simulations').create({
      partialExam: partialExamId,
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
      await pb.collection('partial_exam_attempts').update(attempt.id, {
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
    const simulation = await pb.collection('partial_exam_simulations').update<PartialExamSimulation>(simulationId, {
      scoreVisible: visible,
    });

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
      return { success: false, error: 'La aprobacion administrativa solo esta habilitada para Cuestionario 1.' };
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
      return { success: false, error: 'La aprobacion administrativa solo esta habilitada para Cuestionario 1.' };
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
      return { success: false, error: 'La aprobacion administrativa solo esta habilitada para Cuestionario 1.' };
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
    return { success: false, error: 'No se pudo desmarcar la aprobacion del estudiante.' };
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
