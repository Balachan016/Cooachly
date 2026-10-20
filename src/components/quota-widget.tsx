export type QuotaWidgetItem = {
  key: string;
  peerName: string;
  subject: string;
  monthlyClassQuota: number;
  scheduledCount: number;
  attendedCount: number;
};

export function QuotaWidget({ items }: { items: QuotaWidgetItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => {
        const pct = Math.min(100, Math.round((item.scheduledCount / item.monthlyClassQuota) * 100));
        const overQuota = item.scheduledCount > item.monthlyClassQuota;
        return (
          <div key={item.key} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
            <div className="font-medium">
              {item.subject} with {item.peerName}
            </div>
            <div className="text-xs text-black/50 dark:text-white/50">This month&apos;s plan: {item.monthlyClassQuota} classes</div>
            <div className="mt-2 flex items-center justify-between text-xs text-black/60 dark:text-white/60">
              <span>{item.scheduledCount} scheduled</span>
              <span>{item.attendedCount} attended</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div
                className={`h-full rounded-full ${overQuota ? "bg-amber-500" : "bg-brand-700 dark:bg-brand-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
