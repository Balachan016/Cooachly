"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { removePushSubscription, savePushSubscription } from "@/actions/push";
import { Button } from "@/components/ui";
import { INSTALL_PROMPT_READY } from "@/components/pwa-register";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

type Env = { isStandalone: boolean; isIOS: boolean; pushSupported: boolean };

function detectEnv(): Env {
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac; tell them apart by touch support.
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const pushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return { isIOS, isStandalone, pushSupported };
}

const noopSubscribe = () => () => {};

function subscribeInstallPrompt(onChange: () => void) {
  window.addEventListener(INSTALL_PROMPT_READY, onChange);
  return () => window.removeEventListener(INSTALL_PROMPT_READY, onChange);
}

/** Settings card: install the app to the home screen and turn on push notifications for this device. */
export function MobileAppSettings({ brandName }: { brandName: string }) {
  // Everything here depends on the browser, so render nothing on the server.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const canPromptInstall = useSyncExternalStore(
    subscribeInstallPrompt,
    () => Boolean(window.__deferredInstallPrompt),
    () => false
  );
  const [subscribed, setSubscribed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => setSubscribed(false));
  }, []);

  if (!isClient) return null;
  const env = detectEnv();

  async function installApp() {
    const promptEvent = window.__deferredInstallPrompt;
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    window.__deferredInstallPrompt = null;
    window.dispatchEvent(new Event(INSTALL_PROMPT_READY));
  }

  function enableNotifications() {
    setMessage(null);
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setMessage("Notifications are blocked. Allow them for this app in your phone's settings, then try again.");
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const sub =
          (await registration.pushManager.getSubscription()) ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
          }));
        const result = await savePushSubscription(sub.toJSON(), navigator.userAgent);
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
        setSubscribed(true);
        setMessage("Notifications are on for this device.");
      } catch (err) {
        console.error("Failed to enable push notifications", err);
        setMessage("Couldn't turn on notifications on this device. Please try again.");
      }
    });
  }

  function disableNotifications() {
    setMessage(null);
    startTransition(async () => {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Notifications are off for this device.");
    });
  }

  const muted = "mt-1 text-sm text-black/60 dark:text-white/60";

  return (
    <div className="mt-4 space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Install the app</h3>
        {env.isStandalone ? (
          <p className={muted}>You&apos;re using the installed {brandName} app.</p>
        ) : canPromptInstall ? (
          <>
            <p className={muted}>Add {brandName} to your home screen for quick, full-screen access.</p>
            <Button type="button" className="mt-3" onClick={installApp}>
              Install app
            </Button>
          </>
        ) : env.isIOS ? (
          <p className={muted}>
            In Safari, tap the <span className="font-medium">Share</span> button, then{" "}
            <span className="font-medium">Add to Home Screen</span>. Open {brandName} from your home screen to turn on
            notifications.
          </p>
        ) : (
          <p className={muted}>
            Open this page in Chrome on your phone and choose <span className="font-medium">Install app</span> (or{" "}
            <span className="font-medium">Add to Home screen</span>) from the browser menu.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold">Notifications on this device</h3>
        {!VAPID_PUBLIC_KEY ? (
          <p className={muted}>Push notifications aren&apos;t set up on this server yet.</p>
        ) : !env.pushSupported ? (
          <p className={muted}>
            {env.isIOS && !env.isStandalone
              ? `On iPhone and iPad, notifications work once ${brandName} is installed to your home screen (iOS 16.4 or later).`
              : "This browser doesn't support push notifications."}
          </p>
        ) : (
          <>
            <p className={muted}>
              Get session reminders and new messages on this device, even when {brandName} is closed.
            </p>
            {subscribed ? (
              <Button type="button" variant="secondary" className="mt-3" disabled={isPending} onClick={disableNotifications}>
                {isPending ? "Turning off…" : "Turn off notifications"}
              </Button>
            ) : (
              <Button type="button" className="mt-3" disabled={isPending} onClick={enableNotifications}>
                {isPending ? "Turning on…" : "Turn on notifications"}
              </Button>
            )}
          </>
        )}
        {message && <p className="mt-3 text-sm text-black/70 dark:text-white/70">{message}</p>}
      </div>
    </div>
  );
}
