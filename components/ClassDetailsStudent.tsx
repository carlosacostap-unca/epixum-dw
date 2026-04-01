"use client";

import { Class, Link as LinkType, User, Inquiry } from "@/types";
import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";
import { getResourceDownloadUrl } from "@/lib/actions";
import InquiryList from "./inquiries/InquiryList";

interface ClassDetailsStudentProps {
  user: User | null;
  classData: Class;
  links: LinkType[];
  inquiries: Inquiry[];
}

export default function ClassDetailsStudent({ user, classData, links, inquiries }: ClassDetailsStudentProps) {
  
  const isFileResource = (link: LinkType) => {
    return link.type === 'file' || 
           link.url.includes('idrivee2.com') || 
           link.url.includes('epixum-javascript-storage');
  };

  const isSlideResource = (link: LinkType) => {
    return link.type === 'slide';
  };

  const isNoteResource = (link: LinkType) => {
    return link.type === 'note';
  };

  const isGuideResource = (link: LinkType) => {
    return link.type === 'study-guide';
  };

  const requiresPresignedUrl = (link: LinkType) => {
    return isFileResource(link) || isSlideResource(link) || isNoteResource(link) || isGuideResource(link);
  };

  const handleResourceClick = async (e: React.MouseEvent, link: LinkType) => {
    if (requiresPresignedUrl(link)) {
        e.preventDefault();
        try {
            const result = await getResourceDownloadUrl(link.id);
            if (result.success && result.url) {
                window.open(result.url, '_blank');
            } else {
                alert("No se pudo acceder al recurso.");
            }
        } catch (error) {
            console.error(error);
            alert("Error al acceder al recurso.");
        }
    }
  };

  return (
    <>
      <div className="mb-8">
          <Link href="/classes" className="text-blue-500 hover:underline inline-block">&larr; Volver a Clases</Link>
      </div>

      <header className="mb-12">
        <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl mb-4">
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
      </header>

      <div className="space-y-6 mb-12">
        <h2 className="text-2xl font-bold mb-4">Recursos de la clase</h2>
        
        {links.length === 0 ? (
          <p className="text-zinc-500">No hay recursos disponibles para esta clase.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {links.map((link) => (
              <a 
                href={isFileResource(link) ? '#' : link.url} 
                target={isFileResource(link) ? undefined : "_blank"}
                rel={isFileResource(link) ? undefined : "noopener noreferrer"}
                onClick={(e) => handleResourceClick(e, link)}
                key={link.id}
                className="block p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${isFileResource(link) ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-200' : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200'}`}>
                    {isFileResource(link) ? 'ARCHIVO' : 'LINK'}
                  </span>
                  {isFileResource(link) ? (
                    <svg className="w-5 h-5 text-zinc-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  ) : (
                    <svg className="w-5 h-5 text-zinc-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  )}
                </div>
                <h3 className={`text-lg font-bold transition-colors ${isFileResource(link) ? 'group-hover:text-purple-600 dark:group-hover:text-purple-400' : 'group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                  {link.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 truncate">
                    {isFileResource(link) ? link.url.split('/').pop() : link.url}
                </p>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Consultas</h2>
        <InquiryList inquiries={inquiries} currentUser={user} context={{ classId: classData.id }} />
      </div>
    </>
  );
}
