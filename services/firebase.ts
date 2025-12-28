
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyADFLsO7piWILFCacpctgqWDfQrzNhXmAQ",
  authDomain: "ai-agent-455520.firebaseapp.com",
  projectId: "ai-agent-455520",
  storageBucket: "ai-agent-455520.firebasestorage.app",
  messagingSenderId: "1035386759238",
  appId: "1:1035386759238:web:582eff2c2214ddd4c94247",
  measurementId: "G-ETZLYRFBK0"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Services
export const db = firebase.firestore();

// ENHANCEMENT: Fix Firestore settings conflict and host override warnings
try {
  /**
   * We removed 'experimentalForceLongPolling: true' to prevent conflict 
   * with 'experimentalAutoDetectLongPolling' which is default in many environments.
   * 'merge: true' is kept as suggested by Firebase 12.6.0 warning to preserve original host.
   */
  const firestoreSettings: any = {
    cache: {
      kind: 'persistent',
      tabManager: { kind: 'multiple' }
    },
    merge: true 
  };
  
  db.settings(firestoreSettings);
} catch (e) {
  // Gracefully handle if settings are already applied
  console.debug("Firestore settings application skip:", e);
}

export const auth = firebase.auth();

// Collection References
export const membersCol = db.collection("members");
export const subscriptionsCol = db.collection("subscriptions");
export const expensesCol = db.collection("expenses");
export const trashCol = db.collection("trash");
