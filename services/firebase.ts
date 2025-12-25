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
export const auth = firebase.auth();

// Collection References
export const membersCol = db.collection("members");
export const subscriptionsCol = db.collection("subscriptions");
export const expensesCol = db.collection("expenses");
export const trashCol = db.collection("trash");