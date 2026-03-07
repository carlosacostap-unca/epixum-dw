import { getAssignment, getLinks, getDeliveries, getUserDelivery } from "@/lib/data";
import { Assignment, Link as LinkType, Delivery, Inquiry } from "@/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/pocketbase-server";
import AssignmentDetailsManagement from "@/components/AssignmentDetailsManagement";
import StudentDelivery from "@/components/StudentDelivery";
import TeacherDeliveries from "@/components/TeacherDeliveries";
import { getInquiries } from "@/lib/actions-inquiries";
import InquiryList from "@/components/inquiries/InquiryList";

export const dynamic = 'force-dynamic';

export default async function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let assignment: Assignment;
  let links: LinkType[] = [];
  let inquiries: Inquiry[] = [];
  const user = await getCurrentUser();
  let deliveries: Delivery[] = [];
  let userDelivery: Delivery | null = null;
  
  try {
    assignment = await getAssignment(id);
    links = await getLinks(id, 'assignment');
    inquiries = await getInquiries({ assignmentId: id });
    
    if (user) {
        if (user.role === 'docente' || user.role === 'admin') {
            deliveries = await getDeliveries(id);
        } else if (user.role === 'estudiante') {
            userDelivery = await getUserDelivery(id, user.id);
        }
    }
  } catch (e) {
    console.error(e);
    return notFound();
  }

  const isAuthorized = user && (user.role === 'docente' || user.role === 'admin');

  if (isAuthorized) {
    return (
        <div className="container mx-auto p-8 min-h-screen space-y-8">
            <AssignmentDetailsManagement user={user} assignment={assignment} links={links} inquiries={inquiries} />
            <TeacherDeliveries deliveries={deliveries} assignmentId={assignment.id} />
        </div>
    );
  }

  return (
    <div className="container mx-auto p-8 min-h-screen">
      <Link href="/assignments" className="text-blue-500 hover:underline mb-8 inline-block">&larr; Volver a Trabajos Prácticos</Link>
      
      <header className="mb-12">
        <div className="flex items-center gap-4 mb-2">
            <span className="px-3 py-1 text-sm font-medium text-purple-600 bg-purple-100 rounded-full dark:bg-purple-900 dark:text-purple-200">
                TP
            </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl mb-4">
          {assignment.title}
        </h1>
        <div 
          className="prose dark:prose-invert max-w-3xl mb-8"
          dangerouslySetInnerHTML={{ __html: assignment.description }}
        />
      </header>

      <div className="space-y-6 mb-12">
        <h2 className="text-2xl font-bold mb-4">Enlaces</h2>
        
        {links.length === 0 ? (
          <p className="text-zinc-500">No hay enlaces disponibles para este trabajo práctico.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {links.map((link) => (
              <a 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer"
                key={link.id}
                className="block p-6 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h3 className="text-lg font-bold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {link.title}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 truncate max-w-[200px]">
                            {link.url}
                        </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                        LINK
                    </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 mb-12">
        <h2 className="text-2xl font-bold mb-4">Consultas</h2>
        <InquiryList inquiries={inquiries} currentUser={user} context={{ assignmentId: id }} />
      </div>

      {user && user.role === 'estudiante' && (
        <StudentDelivery 
            assignmentId={assignment.id} 
            delivery={userDelivery} 
        />
      )}
    </div>
  );
}
