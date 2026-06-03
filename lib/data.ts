import { createServerClient } from './pocketbase-server';
import {
  Class,
  Link,
  Assignment,
  User,
  Delivery,
  DeliveryFeedback,
  PartialExam,
  PartialExamQuestion,
  PartialExamUnit,
  PartialExamUnitDocument,
} from '@/types';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';

// Helper to create client with token for cached functions
const createClientWithToken = (token: string | undefined) => {
    const url = process.env['NEXT_PUBLIC_POCKETBASE_URL'];
    if (!url) {
        console.error("CRITICAL ERROR: NEXT_PUBLIC_POCKETBASE_URL is not set");
    }
    const pb = new PocketBase(url);
    // Disable autoCancellation to avoid issues in cached context
    pb.autoCancellation(false);
    if (token) {
        pb.authStore.loadFromCookie(`pb_auth=${token}`);
    }
    return pb;
};

// Cached fetchers using unstable_cache (Data Cache)
const getUsersCached = unstable_cache(
    async (token: string | undefined) => {
        const pb = createClientWithToken(token);
        return await pb.collection('users').getFullList<User>({
            sort: 'created',
        });
    },
    ['users-list'],
    { revalidate: 60, tags: ['users'] }
);

const getStudentsCached = unstable_cache(
    async (token: string | undefined) => {
        const pb = createClientWithToken(token);
        return await pb.collection('users').getFullList<User>({
            filter: 'role = "estudiante"',
            sort: 'name',
        });
    },
    ['students-list'],
    { revalidate: 60, tags: ['users'] }
);

// Exported functions with request memoization (React.cache)

export const getUsers = cache(async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get('pb_auth')?.value;
    return getUsersCached(token);
});

export const getStudents = cache(async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get('pb_auth')?.value;
    return getStudentsCached(token);
});

export async function getUserById(userId: string) {
    const pb = await createServerClient();
    try {
        return await pb.collection('users').getOne<User>(userId);
    } catch (e) {
        console.error('Error fetching user by id:', e);
        return null;
    }
}

export async function getAllClasses() {
    const pb = await createServerClient();
    const records = await pb.collection('classes').getFullList<Class>({
        sort: '-date', // Ordenar por fecha descendente
    });
    return records;
}

export async function getClass(id: string) {
  const pb = await createServerClient();
  const record = await pb.collection('classes').getOne<Class>(id);
  return record;
}

export async function getAllAssignments() {
  const pb = await createServerClient();
  const records = await pb.collection('assignments').getFullList<Assignment>({
      sort: '-created', // Ordenar por creación descendente
  });
  return records;
}

export async function getAssignment(id: string) {
  const pb = await createServerClient();
  const record = await pb.collection('assignments').getOne<Assignment>(id);
  return record;
}

export async function getAllPartialExams() {
  const pb = await createServerClient();
  const records = await pb.collection('partial_exams').getFullList<PartialExam>({
    expand: 'questionBanks',
  });
  return records;
}

export async function getPartialExamsManagementData() {
  try {
    return {
      partialExams: await getAllPartialExams(),
      collectionReady: true,
    };
  } catch (error) {
    const responseError = error as { status?: number; message?: string };
    const isMissingCollection =
      responseError.status === 404 &&
      responseError.message?.toLowerCase().includes('collection');

    if (!isMissingCollection) {
      throw error;
    }

    return {
      partialExams: [] as PartialExam[],
      collectionReady: false,
    };
  }
}

export async function getPartialExam(id: string) {
  const pb = await createServerClient();
  const record = await pb.collection('partial_exams').getOne<PartialExam>(id, {
    expand: 'questionBanks',
  });
  return record;
}

export async function getPartialExamUnits() {
  const pb = await createServerClient();
  try {
    const units = await pb.collection('partial_exam_units').getFullList<PartialExamUnit>();
    return units.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
  } catch (error) {
    console.error('Error fetching partial exam units:', error);
    return [];
  }
}

export async function getPartialExamUnit(id: string) {
  const pb = await createServerClient();
  try {
    return await pb.collection('partial_exam_units').getOne<PartialExamUnit>(id);
  } catch (error) {
    console.error('Error fetching partial exam unit:', error);
    return null;
  }
}

