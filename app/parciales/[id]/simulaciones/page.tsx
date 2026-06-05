import { redirect } from "next/navigation";

export default async function RedirectLegacyPartialExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/parciales/${id}/resultados`);
}
