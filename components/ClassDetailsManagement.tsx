"use client";

import { useState } from "react";
import { Class, Link as LinkType, User, Inquiry } from "@/types";
import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";
import { deleteLink, getResourceDownloadUrl } from "@/lib/actions";
import { useRouter } from "next/navigation";
import ClassForm from "./ClassForm";
import LinkForm from "./LinkForm";
import InquiryList from "./inquiries/InquiryList";

interface ClassDetailsManagementProps {
  user: User;
  classData: Class;
  links: LinkType[];
  inquiries: Inquiry[];
}

export default function ClassDetailsManagement({ user, classData, links, inquiries }: ClassDetailsManagementProps) {
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkType | null>(null);
  
  const router = useRouter();

  const handleDeleteLink = async (linkId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este enlace?")) {
      await deleteLink(linkId, classData.id, 'class');
      router.refresh();
    }
  };

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
                alert("No se pudo descargar el archivo.");
            }
        } catch (error) {
            console.error(error);
            alert("Error al descargar el archivo.");
        }
    }
  };

  return (
    <>
      <div className="mb-8">
          <Link href="/classes" className="text-blue-500 hover:underline inline-block">&larr; Volver a Clases</Link>
      </div>

      <header className="mb-12 relative group">
        <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={() => setIsEditingClass(true)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
                Editar Clase
            </button>
        </div>
        
        <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl mb-4 pr-12">
          {classData.title}
        </h1>
        {classData.date && (
            <p className="text-sm text-zinc-400 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <FormattedDate date={classData.date} showTime={true} />
            </p>
        )}
        <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-3xl mb-8">
          {classData.description}
        </p>
        <div className="mb-8 flex flex-wrap gap-4">
            <Link 
              href={`/classes/${classData.id}/slides`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ver Presentación
            </Link>

            <Link 
              href={`/classes/${classData.id}/speaker-notes`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-fuchsia-600 text-white rounded-md hover:bg-fuchsia-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Ver Notas de Orador
            </Link>
        </div>
      </header>

      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Recursos de la clase</h2>
            <Link
                href={`/classes/${classData.id}/resources/new`}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Agregar Recurso
            </Link>
        </div>
        
        {links.length === 0 ? (
          <p className="text-zinc-500">No hay recursos disponibles para esta clase.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {links.map((link) => (
              <div 
                key={link.id}
                className="relative block p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-all group"
              >
                 <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                     <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditingLink(link);
                        }}
                        className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-blue-600 rounded"
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
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        isFileResource(link) ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-200' : 
                        isSlideResource(link) ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-200' :
                        'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                        {isFileResource(link) ? 'ARCHIVO' : isSlideResource(link) ? 'DIAPOSITIVAS' : 'LINK'}
                    </span>
                    {isFileResource(link) ? (
                        <svg className="w-5 h-5 text-zinc-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    ) : isSlideResource(link) ? (
                        <svg className="w-5 h-5 text-zinc-400 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-zinc-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    )}
                    </div>
                    <h3 className={`text-lg font-bold transition-colors pr-8 ${
                        isFileResource(link) ? 'group-hover:text-purple-600 dark:group-hover:text-purple-400' : 
                        isSlideResource(link) ? 'group-hover:text-orange-600 dark:group-hover:text-orange-400' :
                        'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`}>
                    {link.title}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 truncate">
                        {isFileResource(link) ? link.url.split('/').pop() : link.url}
                    </p>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 mt-12">
        <h2 className="text-2xl font-bold mb-4">Consultas</h2>
        <InquiryList inquiries={inquiries} currentUser={user} context={{ classId: classData.id }} />
      </div>

      {/* Modals */}
      {isEditingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <ClassForm clase={classData} onClose={() => setIsEditingClass(false)} />
        </div>
      )}

      {editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <LinkForm classId={classData.id} link={editingLink} onClose={() => setEditingLink(null)} />
        </div>
      )}
    </>
  );
}
