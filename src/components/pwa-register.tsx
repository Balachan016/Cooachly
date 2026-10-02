"use client";

import { useEffect } from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __deferredInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export const INSTALL_PROMPT_READY = "cooachly:install-prompt-ready";

/**
 * Registers the service worker (push notifications + offline page) on every
 * page, and holds on to Chrome/Android's install prompt — it fires once,
 * usually long before the user reaches Settings — so the "Install app"
 * button there can use it later.
 */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((err) => {
        console.error("Service worker registration failed", err);
      });
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      window.__deferredInstallPrompt = event as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event(INSTALL_PROMPT_READY));
    }
    function onInstalled() {
      window.__deferredInstallPrompt = null;
      window.dispatchEvent(new Event(INSTALL_PROMPT_READY));
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}
