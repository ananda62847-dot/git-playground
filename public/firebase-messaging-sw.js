/* Firebase Cloud Messaging - Background Service Worker
   Must live at /firebase-messaging-sw.js (public root). */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyByszA6O4UfiRQi7Ey7Q9NkbwYUsknHyOA",
  authDomain: "makkal-connect-cf0a7.firebaseapp.com",
  projectId: "makkal-connect-cf0a7",
  storageBucket: "makkal-connect-cf0a7.appspot.com",
  messagingSenderId: "960691869720",
  appId: "1:960691869720:web:440008896a42e27bd10b6d",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "Makkal Connect";
  const options = {
    body: (payload.notification && payload.notification.body) || "",
    icon: "/app-icon-512.png",
    badge: "/app-icon-512.png",
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
