import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  userEmail: string;
  isTargetUser: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const TARGET_EMAIL = 'isowri4ku@gmail.com';

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userEmail: TARGET_EMAIL,
  isTargetUser: true,
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (!docSnap.exists()) {
            await setDoc(userDocRef, {
              userId: currentUser.uid,
              name: currentUser.displayName || 'Authorized User',
              email: currentUser.email || TARGET_EMAIL,
              photoURL: currentUser.photoURL || '',
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.warn('User profile sync notice:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const loggedUser = result.user;
      
      const userDocRef = doc(db, 'users', loggedUser.uid);
      await setDoc(userDocRef, {
        userId: loggedUser.uid,
        name: loggedUser.displayName || 'Authorized User',
        email: loggedUser.email || TARGET_EMAIL,
        photoURL: loggedUser.photoURL || '',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const effectiveEmail = user?.email || TARGET_EMAIL;
  const isTargetUser = effectiveEmail.toLowerCase() === TARGET_EMAIL.toLowerCase();

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      userEmail: effectiveEmail,
      isTargetUser,
      loginWithGoogle,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
