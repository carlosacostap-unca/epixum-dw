import { getClass, getLinks } from "@/lib/data";
import { notFound } from "next/navigation";
import { getResourceDownloadUrl } from "@/lib/actions";
import ClassPresentation from '@/components/ClassPresentation';

export default async function SlidesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const classData = await getClass(id);
    const links = await getLinks(id);

    let slidesUrl = undefined;

    // Buscar en los recursos de PocketBase (diapositivas)
    const slideLink = links.find((link: any) => link.type === 'slide');
    
    if (slideLink) {
        if (slideLink.url.startsWith('http')) {
             slidesUrl = slideLink.url;
        } else {
             const { url } = await getResourceDownloadUrl(slideLink.id);
             slidesUrl = url || undefined;
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
