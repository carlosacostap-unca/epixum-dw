"use server";

import { createServerClient } from "@/lib/pocketbase-server";
import { revalidatePath } from "next/cache";
import { getPresignedUploadUrl, getPresignedDownloadUrl, configureBucketCors } from "./s3";
import { generateAIEvaluation } from "./ai";
import { Assignment } from "@/types";
import PocketBase from "pocketbase";
import { getDeliveryLimitDate } from "./delivery-deadlines";

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
    const adminPb = await createAdminClient();
    await adminPb.collection('assignments').getOne(assignmentId);

    const students = await adminPb.collection('users').getFullList({
      filter: 'role = "estudiante"',
      fields: 'id',
    });
    const deliveries = await adminPb.collection('deliveries').getFullList({
      filter: `assignment = "${assignmentId}"`,
      sort: '-created',
      fields: 'id,student,status,created',
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
          content: {
            administrativeApproval: true,
            reason: 'No requiere entrega digital',
          },
        });
        createdDeliveries++;
      } else if (delivery.status !== 'graded') {
        await adminPb.collection('deliveries').update(delivery.id, { status: 'graded' });
        updatedDeliveries++;
      }

      await adminPb.collection('delivery_feedbacks').create({
        delivery: delivery.id,
        assignment: assignmentId,
        student: student.id,
        teacher: user.id,
        grade: 10,
        feedback: feedbackText,
        verdict: 'Aprobado',
        sentAt,
      });
      createdFeedbacks++;
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
    const adminPb = await createAdminClient();
    await adminPb.collection('assignments').getOne(assignmentId);
    const student = await adminPb.collection('users').getOne(studentId);

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
      fields: 'id,status,created',
    });

    let delivery = deliveries[0];

    if (!delivery) {
      delivery = await adminPb.collection('deliveries').create({
        assignment: assignmentId,
        student: studentId,
        status: 'graded',
        content: {
          administrativeApproval: true,
          reason: 'No requiere entrega digital',
        },
      });
    } else if (delivery.status !== 'graded') {
      delivery = await adminPb.collection('deliveries').update(delivery.id, { status: 'graded' });
    }

    await adminPb.collection('delivery_feedbacks').create({
      delivery: delivery.id,
      assignment: assignmentId,
      student: studentId,
      teacher: user.id,
      grade: 10,
      feedback: '<p>Trabajo aprobado. No requiere entrega digital.</p>',
      verdict: 'Aprobado',
      sentAt: new Date().toISOString(),
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
    const adminPb = await createAdminClient();
    await adminPb.collection('assignments').getOne(assignmentId);
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
