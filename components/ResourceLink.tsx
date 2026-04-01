"use client";

import { Link as LinkType } from "@/types";
import { getResourceDownloadUrl } from "@/lib/actions";

interface ResourceLinkProps {
  link: LinkType;
}

export default function ResourceLink({ link }: ResourceLinkProps) {
  const isFileResource = (link: LinkType) => {
    return link.type === 'file' || 
           link.type === 'slide' || 
           link.type === 'note' || 
           link.type === 'study-guide' || 
           link.url.includes('idrivee2.com') || 
           link.url.includes('epixum-javascript-storage');
  };

  const handleResourceClick = async (e: React.MouseEvent) => {
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

  return (
    <a 
      href={isFileResource(link) ? '#' : link.url} 
      target={isFileResource(link) ? undefined : "_blank"} 
      rel={isFileResource(link) ? undefined : "noopener noreferrer"}
      onClick={handleResourceClick}
      className="block p-6 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-all group h-full"
    >
      <div className="flex items-center justify-between mb-2">
          <div>
              <h3 className="text-lg font-bold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors pr-8">
              {link.title}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 truncate max-w-[200px]">
                  {isFileResource(link) ? link.url.split('/').pop() : link.url}
              </p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${isFileResource(link) ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-200' : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200'}`}>
              {isFileResource(link) ? 'ARCHIVO' : 'LINK'}
          </span>
      </div>
    </a>
  );
}
