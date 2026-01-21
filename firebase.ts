import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyABiN16MklWtX00PC6UHLSDKJCrPd9EwZs",
  authDomain: "loverchat190.firebaseapp.com",
  projectId: "loverchat190",
  storageBucket: "loverchat190.firebasestorage.app",
  messagingSenderId: "971632978916",
  appId: "1:971632978916:web:355f73309996d4a6d935f1",
  measurementId: "G-8N5XYHLEQV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Shared Types ---
export type UserRole = 'admin' | 'user';
export type RelationshipStatus = 'single' | 'pending' | 'taken';

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  role: UserRole;
  photoURL?: string;
  coverURL?: string;
  status: RelationshipStatus;
  partnerId?: string;
  relationshipStart?: string; // ISO Date String
  isBanned?: boolean;
  isOnline?: boolean;
  lastSeen?: any; // Timestamp
  bio?: string;
  createdAt: any;
}

export interface Comment {
  id: string;
  uid: string;
  authorName: string;
  authorPhoto?: string;
  text: string;
  createdAt: number;
  replies?: Comment[];
}