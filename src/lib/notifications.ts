// Push notification setup: requests permission, gets FCM token,
// stores it in Supabase against the current user + role/constituency/department.
import { getToken, onMessage } from "firebase/messaging";
import { getMessagingIfSupported, FIREBASE_VAPID_KEY } from "./firebase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TokenContext {
  role: "cadre" | "constituency_admin" | "department_admin" | "super_admin";
  constituency?: string | null;
  department?: string | null;
}

export interface NotificationSetupResult {
  ok: boolean;
  token?: string;
  permission?: NotificationPermission;
  reason?: "unsupported" | "permission-default" | "permission-denied" | "service-worker" | "firebase-config" | "no-token" | "not-authenticated" | "save-failed" | "unknown";
  message?: string;
}

let foregroundListenerAttached = false;

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
  } catch (e) {
    console.warn("[push] SW register failed", e);
    return null;
  }
}

async function setupNotifications(ctx: TokenContext, shouldRequestPermission: boolean): Promise<NotificationSetupResult> {
  try {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      return { ok: false, reason: "unsupported", message: "Notifications are not supported on this browser." };
    }

    // This must run before any awaited work. Mobile browsers only show the
    // permission prompt when it is called directly from the button tap gesture.
    let permission = Notification.permission;
    if (permission === "default") {
      if (!shouldRequestPermission) {
        return { ok: false, permission, reason: "permission-default", message: "Notifications have not been allowed yet." };
      }
      permission = await Notification.requestPermission();
    }

    if (permission === "denied") {
      return { ok: false, permission, reason: "permission-denied", message: "Notifications are blocked for this site. Open browser site settings, set Notifications to Allow, then reload." };
    }

    if (permission !== "granted") {
      return { ok: false, permission, reason: "permission-default", message: "Please tap Allow when the notification prompt appears." };
    }

    const swReg = await registerServiceWorker();
    if (!swReg) {
      return { ok: false, permission, reason: "service-worker", message: "Could not register the notification service on this device." };
    }

    const messaging = await getMessagingIfSupported();
    if (!messaging) {
      return { ok: false, permission, reason: "unsupported", message: "Push notifications are not supported on this browser." };
    }

    let token: string;
    try {
      token = await getToken(messaging, {
        vapidKey: FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn("[push] FCM token fetch failed", e);
      if (/api key not valid|API_KEY_INVALID|installations|firebaseinstallations/i.test(message)) {
        return {
          ok: false,
          permission,
          reason: "firebase-config",
          message: "Firebase web API key is invalid or restricted. Update the Firebase Web App config/API key, then reload and enable alerts again.",
        };
      }
      return { ok: false, permission, reason: "unknown", message };
    }

    if (!token) {
      console.warn("[push] no FCM token returned");
      return { ok: false, permission, reason: "no-token", message: "This device did not return a notification token. Try reopening the app and enable alerts again." };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, token, permission, reason: "not-authenticated", message: "Please log in before enabling device alerts." };
    }

    const { error } = await supabase
      .from("notification_tokens")
      .upsert(
        {
          user_id: user.id,
          role: ctx.role,
          fcm_token: token,
          constituency: ctx.constituency ?? null,
          department: ctx.department ?? null,
          user_agent: navigator.userAgent,
        },
        { onConflict: "user_id,fcm_token" }
      );

    if (error) {
      console.warn("[push] token save failed", error);
      return { ok: false, token, permission, reason: "save-failed", message: error.message };
    }

    // Foreground messages
    if (!foregroundListenerAttached) {
      foregroundListenerAttached = true;
      onMessage(messaging, (payload) => {
        const title = payload.notification?.title || "Makkal Connect";
        const body = payload.notification?.body || "";
        toast({ title, description: body });
      });
    }

    return { ok: true, token, permission };
  } catch (e) {
    console.warn("[push] requestNotificationPermission failed", e);
    return { ok: false, reason: "unknown", message: e instanceof Error ? e.message : "Notifications could not be enabled." };
  }
}

export function requestNotificationPermission(ctx: TokenContext): Promise<NotificationSetupResult> {
  return setupNotifications(ctx, true);
}

export function syncNotificationToken(ctx: TokenContext): Promise<NotificationSetupResult> {
  return setupNotifications(ctx, false);
}
