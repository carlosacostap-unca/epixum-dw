"use server";

import fs from 'fs';
import path from 'path';

export interface SlideOption {
  filename: string;
  path: string;
  title: string;
}

export interface NoteOption {
  filename: string;
  path: string;
  title: string;
}

export interface StudyGuideOption {
  filename: string;
  path: string;
  title: string;
}

export async function getAvailableSlides() {
  const slidesDir = path.join(process.cwd(), 'public', 'slides');
  
  try {
    // Check if directory exists
    if (!fs.existsSync(slidesDir)) {
      return { success: true, slides: [] };
    }

    const files = await fs.promises.readdir(slidesDir);
    const slides: SlideOption[] = [];

    for (const file of files) {
      if (file.endsWith('.html') || file.endsWith('.pdf') || file.endsWith('.pptx')) {
        let title = '';
        const ext = path.extname(file);

        if (file.endsWith('.html')) {
            const filePath = path.join(slidesDir, file);
            const content = await fs.promises.readFile(filePath, 'utf-8');
            
            // Try to extract title from <title> tag
            const titleMatch = content.match(/<title>(.*?)<\/title>/i);
            title = titleMatch ? titleMatch[1].trim() : '';
        }

        // Fallback to filename if no title tag or if it's not html
        if (!title) {
          title = file
            .replace(ext, '')
            .replace(/-/g, ' ')
            .replace(/^\w/, (c) => c.toUpperCase());
        }

        // Add extension to title
        title = `${title} (${ext.replace('.', '')})`;

        slides.push({
          filename: file,
          path: `/slides/${file}`,
          title: title
        });
      }
    }
      
    return { success: true, slides };
  } catch (error) {
    console.error("Error reading slides directory:", error);
    return { success: false, error: "Error al listar las diapositivas", slides: [] };
  }
}

export async function getAvailableNotes() {
  const notesDir = path.join(process.cwd(), 'public', 'slides', 'notes');
  
  try {
    if (!fs.existsSync(notesDir)) {
      return { success: true, notes: [] };
    }

    const files = await fs.promises.readdir(notesDir);
    const notes: NoteOption[] = [];

    for (const file of files) {
      if (file.endsWith('.md') || file.endsWith('.pdf') || file.endsWith('.docx')) {
        let title = '';
        const ext = path.extname(file);

        if (file.endsWith('.md')) {
            const filePath = path.join(notesDir, file);
            const content = await fs.promises.readFile(filePath, 'utf-8');
            
            // Try to extract title from first # heading
            const titleMatch = content.match(/^#\s+(.*?)$/m);
            title = titleMatch ? titleMatch[1].trim() : '';
        }

        // Fallback to filename if no title found or not markdown
        if (!title) {
          title = file
            .replace(ext, '')
            .replace(/-/g, ' ')
            .replace(/^\w/, (c) => c.toUpperCase());
        }

        // Add extension to title
        title = `${title} (${ext.replace('.', '')})`;

        notes.push({
          filename: file,
          path: `/slides/notes/${file}`,
          title: title
        });
      }
    }
      
    return { success: true, notes };
  } catch (error) {
    console.error("Error reading notes directory:", error);
    return { success: false, error: "Error al listar las notas", notes: [] };
  }
}

export async function getAvailableStudyGuides() {
  const guidesDir = path.join(process.cwd(), 'public', 'slides', 'study-guides');
  
  try {
    if (!fs.existsSync(guidesDir)) {
      return { success: true, guides: [] };
    }

    const files = await fs.promises.readdir(guidesDir);
    const guides: StudyGuideOption[] = [];

    for (const file of files) {
      if (file.endsWith('.pdf') || file.endsWith('.docx') || file.endsWith('.md') || file.endsWith('.txt')) {
        let title = '';
        const ext = path.extname(file);

        // Fallback to filename
        title = file
          .replace(ext, '')
          .replace(/-/g, ' ')
          .replace(/^\w/, (c) => c.toUpperCase());

        // Add extension to title
        title = `${title} (${ext.replace('.', '')})`;

        guides.push({
          filename: file,
          path: `/slides/study-guides/${file}`,
          title: title
        });
      }
    }
      
    return { success: true, guides };
  } catch (error) {
    console.error("Error reading study guides directory:", error);
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

  const slidesDir = path.join(process.cwd(), 'public', 'slides');

  try {
    if (!fs.existsSync(slidesDir)) {
      await fs.promises.mkdir(slidesDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(slidesDir, file.name);
    
    await fs.promises.writeFile(filePath, buffer);
    
    return { success: true, message: "Diapositiva subida correctamente" };
  } catch (error) {
    console.error("Error uploading slide:", error);
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

  const notesDir = path.join(process.cwd(), 'public', 'slides', 'notes');
  try {
    if (!fs.existsSync(notesDir)) {
      await fs.promises.mkdir(notesDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(notesDir, file.name);
    await fs.promises.writeFile(filePath, buffer);

    return { success: true, message: "Nota subida correctamente" };
  } catch (error) {
    console.error("Error uploading note:", error);
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

  const guidesDir = path.join(process.cwd(), 'public', 'slides', 'study-guides');
  try {
    if (!fs.existsSync(guidesDir)) {
      await fs.promises.mkdir(guidesDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(guidesDir, file.name);
    await fs.promises.writeFile(filePath, buffer);

    return { success: true, message: "Apunte subido correctamente" };
  } catch (error) {
    console.error("Error uploading study guide:", error);
    return { success: false, error: "Error al subir el apunte" };
  }
}
