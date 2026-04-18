"use client";

import { Inquiry, User } from "@/types";
import InquiryCard from "./InquiryCard";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

interface InquiryListProps {
  inquiries: Inquiry[];
  currentUser: User | null;
  context?: {
    classId?: string;
    assignmentId?: string;
  };
  showSearch?: boolean;
}

export default function InquiryList({ inquiries, currentUser, context, showSearch = false }: InquiryListProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "resolved" | "mine">("pending");
  
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search")?.toString() || "");

  // Update local state when URL changes (external navigation)
  useEffect(() => {
      // Only update if the value is different to avoid cursor jumping if we were typing
      const urlSearch = searchParams.get("search")?.toString() || "";
      if (urlSearch !== searchTerm) {
        setSearchTerm(urlSearch);
      }
  }, [searchParams]);

  // Debounce search update
  useEffect(() => {
    const timer = setTimeout(() => {
        const currentUrlSearch = searchParams.get("search")?.toString() || "";
        if (searchTerm !== currentUrlSearch) {
            const params = new URLSearchParams(searchParams);
            if (searchTerm) {
                params.set("search", searchTerm);
            } else {
                params.delete("search");
            }
            replace(`${pathname}?${params.toString()}`);
        }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, searchParams, pathname, replace]);

  const filteredInquiries = inquiries.filter((inquiry) => {
    if (filter === "pending") return inquiry.status === "Pendiente";
    if (filter === "resolved") return inquiry.status === "Resuelta";
    if (filter === "mine") return inquiry.author === currentUser?.id;
    return true;
  });

  let newInquiryHref = "/inquiries/new";
  const params = new URLSearchParams();
  if (context?.classId) params.set("classId", context.classId);
  if (context?.assignmentId) params.set("assignmentId", context.assignmentId);
  const queryString = params.toString();
  if (queryString) newInquiryHref += `?${queryString}`;

  return (
    <div className="space-y-6">
      {showSearch && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md leading-5 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out"
            placeholder="Buscar por título, descripción, autor, clase, trabajo práctico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              filter === "all"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              filter === "pending"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter("resolved")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              filter === "resolved"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            Resueltas
          </button>
          {currentUser && (
            <button
              onClick={() => setFilter("mine")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                filter === "mine"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Mis Consultas
            </button>
          )}
        </div>

        {currentUser && (
          <Link
            href={newInquiryHref}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Consulta
          </Link>
        )}
      </div>

      {filteredInquiries.length === 0 ? (
        <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
          <svg className="mx-auto h-12 w-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">No hay consultas</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {filter === "all" ? "Sé el primero en preguntar algo." : "No hay consultas con este filtro."}
          </p>
          {filter !== "all" && (
            <div className="mt-6">
              <button
                onClick={() => setFilter("all")}
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Ver todas las consultas
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInquiries.map((inquiry) => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} currentUser={currentUser} />
          ))}
        </div>
      )}
    </div>
  );
}
