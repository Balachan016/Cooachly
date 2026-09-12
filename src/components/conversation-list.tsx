import Link from "next/link";
import type { User } from "@prisma/client";

export function ConversationList({
  basePath,
  conversations,
}: {
  basePath: string;
  conversations: { peer: User; lastMessage: { body: string; createdAt: Date } | null }[];
}) {
  if (conversations.length === 0) {
    return <p className="p-6 text-sm text-black/50 dark:text-white/50">No conversations yet.</p>;
  }

  return (
    <div className="divide-y divide-black/5 dark:divide-white/5">
      {conversations.map(({ peer, lastMessage }) => (
        <Link
          key={peer.id}
          href={`${basePath}/${peer.id}`}
          className="flex items-center justify-between px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5"
        >
          <div>
            <div className="font-medium">{peer.name}</div>
            {lastMessage && (
              <div className="max-w-xs truncate text-sm text-black/50 dark:text-white/50">{lastMessage.body}</div>
            )}
          </div>
          {lastMessage && (
            <div className="text-xs text-black/40 dark:text-white/40">
              {new Intl.DateTimeFormat("en-US", { dateStyle: "short" }).format(lastMessage.createdAt)}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
