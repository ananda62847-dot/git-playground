// Firebase Web SDK - Push Notifications (FCM)
// Public web config — safe to embed in client code.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

export const firebaseConfig = {
  apiKey: "AIzaSyByszA6O4UfiRQi7Ey7Q9NkbwYUsknHyOA",
  authDomain: "makkal-connect-cf0a7.firebaseapp.com",
  projectId: "makkal-connect-cf0a7",
  storageBucket: "makkal-connect-cf0a7.appspot.com",
  messagingSenderId: "960691869720",
  appId: "1:960691869720:web:440008896a42e27bd10b6d",
  measurementId: "G-CY1RC07SXS",
};

// VAPID public key from Firebase Console → Cloud Messaging → Web Push Certificates
export const FIREBASE_VAPID_KEY =
  "BEOyg--H02YZyBt8Od2pSw39bb2ASmg3ObO1kig111nde11Mm_WF_33RhK6ACfb2Pd-LHlqsdMMYgPdFl5kutnE";

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Messaging is only supported on browsers with service workers + Notification API.
export async function getMessagingIfSupported(): Promise<Messaging | null> {
  try {
    if (typeof window === "undefined") return null;
    if (!(await isSupported())) return null;
    return getMessaging(firebaseApp);
  } catch (e) {
    console.warn("[firebase] messaging not supported", e);
    return null;
  }
}
