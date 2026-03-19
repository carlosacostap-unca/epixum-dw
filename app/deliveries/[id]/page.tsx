import { getDeliveryById } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { notFound, redirect } from "next/navigation";
import TeacherGradingView from "@/components/TeacherGradingView";

export const dynamic = 'force-dynamic';

export default async function DeliveryGradingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'docente' && user.role !== 'admin')) {
    redirect('/');
  }

  const { id } = await params;
  const delivery = await getDeliveryById(id);

  if (!delivery || !delivery.expand?.assignment) {
    notFound();
  }

  const assignment = delivery.expand.assignment;

  return (
    <div className="container mx-auto p-8 min-h-screen">
      <TeacherGradingView delivery={delivery} assignment={assignment} />
    </div>
  );
}