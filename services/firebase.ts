import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { Task, User } from '../types';

// Firebase configuration - Replace with your actual config
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

export class FirebaseService {
  static async syncTasksToFirebase(tasks: Task[], userId: string): Promise<void> {
    try {
      const { doc, setDoc, collection } = await import('firebase/firestore');
      const userTasksRef = doc(db, 'users', userId, 'tasks', 'userTasks');
      await setDoc(userTasksRef, { tasks }, { merge: true });
    } catch (error) {
      console.error('Error syncing tasks to Firebase:', error);
      throw error;
    }
  }

  static async getTasksFromFirebase(userId: string): Promise<Task[]> {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
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
      const { doc, setDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, userData, { merge: true });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
}