export async function getPartialExamUnitDocuments() {
  const pb = await createServerClient();
  try {
    return await pb.collection('partial_exam_unit_documents').getFullList<PartialExamUnitDocument>({
      expand: 'unit',
    });
  } catch (error) {
    console.error('Error fetching partial exam unit documents:', error);
    return [];
  }
}

export async function getPartialExamUnitDocumentsByUnit(unitId: string) {
  const pb = await createServerClient();
  try {
    return await pb.collection('partial_exam_unit_documents').getFullList<PartialExamUnitDocument>({
      filter: `unit = "${unitId}"`,
      expand: 'unit',
    });
  } catch (error) {
    console.error('Error fetching partial exam unit documents by unit:', error);
    return [];
  }
}

export async function getPartialExamQuestions() {
  const pb = await createServerClient();
  try {
    return await pb.collection('partial_exam_questions').getFullList<PartialExamQuestion>({
      expand: 'unit,document',
    });
  } catch (error) {
    console.error('Error fetching partial exam questions:', error);
    return [];
  }
}

export async function getPartialExamQuestionsByUnit(unitId: string) {
  const pb = await createServerClient();
  try {
    return await pb.collection('partial_exam_questions').getFullList<PartialExamQuestion>({
      filter: `unit = "${unitId}"`,
      expand: 'unit,document',
    });
  } catch (error) {
    console.error('Error fetching partial exam questions by unit:', error);
    return [];
  }
}

function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

export async function getPartialExamSimulationQuestions(partialExam: PartialExam, limit = 10) {
  const pb = await createServerClient();
  const rawBankIds = partialExam.questionBanks;
  const bankIds = Array.isArray(rawBankIds)
    ? rawBankIds
    : rawBankIds
      ? [rawBankIds]
      : [];

  if (bankIds.length === 0) {
    return [];
  }

  const unitFilter = bankIds.map((unitId) => `unit = "${unitId}"`).join(' || ');

  try {
    const questions = await pb.collection('partial_exam_questions').getFullList<PartialExamQuestion>({
      filter: `selected = true && (${unitFilter})`,
      expand: 'unit,document',
    });
    return shuffleItems(questions).slice(0, limit);
  } catch (error) {
    console.error('Error fetching partial exam simulation questions:', error);
    return [];
  }
}

export async function getLinks(parentId: string, parentType: 'class' | 'assignment' = 'class') {
  const pb = await createServerClient();
  const records = await pb.collection('links').getFullList<Link>({
      filter: `${parentType} = "${parentId}"`,
      sort: 'created',
  });
  return records;
}

function feedbackDate(feedback: DeliveryFeedback) {
  return new Date(feedback.sentAt || feedback.created).getTime();
}

function attachFeedbacksToDeliveries(deliveries: Delivery[], feedbacks: DeliveryFeedback[]) {
  const feedbacksByDelivery = new Map<string, DeliveryFeedback[]>();

  for (const feedback of feedbacks) {
    const current = feedbacksByDelivery.get(feedback.delivery) || [];
    current.push(feedback);
    feedbacksByDelivery.set(feedback.delivery, current);
  }

  return deliveries.map((delivery) => {
    const deliveryFeedbacks = (feedbacksByDelivery.get(delivery.id) || [])
      .sort((a, b) => feedbackDate(b) - feedbackDate(a));
    const latestFeedback = deliveryFeedbacks[0];

    return {
      ...delivery,
      feedbacks: deliveryFeedbacks,
      latestFeedback,
      grade: latestFeedback?.grade ?? delivery.grade,
      feedback: latestFeedback?.feedback ?? delivery.feedback,
      verdict: latestFeedback?.verdict ?? delivery.verdict,
    };
  });
}

