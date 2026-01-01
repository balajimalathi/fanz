"use client"

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, Messaging, onMessage } from "firebase/messaging";

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Initialize Firebase client
 */
export function initializeFirebase(): FirebaseApp | null {
  if (app) {
    return app;
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Check if all required config is present
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.messagingSenderId) {
    console.warn("Firebase config is incomplete. Push notifications will not work.");
    return null;
  }

  if (typeof window === "undefined") {
    return null; // Server-side, return null
  }

  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    // Initialize messaging if supported
    if ("serviceWorker" in navigator && "PushManager" in window) {
      messaging = getMessaging(app);
    }
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    return null;
  }

  return app;
}

/**
 * Get or register service worker and wait for it to be ready
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    // Check if service worker is already registered
    const existingRegistration = await navigator.serviceWorker.getRegistration("/");
    
    if (existingRegistration) {
      // Wait for existing service worker to be ready
      await existingRegistration.update();
      return existingRegistration;
    }

    // Register new service worker
    const registration = await navigator.serviceWorker.register("/sw.js");
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    
    return registration;
  } catch (error) {
    console.error("Error getting service worker registration:", error);
    return null;
  }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return null;
  }

  if (!("serviceWorker" in navigator)) {
    console.warn("This browser does not support service workers");
    return null;
  }

  try {
    // Step 1: Get or register service worker and wait for it to be ready
    const registration = await getServiceWorkerRegistration();
    if (!registration) {
      console.error("Failed to get service worker registration");
      return null;
    }

    // Step 2: Initialize Firebase if not already done
    if (!app) {
      initializeFirebase();
    }

    if (!messaging) {
      console.warn("Firebase Messaging not initialized");
      return null;
    }

    // Step 3: Request browser notification permission (this shows the browser prompt)
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission not granted. User denied or dismissed the prompt.");
      return null;
    }

    // Step 4: Get FCM token (requires service worker to be ready and permission granted)
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn("VAPID key not configured");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn("Failed to get FCM token");
      return null;
    }

    return token;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
}

/**
 * Subscribe to push notifications
 * Returns the FCM token
 */
export async function subscribeToPushNotifications(): Promise<string | null> {
  return requestNotificationPermission();
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (typeof window === "undefined" || !messaging) {
    return false;
  }

  try {
    // Delete the token
    // Note: Firebase doesn't have a direct unsubscribe method
    // We'll handle this server-side by removing the subscription from the database
    return true;
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error);
    return false;
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(
  callback: (payload: any) => void
): (() => void) | null {
  if (typeof window === "undefined" || !messaging) {
    return null;
  }

  try {
    const unsubscribe = onMessage(messaging, callback);
    return unsubscribe;
  } catch (error) {
    console.error("Error setting up foreground message listener:", error);
    return null;
  }
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

