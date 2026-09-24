"use client";

import { Select } from "@/components/ui";

// A <select> that submits its enclosing <form> on change. Wrapped in its own
// Client Component because Server Components can't hand event handlers to
// the shared (Server-renderable) <Select>.
export function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <Select {...props} onChange={(e) => e.currentTarget.form?.submit()} />;
}
