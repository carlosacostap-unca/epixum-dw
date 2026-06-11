import { NextResponse } from "next/server";

import { getFinalProjectPresentationSlots } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { isFinalProjectEvaluatorRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (user.role !== "estudiante" && !isFinalProjectEvaluatorRole(user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const slots = await getFinalProjectPresentationSlots();
  return NextResponse.json({ slots });
}
