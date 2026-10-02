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
 * Cooachly and Arts each get their own service worker registration (and so
 * their own push subscription), so someone with an account on both sites can
 * get notifications from both on the same phone.
 */
function serviceWorkerScope() {
  const { pathname } = window.location;
  // "/arts" rather than "/arts/" so the Arts home page is covered too.
  return pathname === "/arts" || pathname.startsWith("/arts/") ? "/arts" : "/";
}

let registration: Promise<ServiceWorkerRegistration> | null = null;

/** Registers (or returns the existing) service worker for this site, once it's active. */
export function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  registration ??= navigator.serviceWorker
    .register("/sw.js", { scope: serviceWorkerScope(), updateViaCache: "none" })
    .then(
      (reg) =>
        new Promise<ServiceWorkerRegistration>((resolve) => {
          const worker = reg.installing ?? reg.waiting;
          if (reg.active || !worker) return resolve(reg);
          worker.addEventListener("statechange", () => {
            if (worker.state === "activated") resolve(reg);
          });
        })
    );
  return registration;
}

/**
 * Registers the service worker (push notifications + offline page) on every
 * page, and holds on to Chrome/Android's install prompt — it fires once,
 * usually long before the user reaches Settings — so the "Install app"
 * button there can use it later.
 */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      getServiceWorkerRegistration().catch((err) => {
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