function attachCorrectionContext(deliveries: Delivery[]) {
  const deliveriesByAssignment = new Map<string, Delivery[]>();

  for (const delivery of deliveries) {
    const assignmentId = delivery.assignment || delivery.expand?.assignment?.id;
    if (!assignmentId) continue;
    const current = deliveriesByAssignment.get(assignmentId) || [];
    current.push(delivery);
    deliveriesByAssignment.set(assignmentId, current);
  }

  return deliveries.map((delivery) => {
    if (delivery.verdict) {
      return delivery;
    }

    const assignmentId = delivery.assignment || delivery.expand?.assignment?.id;
    const assignmentDeliveries = assignmentId ? deliveriesByAssignment.get(assignmentId) || [] : [];
    const previousCorrection = assignmentDeliveries
      .filter((candidate) => new Date(candidate.created).getTime() < new Date(delivery.created).getTime())
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      .find((candidate) => candidate.verdict === 'Corregir y reenviar');

    if (!previousCorrection) {
      return delivery;
    }

    return {
      ...delivery,
      verdict: 'Corregir y reenviar' as const,
      latestFeedback: previousCorrection.latestFeedback,
    };
  });
}

async function getFeedbacksForDeliveries(pb: PocketBase, deliveryIds: string[]) {
  if (deliveryIds.length === 0) {
    return [];
  }

  const filter = deliveryIds.map((id) => `delivery = "${id}"`).join(" || ");
  return await pb.collection('delivery_feedbacks').getFullList<DeliveryFeedback>({
    filter,
    sort: '-sentAt',
    expand: 'teacher',
  });
}

async function getFeedbacksForAssignment(pb: PocketBase, assignmentId: string) {
  return await pb.collection('delivery_feedbacks').getFullList<DeliveryFeedback>({
    filter: `assignment = "${assignmentId}"`,
    sort: '-sentAt',
    expand: 'teacher',
  });
}

async function getFeedbacksForStudent(pb: PocketBase, userId: string) {
  return await pb.collection('delivery_feedbacks').getFullList<DeliveryFeedback>({
    filter: `student = "${userId}"`,
    sort: '-sentAt',
    expand: 'teacher',
  });
}

export async function getDeliveries(assignmentId: string) {
  const pb = await createServerClient();
  try {
     const records = await pb.collection('deliveries').getFullList<Delivery>({
         filter: `assignment = "${assignmentId}"`,
         sort: '-created',
         expand: 'student',
     });

     const feedbacks = await getFeedbacksForAssignment(pb, assignmentId);
     return attachFeedbacksToDeliveries(records, feedbacks);
   } catch (error) {
     console.error('Error fetching deliveries:', error);
     return [];
   }
}

export async function getAllDeliveries() {
  const pb = await createServerClient();
  try {
    const records = await pb.collection('deliveries').getFullList<Delivery>({
      sort: '-created',
      expand: 'student,assignment',
    });

    const feedbacks = await pb.collection('delivery_feedbacks').getFullList<DeliveryFeedback>({
      sort: '-sentAt',
      expand: 'teacher',
    });

    return attachFeedbacksToDeliveries(records, feedbacks);
  } catch {
    console.error('Error fetching all deliveries');
    return [];
  }
}

export async function getUserDelivery(assignmentId: string, userId: string) {
  const pb = await createServerClient();
  try {
    const records = await pb.collection('deliveries').getFullList<Delivery>({
      filter: `assignment = "${assignmentId}" && student = "${userId}"`,
      sort: '-created',
      expand: 'assignment',
    });
    const feedbacks = await getFeedbacksForStudent(pb, userId);
    return attachCorrectionContext(attachFeedbacksToDeliveries(records, feedbacks))[0] || null;
  } catch {
    // It's normal to not have a delivery yet
    return null;
  }
}

export async function getUserDeliveries(userId: string) {
  const pb = await createServerClient();
  try {
    const records = await pb.collection('deliveries').getFullList<Delivery>({
        filter: `student = "${userId}"`,
        sort: '-created',
        expand: 'assignment'
    });
    const feedbacks = await getFeedbacksForStudent(pb, userId);
    return attachCorrectionContext(attachFeedbacksToDeliveries(records, feedbacks));
  } catch (error) {
    console.error('Error fetching user deliveries:', error);
    return [];
  }
}

export async function getDeliveryById(deliveryId: string) {
  const pb = await createServerClient();
  try {
    const record = await pb.collection('deliveries').getOne<Delivery>(deliveryId, {
      expand: 'student,assignment'
    });
    const feedbacks = await getFeedbacksForDeliveries(pb, [deliveryId]);
    return attachFeedbacksToDeliveries([record], feedbacks)[0];
  } catch (error) {
    console.error('Error fetching delivery by ID:', error);
    return null;
  }
}
