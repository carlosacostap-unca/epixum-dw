"use client";

import { usePathname, useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { User } from "@/types";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Ensure we have the latest auth state from cookie
    pb.authStore.loadFromCookie(document.cookie);
    
    // Refresh user data from server to get latest role
    const refreshUser = async () => {
      if (pb.authStore.isValid && pb.authStore.model) {
        try {
          const updatedUser = await pb.collection('users').getOne(pb.authStore.model.id);
          // Update auth store with fresh data
          pb.authStore.save(pb.authStore.token, updatedUser);
          // Update cookie
          document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
          setUser(updatedUser as unknown as User);
        } catch (e: any) {
          if (e?.status === 404) {
            // If the user is not found, the session is likely invalid or from an old DB (e.g. localhost cookie conflict)
            // Silence the error and clear auth
            console.warn("User not found (404), clearing invalid session.");
            pb.authStore.clear();
            document.cookie = "pb_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            setUser(null);
          } else {
            console.error("Failed to refresh user data", e);
            setUser(pb.authStore.model as unknown as User);
          }
        }
      } else {
         setUser(pb.authStore.model as unknown as User);
      }
    };

    refreshUser();

    // Subscribe to auth changes to update UI
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model as unknown as User);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Don't show header on login page
  if (pathname === "/login") {
    return null;
  }

  const handleLogout = () => {
    pb.authStore.clear();
    document.cookie = "pb_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-4 px-6 mb-6">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="font-bold text-xl text-zinc-900 dark:text-zinc-100 hover:opacity-80 transition-opacity flex items-center gap-2">
          <Image 
            src="/epixum-logo.png" 
            alt="Epixum Logo" 
            width={32} 
            height={32} 
            className="w-8 h-8 object-contain"
          />
          <span>Epixum - Diseño Web</span>
        </Link>
        <div className="flex items-center gap-4">
          {user?.role === 'admin' && (
            <Link 
              href="/admin/users" 
              className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            >
              Administrar Usuarios
            </Link>
          )}
          {user && (
             <Link href="/profile" className="flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
               {user.avatar && (
                <img 
                  src={`${process.env.NEXT_PUBLIC_POCKETBASE_URL?.replace(/\/$/, '')}/api/files/_pb_users_auth_/${user.id}/${user.avatar}`} 
                  className="w-5 h-5 rounded-full object-cover"
                  alt=""
                />
              )}
               <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {user.name} 
                <span className="ml-1 opacity-60">({user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Estudiante'})</span>
              </span>
             </Link>
          )}
          <button
            onClick={handleLogout}
          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </button>
        </div>
      </div>
    </header>
  );
}
