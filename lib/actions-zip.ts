"use server";

import JSZip from "jszip";
import { createServerClient } from "@/lib/pocketbase-server";
import { getDeliveryDownloadUrl } from "./actions";
import { deleteFromS3 } from "./s3";
import { revalidatePath } from "next/cache";

export async function processDeliveryZip(deliveryId: string) {
  const pb = await createServerClient();
  const user = pb.authStore.model;

  if (!user || (user.role !== "docente" && user.role !== "admin")) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const delivery = await pb.collection("deliveries").getOne(deliveryId, { expand: "assignment" });
    if (!delivery || !delivery.repositoryUrl) {
      return { success: false, error: "No hay archivo para procesar." };
    }

    // Get the presigned URL for downloading
    const result = await getDeliveryDownloadUrl(deliveryId);
    if (!result.success || !result.url) {
      return { success: false, error: "No se pudo obtener la URL de descarga." };
    }

    // Download the ZIP file
    const response = await fetch(result.url);
    if (!response.ok) {
      return { success: false, error: "Error al descargar el archivo ZIP." };
    }
    
    const arrayBuffer = await response.arrayBuffer();

    // Extract the ZIP contents
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    let structure = "Estructura de archivos:\n";
    let contents = "\n\nContenido de los archivos (.html y .css):\n";
    
    const files = Object.keys(zip.files);
    for (const filename of files) {
      const file = zip.files[filename];
      if (file.dir) continue;
      
      structure += `- ${filename}\n`;
      
      if (filename.endsWith(".html") || filename.endsWith(".css")) {
        const text = await file.async("text");
        contents += `\n--- Archivo: ${filename} ---\n`;
        contents += text;
        contents += `\n-----------------------------\n`;
      }
    }
    
    const extractedContent = structure + contents;

    // Delete the file from S3
    let key = delivery.repositoryUrl;
    if (key.startsWith("http")) {
      const urlObj = new URL(key);
      key = decodeURIComponent(urlObj.pathname.split("/").pop() || "");
    }
    if (key) {
      await deleteFromS3(key);
    }

    // Update the delivery: replace repositoryUrl with the extracted content text
    await pb.collection("deliveries").update(deliveryId, {
      content: extractedContent,
      repositoryUrl: ""
    });

    if (delivery.expand?.assignment) {
      revalidatePath(`/assignments/${delivery.expand.assignment.id}`);
    }
    revalidatePath(`/deliveries/${deliveryId}`);

    return { success: true, extractedContent };
  } catch (error) {
    console.error("Error processing delivery zip:", error);
    return { success: false, error: "Error inesperado al procesar el archivo ZIP." };
  }
}
