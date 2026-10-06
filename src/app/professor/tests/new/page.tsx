import { requireRole } from "@/lib/dal";
import { CreateTestForm } from "@/components/tests/create-test-form";

export default async function NewTestPage() {
  await requireRole("PROFESSOR");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">Create a test</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Add the title and due date now — you&apos;ll add questions on the next screen.
      </p>
      <div className="mt-6">
        <CreateTestForm />
      </div>
    </div>
  );
}
