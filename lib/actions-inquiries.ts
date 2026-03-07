"use server";

import { createServerClient } from "./pocketbase-server";
import { revalidatePath } from "next/cache";
import { Inquiry, InquiryResponse } from "@/types";

// --- Inquiries ---

export async function getInquiries(filter?: { classId?: string; assignmentId?: string; status?: string; authorId?: string; search?: string }) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) return [];

  try {
    const filters = [];

    if (filter?.classId) filters.push(`class = "${filter.classId}"`);
    if (filter?.assignmentId) filters.push(`assignment = "${filter.assignmentId}"`);
    if (filter?.status) filters.push(`status = "${filter.status}"`);
    if (filter?.authorId) filters.push(`author = "${filter.authorId}"`);

    if (filter?.search) {
      const searchTerm = filter.search.replace(/"/g, '\\"');
      
      // Buscar en respuestas (limitado a 50 resultados para no sobrecargar)
      const matchingResponseRecords = await pb.collection("inquiry_responses").getList(1, 50, {
        filter: `content ~ "${searchTerm}"`,
        fields: "inquiry",
      });
      const inquiryIdsFromResponses = matchingResponseRecords.items.map(r => r.inquiry as string);
      
      const orConditions = [
        `title ~ "${searchTerm}"`,
        `description ~ "${searchTerm}"`,
        `author.name ~ "${searchTerm}"`,
        `author.email ~ "${searchTerm}"`,
        `class.title ~ "${searchTerm}"`,
        `assignment.title ~ "${searchTerm}"`,
      ];

      if (inquiryIdsFromResponses.length > 0) {
        // Añadir IDs de inquiries encontradas por respuestas
        // Usamos id = "id1" || id = "id2" ...
        // Para evitar query muy larga, si son muchas, quizás solo tomamos las primeras 20
        const limitedIds = inquiryIdsFromResponses.slice(0, 20);
        limitedIds.forEach(id => {
            if (id) orConditions.push(`id = "${id}"`);
        });
      }

      filters.push(`(${orConditions.join(" || ")})`);
    }

    const filterString = filters.join(" && ");

    const inquiries = await pb.collection("inquiries").getFullList<Inquiry>({
      filter: filterString,
      sort: "-created",
      expand: "author,class,assignment",
    });

    return inquiries;
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    return [];
  }
}

export async function getInquiry(id: string) {
  const pb = await createServerClient();
  try {
    const inquiry = await pb.collection("inquiries").getOne<Inquiry>(id, {
      expand: "author,class,assignment",
    });
    return { success: true, data: inquiry };
  } catch (error: any) {
    // Suppress 404 errors as they are expected when resource is not found
    if (error?.status !== 404) {
      console.error("Error fetching inquiry:", error);
    }
    return { success: false, error: "Consulta no encontrada" };
  }
}

export async function createInquiry(data: { title: string; description: string; classId?: string; assignmentId?: string }) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) return { success: false, error: "No autorizado" };

  try {
    const newInquiry: any = {
      title: data.title,
      description: data.description,
      status: "Pendiente",
      author: user.id,
    };

    if (data.classId) newInquiry.class = data.classId;
    if (data.assignmentId) newInquiry.assignment = data.assignmentId;

    const record = await pb.collection("inquiries").create(newInquiry);
    
    revalidatePath("/inquiries");
    if (data.classId) revalidatePath(`/classes/${data.classId}`);
    if (data.assignmentId) revalidatePath(`/assignments/${data.assignmentId}`);
    
    return { success: true, data: record };
  } catch (error: any) {
    console.error("Error creating inquiry:", error);
    if (error?.response) {
      console.error("PB Validation Errors:", JSON.stringify(error.response, null, 2));
    }
    return { success: false, error: error?.message || "Error al crear la consulta" };
  }
}

export async function updateInquiryStatus(id: string, status: "Pendiente" | "Resuelta") {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) return { success: false, error: "No autorizado" };

  try {
    // Permission check is handled by PocketBase rules (author or teacher/admin)
    // But we can double check here if needed, but let's rely on PB rules + try/catch
    await pb.collection("inquiries").update(id, { status });
    revalidatePath(`/inquiries/${id}`);
    revalidatePath("/inquiries");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating inquiry status:", error);
    return { success: false, error: error?.message || "Error al actualizar estado" };
  }
}

export async function deleteInquiry(id: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) return { success: false, error: "No autorizado" };

  try {
    await pb.collection("inquiries").delete(id);
    revalidatePath("/inquiries");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting inquiry:", error);
    return { success: false, error: error?.message || "Error al eliminar la consulta" };
  }
}

// --- Responses ---

export async function getInquiryResponses(inquiryId: string) {
  const pb = await createServerClient();
  try {
    const responses = await pb.collection("inquiry_responses").getFullList<InquiryResponse>({
      filter: `inquiry = "${inquiryId}"`,
      sort: "created",
      expand: "author",
    });
    return responses;
  } catch (error) {
    console.error("Error fetching responses:", error);
    return [];
  }
}

export async function createInquiryResponse(inquiryId: string, content: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) return { success: false, error: "No autorizado" };

  try {
    const newResponse = {
      inquiry: inquiryId,
      author: user.id,
      content,
    };

    await pb.collection("inquiry_responses").create(newResponse);
    revalidatePath(`/inquiries/${inquiryId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error creating response:", error);
    return { success: false, error: error?.message || "Error al enviar respuesta" };
  }
}

export async function deleteInquiryResponse(responseId: string, inquiryId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user) return { success: false, error: "No autorizado" };

  try {
    await pb.collection("inquiry_responses").delete(responseId);
    revalidatePath(`/inquiries/${inquiryId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting response:", error);
    return { success: false, error: error?.message || "Error al eliminar respuesta" };
  }
}
