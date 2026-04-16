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
import ResourceLink from "@/components/ResourceLink";
import FormattedDate from "@/components/FormattedDate";

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
            <TeacherDeliveries deliveries={deliveries} assignment={assignment} />
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
            {assignment.dueDate && (!userDelivery || userDelivery.verdict !== 'Corregir y reenviar' || !assignment.correctionDueDate) && (
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${new Date(assignment.dueDate) < new Date() ? 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200' : 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200'}`}>
                    Vence: <FormattedDate date={assignment.dueDate} locale="es-AR" showTime={true} />
                </span>
            )}
            {userDelivery?.verdict === 'Corregir y reenviar' && assignment.correctionDueDate && (
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${new Date(assignment.correctionDueDate) < new Date() ? 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200' : 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200'}`}>
                    Vence (Reenvío): <FormattedDate date={assignment.correctionDueDate} locale="es-AR" showTime={true} />
                </span>
            )}
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
              <ResourceLink key={link.id} link={link} />
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
            studentName={user.name}
            assignmentTitle={assignment.title}
            assignment={assignment}
        />
      )}
    </div>
  );
}
