"use client";

import { createLink, updateLink, getResourceUploadUrl } from "@/lib/actions";
import { Link as LinkType } from "@/types";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { getAvailableSlides, getAvailableNotes, getAvailableStudyGuides, SlideOption, NoteOption, StudyGuideOption } from "@/lib/actions-slides";

interface LinkFormProps {
  link?: LinkType;
  classId?: string;
  assignmentId?: string;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export default function LinkForm({ link, classId, assignmentId, onClose, isEmbedded = false }: LinkFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resourceType, setResourceType] = useState<'link' | 'file' | 'slide' | 'note' | 'study-guide'>(link?.type as any || 'link');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [slides, setSlides] = useState<SlideOption[]>([]);
  const [notes, setNotes] = useState<NoteOption[]>([]);
  const [guides, setGuides] = useState<StudyGuideOption[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [selectedSlidePath, setSelectedSlidePath] = useState<string>(link?.type === 'slide' ? link.url : "");
  const [selectedNotePath, setSelectedNotePath] = useState<string>(link?.type === 'note' ? link.url : "");
  const [selectedGuidePath, setSelectedGuidePath] = useState<string>(link?.type === 'study-guide' ? link.url : "");

  useEffect(() => {
    if (resourceType === 'slide') {
      setLoadingSlides(true);
      getAvailableSlides()
        .then(res => {
          if (res.success) {
            setSlides(res.slides);
            if (!selectedSlidePath && res.slides.length > 0 && !link) {
              setSelectedSlidePath(res.slides[0].path);
            }
          }
        })
        .finally(() => setLoadingSlides(false));
    } else if (resourceType === 'note') {
      setLoadingNotes(true);
      getAvailableNotes()
        .then(res => {
          if (res.success) {
            setNotes(res.notes);
            if (!selectedNotePath && res.notes.length > 0 && !link) {
              setSelectedNotePath(res.notes[0].path);
            }
          }
        })
        .finally(() => setLoadingNotes(false));
    } else if (resourceType === 'study-guide') {
      setLoadingGuides(true);
      getAvailableStudyGuides()
        .then(res => {
          if (res.success) {
            setGuides(res.guides);
            if (!selectedGuidePath && res.guides.length > 0 && !link) {
              setSelectedGuidePath(res.guides[0].path);
            }
          }
        })
        .finally(() => setLoadingGuides(false));
    }
  }, [resourceType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    
    try {
      const title = formData.get('title') as string;
      let url = formData.get('url') as string;

      if (resourceType === 'file') {
        if (!selectedFile && !link) {
            throw new Error("Debes seleccionar un archivo");
        }
        
        if (selectedFile) {
            // Get presigned URL
            const uploadAuth = await getResourceUploadUrl(selectedFile.name, selectedFile.type);
            if (!uploadAuth.success || !uploadAuth.url) {
                throw new Error(uploadAuth.error || "Error al obtener URL de subida");
            }

            // Upload file
            const uploadRes = await fetch(uploadAuth.url, {
                method: "PUT",
                body: selectedFile,
                headers: {
                    "Content-Type": selectedFile.type
                }
            });

            if (!uploadRes.ok) {
                throw new Error("Error al subir el archivo");
            }

            // Clean URL
            url = uploadAuth.url.split('?')[0];
        } else if (link) {
            // Keep existing URL if editing and no new file selected
            url = link.url;
        }
      } else if (resourceType === 'slide') {
        url = selectedSlidePath;
        if (!url) {
          throw new Error("Debes seleccionar una diapositiva");
        }
      } else if (resourceType === 'note') {
        url = selectedNotePath;
        if (!url) {
          throw new Error("Debes seleccionar una nota del orador");
        }
      } else if (resourceType === 'study-guide') {
        url = selectedGuidePath;
        if (!url) {
          throw new Error("Debes seleccionar un apunte");
        }
      }

      // Prepare final form data
      const finalFormData = new FormData();
      finalFormData.append('title', title);
      finalFormData.append('url', url);
      finalFormData.append('type', resourceType);
      
      if (classId) finalFormData.append("classId", classId);
      if (assignmentId) finalFormData.append("assignmentId", assignmentId);

      let result;
      if (link) {
        result = await updateLink(link.id, finalFormData);
      } else {
        result = await createLink(finalFormData);
      }

      if (result.success) {
        if (onClose) onClose();
        router.refresh();
      } else {
        setError(result.error || "Ocurrió un error");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  }

  const containerClasses = isEmbedded 
    ? "w-full"
    : "bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 max-w-md w-full";

  return (
    <div className={containerClasses}>
      <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
        {link ? "Editar Recurso" : "Nuevo Recurso"}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Tipo de Recurso
          </label>
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="resourceType"
                value="link"
                checked={resourceType === 'link'}
                onChange={() => setResourceType('link')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Enlace</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="resourceType"
                value="file"
                checked={resourceType === 'file'}
                onChange={() => setResourceType('file')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Archivo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="resourceType"
                value="slide"
                checked={resourceType === 'slide'}
                onChange={() => setResourceType('slide')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Diapositiva</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="resourceType"
                value="note"
                checked={resourceType === 'note'}
                onChange={() => setResourceType('note')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Nota de Orador</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="resourceType"
                value="study-guide"
                checked={resourceType === 'study-guide'}
                onChange={() => setResourceType('study-guide')}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-300">Apunte</span>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Título
          </label>
          <input
            type="text"
            name="title"
            id="title"
            defaultValue={link?.title}
            required
            placeholder={
              resourceType === 'link' ? "Ej: Documentación oficial" : 
              resourceType === 'file' ? "Ej: Guía de estudio PDF" :
              resourceType === 'slide' ? "Ej: Clase 1 - Introducción" :
              resourceType === 'note' ? "Ej: Notas Clase 1" :
              "Ej: Apunte de Repaso"
            }
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
          />
        </div>

        {resourceType === 'link' && (
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              URL
            </label>
            <input
              type="url"
              name="url"
              id="url"
              defaultValue={link?.url}
              required
              placeholder="https://..."
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
            />
          </div>
        )}

        {resourceType === 'file' && (
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Archivo
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                required={!link} // Required only if creating new
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-100 rounded-md transition-colors text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Seleccionar archivo
              </button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-xs">
                {selectedFile ? selectedFile.name : (link ? "Archivo actual: " + link.url.split('/').pop() : "Ningún archivo seleccionado")}
              </span>
            </div>
          </div>
        )}

        {resourceType === 'slide' && (
          <div>
            <label htmlFor="slide" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Seleccionar Diapositiva
            </label>
            {loadingSlides ? (
              <div className="text-sm text-zinc-500">Cargando diapositivas...</div>
            ) : (
              <select
                id="slide"
                value={selectedSlidePath}
                onChange={(e) => setSelectedSlidePath(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              >
                {slides.length === 0 && <option value="">No hay diapositivas disponibles</option>}
                {slides.map(slide => (
                  <option key={slide.path} value={slide.path}>
                    {slide.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {resourceType === 'note' && (
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Seleccionar Nota de Orador
            </label>
            {loadingNotes ? (
              <div className="text-sm text-zinc-500">Cargando notas...</div>
            ) : (
              <select
                id="note"
                value={selectedNotePath}
                onChange={(e) => setSelectedNotePath(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              >
                {notes.length === 0 && <option value="">No hay notas disponibles</option>}
                {notes.map(note => (
                  <option key={note.path} value={note.path}>
                    {note.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {resourceType === 'study-guide' && (
          <div>
            <label htmlFor="guide" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Seleccionar Apunte
            </label>
            {loadingGuides ? (
              <div className="text-sm text-zinc-500">Cargando apuntes...</div>
            ) : (
              <select
                id="guide"
                value={selectedGuidePath}
                onChange={(e) => setSelectedGuidePath(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
              >
                {guides.length === 0 && <option value="">No hay apuntes disponibles</option>}
                {guides.map(guide => (
                  <option key={guide.path} value={guide.path}>
                    {guide.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {link ? "Guardar Cambios" : "Crear Recurso"}
          </button>
        </div>
      </form>
    </div>
  );
}