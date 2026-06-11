import { createServerClient } from "@/lib/pocketbase-server";
import ProfileForm from "@/components/profile/ProfileForm";
import { User } from "@/types";
import { notFound, redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const pb = await createServerClient();
  const currentUser = pb.authStore.model;

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role === "docente_invitado") {
    redirect("/proyecto-final");
  }

  // Fetch fresh user data to ensure we have the latest fields
  let userData: User;
  try {
    userData = await pb.collection("users").getOne<User>(currentUser.id);
  } catch (error) {
    // If user is logged in but record not found, it's weird, but handle it
    return notFound();
  }

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-zinc-900 dark:text-white">Mi Perfil</h1>
      <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 rounded-lg shadow-md overflow-hidden">
        <div className="p-6 md:p-8">
           <ProfileForm user={userData} />
        </div>
      </div>
    </div>
  );
}
