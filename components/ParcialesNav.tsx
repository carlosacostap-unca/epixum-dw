import Link from "next/link";

const navItems = [
  { href: "/parciales", label: "Inicio" },
  { href: "/parciales/gestion", label: "Gestionar parciales" },
  { href: "/parciales/banco", label: "Banco de preguntas" },
];

export default function ParcialesNav() {
  return (
    <nav className="mb-8 flex flex-wrap gap-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-blue-800 dark:hover:text-blue-300"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
