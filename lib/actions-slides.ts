"use server";

import path from 'path';
import { listS3Objects, uploadToS3, getPresignedDownloadUrl } from './s3';

export interface SlideOption {
  filename: string;
  path: string;
  key: string;
  title: string;
}

export interface NoteOption {
  filename: string;
  path: string;
  key: string;
  title: string;
}

export interface StudyGuideOption {
  filename: string;
  path: string;
  key: string;
  title: string;
}

export async function getAvailableSlides() {
  try {
    const objects = await listS3Objects('slides/');
    const slides: SlideOption[] = [];

    for (const obj of objects) {
      if (!obj.Key) continue;
      
      // Exclude objects in subdirectories like slides/notes/ or slides/study-guides/
      const parts = obj.Key.split('/');
      if (parts.length > 2) continue; // It's in a subdirectory
      if (parts[parts.length - 1] === '') continue; // It's a directory marker

      const file = parts[parts.length - 1];
      if (file.endsWith('.html') || file.endsWith('.pdf') || file.endsWith('.pptx')) {
        const ext = path.extname(file);
        let title = file
          .replace(ext, '')
          .replace(/-/g, ' ')
          .replace(/^\w/, (c) => c.toUpperCase());

        title = `${title} (${ext.replace('.', '')})`;
        
        const downloadUrl = await getPresignedDownloadUrl(obj.Key);

        slides.push({
          filename: file,
          path: downloadUrl,
          key: obj.Key,
          title: title
        });
      }
    }
      
    return { success: true, slides };
  } catch (error) {
    console.error("Error reading slides from S3:", error);
    return { success: false, error: "Error al listar las diapositivas", slides: [] };
  }
}

export async function getAvailableNotes() {
  try {
    const objects = await listS3Objects('slides/notes/');
    const notes: NoteOption[] = [];

    for (const obj of objects) {
      if (!obj.Key) continue;
      
      const parts = obj.Key.split('/');
      if (parts[parts.length - 1] === '') continue;

      const file = parts[parts.length - 1];
      if (file.endsWith('.md') || file.endsWith('.pdf') || file.endsWith('.docx')) {
        const ext = path.extname(file);
        let title = file
          .replace(ext, '')
          .replace(/-/g, ' ')
          .replace(/^\w/, (c) => c.toUpperCase());

        title = `${title} (${ext.replace('.', '')})`;

        const downloadUrl = await getPresignedDownloadUrl(obj.Key);

        notes.push({
          filename: file,
          path: downloadUrl,
          key: obj.Key,
          title: title
        });
      }
    }
      
    return { success: true, notes };
  } catch (error) {
    console.error("Error reading notes from S3:", error);
    return { success: false, error: "Error al listar las notas", notes: [] };
  }
}

export async function getAvailableStudyGuides() {
  try {
    const objects = await listS3Objects('slides/study-guides/');
    const guides: StudyGuideOption[] = [];

    for (const obj of objects) {
      if (!obj.Key) continue;
      
      const parts = obj.Key.split('/');
      if (parts[parts.length - 1] === '') continue;

      const file = parts[parts.length - 1];
      if (file.endsWith('.pdf') || file.endsWith('.docx') || file.endsWith('.md') || file.endsWith('.txt')) {
        const ext = path.extname(file);
        let title = file
          .replace(ext, '')
          .replace(/-/g, ' ')
          .replace(/^\w/, (c) => c.toUpperCase());

        title = `${title} (${ext.replace('.', '')})`;

        const downloadUrl = await getPresignedDownloadUrl(obj.Key);

        guides.push({
          filename: file,
          path: downloadUrl,
          key: obj.Key,
          title: title
        });
      }
    }
      
    return { success: true, guides };
  } catch (error) {
    console.error("Error reading study guides from S3:", error);
    return { success: false, error: "Error al listar los apuntes", guides: [] };
  }
}

export async function uploadSlide(formData: FormData) {
  const file = formData.get('file') as File;
  
  if (!file) {
    return { success: false, error: "No se seleccionó ningún archivo" };
  }

  const allowedExtensions = ['.html', '.pdf', '.pptx'];
  const ext = path.extname(file.name).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return { success: false, error: "El archivo debe ser .html, .pdf o .pptx" };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `slides/${file.name}`;
    await uploadToS3(key, buffer, file.type || 'application/octet-stream');
    
    return { success: true, message: "Diapositiva subida correctamente" };
  } catch (error) {
    console.error("Error uploading slide to S3:", error);
    return { success: false, error: "Error al subir la diapositiva" };
  }
}

export async function uploadNote(formData: FormData) {
  const file = formData.get('file') as File;
  
  if (!file) {
    return { success: false, error: "No se seleccionó ningún archivo" };
  }

  const allowedExtensions = ['.md', '.pdf', '.docx'];
  const ext = path.extname(file.name).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return { success: false, error: "El archivo debe ser .md, .pdf o .docx" };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `slides/notes/${file.name}`;
    await uploadToS3(key, buffer, file.type || 'application/octet-stream');

    return { success: true, message: "Nota subida correctamente" };
  } catch (error) {
    console.error("Error uploading note to S3:", error);
    return { success: false, error: "Error al subir la nota" };
  }
}

export async function uploadStudyGuide(formData: FormData) {
  const file = formData.get('file') as File;
  
  if (!file) {
    return { success: false, error: "No se seleccionó ningún archivo" };
  }

  const allowedExtensions = ['.pdf', '.docx', '.md', '.txt'];
  const ext = path.extname(file.name).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return { success: false, error: "El archivo debe ser .pdf, .docx, .md o .txt" };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `slides/study-guides/${file.name}`;
    await uploadToS3(key, buffer, file.type || 'application/octet-stream');

    return { success: true, message: "Apunte subido correctamente" };
  } catch (error) {
    console.error("Error uploading study guide to S3:", error);
    return { success: false, error: "Error al subir el apunte" };
  }
}
