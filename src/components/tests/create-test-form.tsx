"use client";

import { useActionState } from "react";
import { createTest } from "@/actions/tests";
import { Button, Card, FormMessage, Input, Label, Textarea } from "@/components/ui";

export function CreateTestForm() {
  const [state, action, pending] = useActionState(createTest, undefined);

  return (
    <Card>
      <form action={action} className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required placeholder="e.g. Chapter 4 review" />
        </div>
        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea id="description" name="description" rows={3} placeholder="Any instructions for students…" />
        </div>
        <div>
          <Label htmlFor="dueAt">Due date</Label>
          <Input id="dueAt" name="dueAt" type="datetime-local" required />
        </div>
        {state?.message && <FormMessage>{state.message}</FormMessage>}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create & add questions"}
        </Button>
      </form>
    </Card>
  );
}
