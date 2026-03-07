import CreateInquiryForm from "@/components/inquiries/CreateInquiryForm";
import { getAllClasses, getAllAssignments } from "@/lib/data";

export default async function NewInquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const classId = typeof resolvedSearchParams.classId === "string" ? resolvedSearchParams.classId : undefined;
  const assignmentId = typeof resolvedSearchParams.assignmentId === "string" ? resolvedSearchParams.assignmentId : undefined;

  const classes = await getAllClasses();
  const assignments = await getAllAssignments();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white">Nueva Consulta</h1>
      <CreateInquiryForm 
        initialClassId={classId} 
        initialAssignmentId={assignmentId} 
        classes={classes}
        assignments={assignments}
      />
    </div>
  );
}
