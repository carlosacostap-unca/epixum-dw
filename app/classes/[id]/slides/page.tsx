import { getClass, getLinks } from "@/lib/data";
import { notFound } from "next/navigation";
import { getResourceDownloadUrl } from "@/lib/actions";
import ClassPresentation from '@/components/ClassPresentation';
import fs from 'fs';
import path from 'path';

export default async function SlidesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const classData = await getClass(id);
    const links = await getLinks(id);

    let slidesUrl = undefined;

    // 1. Prioridad: Verificar si existe un archivo local en public/slides/${id}.html (Para desarrollo)
    const localSlidePath = path.join(process.cwd(), 'public', 'slides', `${id}.html`);
    if (fs.existsSync(localSlidePath)) {
        // Si existe, usamos la URL pública
        slidesUrl = `/slides/${id}.html`;
    } else {
        // 2. Si no hay local, buscar en los recursos de PocketBase
        // Buscar si hay un archivo que sea una presentación
        // Criterio: que el título incluya "slides" o "presentación" y sea tipo archivo,
        // o que sea un archivo .html
        const slidesLink = links.find(link => {
            const titleLower = link.title.toLowerCase();
            const urlLower = link.url.toLowerCase();
            const isSlidesTitle = titleLower.includes('slides') || titleLower.includes('presentacion') || titleLower.includes('presentación');
            const isHtmlFile = urlLower.endsWith('.html');
            
            return link.type === 'file' && (isSlidesTitle || isHtmlFile);
        });

        if (slidesLink) {
            const result = await getResourceDownloadUrl(slidesLink.id);
            if (result.success && result.url) {
                slidesUrl = result.url;
            }
        }
    }

    return (
        <ClassPresentation 
            title={classData.title}
            description={classData.description}
            slidesUrl={slidesUrl}
        />
    );
  } catch (e) {
    return notFound();
  }
}
