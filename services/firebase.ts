// services/firebase.ts
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { Task, User } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyCj6TQdwr8WCPYnIlNfzrbJR1k4sBqYWbI",
  authDomain: "taske-f111d.firebaseapp.com",
  projectId: "taske-f111d",
  storageBucket: "taske-f111d.firebasestorage.app",
  messagingSenderId: "704978248429",
  appId: "1:704978248429:android:68d0f88da2c263704062e4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export class FirebaseService {
  static async syncTasksToFirebase(tasks: Task[], userId: string): Promise<void> {
    try {
      const userTasksRef = doc(db, 'users', userId, 'tasks', 'userTasks');
      await setDoc(userTasksRef, { tasks }, { merge: true });
    } catch (error) {
      console.error('Error syncing tasks to Firebase:', error);
      throw error;
    }
  }

  static async createUserProfile(userId: string, email: string, displayName?: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        email: email,
        displayName: displayName || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  static async getTasksFromFirebase(userId: string): Promise<Task[]> {
    try {
      const userTasksRef = doc(db, 'users', userId, 'tasks', 'userTasks');
      const docSnap = await getDoc(userTasksRef);

      if (docSnap.exists()) {
        return docSnap.data().tasks || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting tasks from Firebase:', error);
      throw error;
    }
  }

  static async updateUserProfile(userId: string, userData: Partial<User>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        ...userData,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  static async getUserProfile(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        return docSnap.data() as User;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Google Sign-In methods (web only - mobile requires development build)
  static async signInWithGoogleWeb(): Promise<void> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Create profile if new user
      if (result.operationType === 'signIn') {
        await this.createUserProfile(user.uid, user.email || '', user.displayName || '');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }
}