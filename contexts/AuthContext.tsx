import React, { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, UserProfile } from '../firebase';

const AuthContext = createContext<{
  user: any;
  profile: UserProfile | null;
  loading: boolean;
  sendNotification: (toUid: string, type: 'like' | 'comment' | 'request' | 'system', content: string) => Promise<void>;
} | null>(null);

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        
        try {
          await setDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() }, { merge: true });
        } catch (e) {
          console.warn("Could not update online status:", e);
        }
        
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
             setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.warn("Profile sync error:", error.message);
          setLoading(false);
        });

        const handleDisconnect = () => {
             setDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(e => {});
        };
        window.addEventListener('beforeunload', handleDisconnect);

        return () => {
          handleDisconnect();
          window.removeEventListener('beforeunload', handleDisconnect);
          unsubProfile();
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const sendNotification = async (toUid: string, type: 'like' | 'comment' | 'request' | 'system', content: string) => {
    if (!user || !profile || toUid === user.uid) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        to: toUid,
        from: user.uid,
        fromName: `${profile.firstName} ${profile.lastName}`,
        fromPhoto: profile.photoURL,
        type,
        content,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (e) { console.warn("Notif error", e); }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, sendNotification }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};