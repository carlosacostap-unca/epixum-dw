"use server";

import { createServerClient } from "@/lib/pocketbase-server";
import { revalidatePath } from "next/cache";

interface UserProfileData {
  firstName?: string;
  lastName?: string;
  dni?: string;
  enrollmentId?: string;
  birthDate?: string;
  phone?: string;
  approvedWebDesignModule?: boolean;
}

export async function updateUserProfile(userId: string, data: UserProfileData) {
  const pb = await createServerClient();
  const currentUser = pb.authStore.model;

  if (!currentUser) {
    return { success: false, error: "No autorizado" };
  }

  // Allow users to update their own profile, or admins to update anyone
  if (currentUser.id !== userId && currentUser.role !== 'admin') {
    return { success: false, error: "No autorizado para editar este perfil" };
  }

  try {
    const updateData: any = {
      firstName: data.firstName,
      lastName: data.lastName,
      dni: data.dni,
      enrollmentId: data.enrollmentId,
      phone: data.phone,
      approvedWebDesignModule: data.approvedWebDesignModule,
    };

    // Handle birthDate
    if (data.birthDate) {
      // Input type="date" returns YYYY-MM-DD
      // PocketBase expects a date string or ISO string
      updateData.birthDate = new Date(data.birthDate).toISOString();
    } else if (data.birthDate === "") {
        updateData.birthDate = null;
    }

    // Auto-update 'name' field if both firstName and lastName are present
    if (data.firstName && data.lastName) {
      updateData.name = `${data.firstName} ${data.lastName}`;
    }

    // Filter out undefined values to avoid overwriting with empty if not intended (though form usually sends everything)
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    await pb.collection("users").update(userId, updateData);
    
    revalidatePath("/profile");
    revalidatePath("/"); // Update globally if user info is in header
    
    return { success: true };
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return { success: false, error: error?.message || "Error al actualizar perfil" };
  }
}
