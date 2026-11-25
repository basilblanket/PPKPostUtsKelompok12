import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  browserSessionPersistence,
  connectAuthEmulator,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const demo = process.env.EXPO_PUBLIC_DEMO === "1";
const config = demo
  ? {
      apiKey: "demo-api-key",
      projectId: "demo-praktikum",
      appId: "1:123:web:demo",
    }
  : {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };

export const configured = Object.values(config).every(Boolean);
const app = configured ? initializeApp(config) : null;
export const auth =
  app && initializeAuth(app, { persistence: browserSessionPersistence });
export const db = app && getFirestore(app);
if (demo) {
  connectAuthEmulator(
    auth,
    "http://" + (process.env.EXPO_PUBLIC_AUTH_HOST || "127.0.0.1:9099"),
    { disableWarnings: true },
  );
  connectFirestoreEmulator(
    db,
    "127.0.0.1",
    Number(process.env.EXPO_PUBLIC_STORE_PORT || 8180),
  );
}

export const functions = app && getFunctions(app, "asia-southeast2");
if (demo)
  connectFunctionsEmulator(
    functions,
    "127.0.0.1",
    Number(process.env.EXPO_PUBLIC_FUNCTIONS_PORT || 15001),
  );
