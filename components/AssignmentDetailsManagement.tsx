"use client";

import { useState } from "react";
import { Assignment, Link as LinkType, User, Inquiry } from "@/types";
import Link from "next/link";
import { deleteLink } from "@/lib/actions";
import { getResourceDownloadUrl } from "@/lib/actions";
import { useRouter } from "next/navigation";
import AssignmentForm from "./AssignmentForm";
import LinkForm from "./LinkForm";
import InquiryList from "./inquiries/InquiryList";

import FormattedDate from "@/components/FormattedDate";

interface AssignmentDetailsManagementProps {
  user: User;
  assignment: Assignment;
  links: LinkType[];
  inquiries: Inquiry[];
}

export default function AssignmentDetailsManagement({ user, assignment, links, inquiries }: AssignmentDetailsManagementProps) {
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkType | null>(null);
  
  const router = useRouter();

  const isFileResource = (link: LinkType) => {
    return link.type === 'file' || 
           link.url.includes('idrivee2.com') || 
           link.url.includes('epixum-javascript-storage');
  };

  const isSlideResource = (link: LinkType) => {
    return link.type === 'slide';
  };

  const handleResourceClick = async (e: React.MouseEvent, link: LinkType) => {
    if (isFileResource(link)) {
        e.preventDefault();
        try {
            const result = await getResourceDownloadUrl(link.id);
            if (result.success && result.url) {
                window.open(result.url, '_blank');
            } else {
                alert("No se pudo acceder al archivo.");
            }
        } catch (error) {
            console.error(error);
            alert("Error al acceder al archivo.");
        }
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este enlace?")) {
      await deleteLink(linkId, assignment.id, 'assignment');
      router.refresh();
    }
  };

  return (
    <>
      <div className="mb-8">
          <Link href="/assignments" className="text-blue-500 hover:underline inline-block">&larr; Volver a Trabajos Prácticos</Link>
      </div>

      <header className="mb-12 relative group">
        <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={() => setIsEditingAssignment(true)}
                className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
            >
                Editar TP
            </button>
        </div>
        
        <div className="flex items-center gap-4 mb-2">
                <span className="px-3 py-1 text-sm font-medium text-purple-600 bg-purple-100 rounded-full dark:bg-purple-900 dark:text-purple-200">
                    TP
                </span>
                {assignment.dueDate && (
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${new Date(assignment.dueDate) < new Date() ? 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200' : 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200'}`}>
                        Vence: <FormattedDate date={assignment.dueDate} locale="es-AR" />
                    </span>
                )}
            </div>
        <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl mb-4 pr-12">
          {assignment.title}
        </h1>
        <div 
          className="prose dark:prose-invert max-w-3xl mb-8"
          dangerouslySetInnerHTML={{ __html: assignment.description }}
        />
        
        {assignment.type === 'file_upload' && assignment.aiPrompt && (
          <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg max-w-3xl">
            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Prompt de Preevaluación (IA)
            </h3>
            <p className="text-sm text-blue-900 dark:text-blue-200 whitespace-pre-wrap">{assignment.aiPrompt}</p>
          </div>
        )}
      </header>

      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Enlaces</h2>
            <button
                onClick={() => setIsCreatingLink(true)}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Agregar Enlace
            </button>
        </div>
        
        {assignment.type === 'questionnaire' && assignment.questions && assignment.questions.length > 0 && (
            <div className="mb-8 p-6 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="p-1 bg-purple-100 dark:bg-purple-900 rounded-md">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </span>
                    Cuestionario ({assignment.questions.length} preguntas)
                </h3>
                <div className="space-y-4">
                    {assignment.questions.map((q, idx) => (
                        <div key={q.id} className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-700">
                            <span className="text-sm font-bold text-zinc-500 mb-1 block">Pregunta {idx + 1}</span>
                            <p className="text-zinc-800 dark:text-zinc-200">{q.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {links.length === 0 ? (
          <p className="text-zinc-500">No hay enlaces disponibles para este trabajo práctico.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {links.map((link) => (
              <div 
                key={link.id}
                className="relative block p-6 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-all group"
              >
                 <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                     <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditingLink(link);
                        }}
                        className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-purple-600 rounded"
                     >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                     </button>
                     <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLink(link.id);
                        }}
                        className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-red-600 rounded"
                     >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                     </button>
                 </div>

                <a 
                    href={isFileResource(link) ? '#' : link.url} 
                    target={isFileResource(link) ? undefined : "_blank"} 
                    rel={isFileResource(link) ? undefined : "noopener noreferrer"} 
                    onClick={(e) => handleResourceClick(e, link)}
                    className="block h-full"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className={`text-lg font-bold transition-colors pr-8 ${
                                isFileResource(link) ? 'group-hover:text-purple-600 dark:group-hover:text-purple-400' : 
                                isSlideResource(link) ? 'group-hover:text-orange-600 dark:group-hover:text-orange-400' :
                                'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                            }`}>
                            {link.title}
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 truncate max-w-[200px]">
                                {isFileResource(link) ? link.url.split('/').pop() : link.url}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                isFileResource(link) ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-200' : 
                                isSlideResource(link) ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-200' :
                                'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                                {isFileResource(link) ? 'ARCHIVO' : isSlideResource(link) ? 'DIAPOSITIVA' : 'LINK'}
                            </span>
                            {isSlideResource(link) && (
                                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                </svg>
                            )}
                        </div>
                    </div>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 mt-12">
        <h2 className="text-2xl font-bold mb-4">Consultas</h2>
        <InquiryList inquiries={inquiries} currentUser={user} context={{ assignmentId: assignment.id }} />
      </div>

      {/* Modals */}
      {isEditingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <AssignmentForm assignment={assignment} onClose={() => setIsEditingAssignment(false)} />
        </div>
      )}

      {isCreatingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <LinkForm assignmentId={assignment.id} onClose={() => setIsCreatingLink(false)} />
        </div>
      )}

      {editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <LinkForm assignmentId={assignment.id} link={editingLink} onClose={() => setEditingLink(null)} />
        </div>
      )}
    </>
  );
}
