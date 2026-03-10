import { promises as fs } from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

export default async function SpeakerNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const filePath = path.join(process.cwd(), 'public', 'slides', 'notes', `${id}.md`);
  
  let content = '';
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    content = `# No se encontraron notas para esta clase.\n\nActualmente no hay notas de orador disponibles para la clase con ID: ${id}.`;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 border-b border-zinc-200 dark:border-zinc-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Notas de Orador</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">Guion y apuntes para la presentación.</p>
          </div>
          <Link 
            href={`/classes/${id}`} 
            className="inline-flex items-center px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Volver a la Clase
          </Link>
        </header>
        
        <article className="prose prose-zinc dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-12 prose-h2:border-b prose-h2:border-zinc-100 dark:prose-h2:border-zinc-800 prose-h2:pb-4 prose-p:text-lg prose-p:leading-relaxed prose-li:text-lg">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
