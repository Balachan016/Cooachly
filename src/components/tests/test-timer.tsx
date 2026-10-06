"use client";

import { useEffect, useRef, useState } from "react";
import { tickTestTimer } from "@/actions/tests";

const SYNC_INTERVAL_MS = 5000;

function formatTime(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Pause/resume works because time only ever accrues on the server in
 * response to a heartbeat from here, sent on an interval only while this
 * component is mounted and the tab is visible — close the tab, navigate
 * away, or lose connection, and the clock simply stops advancing server
 * side until the student comes back and this remounts.
 */
export function TestTimer({ assignmentId, initialRemainingSeconds }: { assignmentId: string; initialRemainingSeconds: number }) {
  const [remaining, setRemaining] = useState(initialRemainingSeconds);
  const reloadedRef = useRef(false);

  function handleExpiry() {
    if (reloadedRef.current) return;
    reloadedRef.current = true;
    window.location.reload();
  }

  // Local 1s ticker, purely for a smooth display between server syncs.
  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // The actual pause/resume + expiry mechanism.
  useEffect(() => {
    let lastSync = Date.now();
    const id = setInterval(async () => {
      if (document.visibilityState !== "visible") {
        lastSync = Date.now();
        return;
      }
      const now = Date.now();
      const delta = Math.round((now - lastSync) / 1000);
      lastSync = now;
      if (delta <= 0) return;
      const result = await tickTestTimer(assignmentId, delta);
      setRemaining(result.remainingSeconds);
      if (result.expired) handleExpiry();
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [assignmentId]);

  // Lock immediately if the local display hits zero, rather than waiting
  // up to SYNC_INTERVAL_MS for the next heartbeat to confirm it.
  useEffect(() => {
    if (remaining <= 0) handleExpiry();
  }, [remaining]);

  const urgent = remaining <= 120;

  return (
    <div
      className={`fixed top-20 right-4 z-40 rounded-xl border px-4 py-2 text-center shadow-lg sm:right-6 ${
        urgent
          ? "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-950/80"
          : "border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900"
      }`}
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-black/50 dark:text-white/50">Time left</div>
      <div
        className={`font-mono text-3xl font-bold tabular-nums ${urgent ? "text-red-600 dark:text-red-400" : "text-black dark:text-white"}`}
      >
        {formatTime(remaining)}
      </div>
    </div>
  );
}
