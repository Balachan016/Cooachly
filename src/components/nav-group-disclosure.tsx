"use client";

import { useState } from "react";
import Link from "next/link";
import type { NavLink } from "@/components/dashboard-shell";

/** A collapsed-by-default section of nav links in the desktop sidebar, e.g. "Accounts". */
export function NavGroupDisclosure({ label, links }: { label: string; links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
      >
        {label}
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open && (
        <div className="ml-2 space-y-1 border-l border-black/10 pl-2 dark:border-white/10">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
