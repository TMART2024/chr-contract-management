import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  initializeAuth,
  browserSessionPersistence,
  setPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { initializeApp, deleteApp } from 'firebase/app';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set auth to session persistence (logs out when browser closes)
    setPersistence(auth, browserSessionPersistence).catch((error) => {
      console.error('Error setting persistence:', error);
    });
  }, []);

  async function createUserAsAdmin(email, displayName, role, department) {
    // Create a secondary Firebase app instance to avoid logging out the admin
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    };
    
    const secondaryApp = initializeApp(firebaseConfig, 'Secondary-' + Date.now());
    const secondaryAuth = initializeAuth(secondaryApp, {
      persistence: browserSessionPersistence
    });
    
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      
      // Create user with secondary auth (doesn't log out admin)
      const temporaryPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, temporaryPassword);
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: email,
        displayName: displayName,
        role: role || 'viewer',
        department: department || '',
        notifications: {
          email: true,
          renewalAlerts: true,
          cancellationAlerts: true,
          alertDaysBefore: 30
        },
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        needsPasswordReset: true
      });

      // Send password reset email
      await sendPasswordResetEmail(secondaryAuth, email);
      
      // Sign out from secondary auth
      await signOut(secondaryAuth);
      
      // Delete the secondary app
      await deleteApp(secondaryApp);

      return { success: true };
    } catch (error) {
      // Clean up secondary app on error
      try {
        await deleteApp(secondaryApp);
      } catch (e) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Update last login time
    await updateDoc(doc(db, 'users', result.user.uid), {
      lastLoginAt: serverTimestamp()
    });
    return result;
  }

  async function logout() {
    return signOut(auth);
  }

  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    createUserAsAdmin,
    login,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
