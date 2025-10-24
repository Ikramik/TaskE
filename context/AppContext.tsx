import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AppState, Task, User, Settings, Theme } from '../types';
import { SQLiteService } from '../services/sqlite';
import { FirebaseService } from '../services/firebase';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ONLINE'; payload: boolean }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'SYNC_TASKS'; payload: Task[] };

const initialState: AppState = {
  user: null,
  tasks: [],
  settings: {
    theme: 'auto',
    notifications: true,
    autoSync: true,
  },
  isLoading: false,
  isOnline: true,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? action.payload : task
        ),
      };
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ONLINE':
      return { ...state, isOnline: action.payload };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    case 'SYNC_TASKS':
      return { ...state, tasks: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Auth methods
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  // Task methods
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'synced'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  syncTasks: () => Promise<void>;
  // Settings methods
  updateSettings: (settings: Partial<Settings>) => void;
  // Utility methods
  getTasksForDate: (date: string) => Task[];
  getNextTask: () => Task | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize app
  useEffect(() => {
    const initApp = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        await SQLiteService.initDatabase();
        
        // Set up auth state listener
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            const userData: User = {
              id: user.uid,
              email: user.email || '',
              name: user.displayName || '',
              profilePicture: user.photoURL || undefined,
              createdAt: user.metadata.creationTime || new Date().toISOString(),
            };
            dispatch({ type: 'SET_USER', payload: userData });
            
            // Load tasks for the user
            const tasks = await SQLiteService.getTasks(user.uid);
            dispatch({ type: 'SET_TASKS', payload: tasks });
          } else {
            dispatch({ type: 'SET_USER', payload: null });
            dispatch({ type: 'SET_TASKS', payload: [] });
          }
        });
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initApp();
  }, []);

  // Auth methods
  const signIn = async (email: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await FirebaseService.updateUserProfile(result.user.uid, { name });
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Task methods
  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId' | 'synced'>) => {
    if (!state.user) throw new Error('User not authenticated');

    const task: Task = {
      ...taskData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: state.user.id,
      synced: false,
    };

    try {
      await SQLiteService.createTask(task);
      dispatch({ type: 'ADD_TASK', payload: task });
      
      // Auto-sync if enabled and online
      if (state.settings.autoSync && state.isOnline) {
        await syncTasks();
      }
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const updateTask = async (task: Task) => {
    try {
      await SQLiteService.updateTask(task);
      dispatch({ type: 'UPDATE_TASK', payload: task });
      
      // Auto-sync if enabled and online
      if (state.settings.autoSync && state.isOnline) {
        await syncTasks();
      }
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await SQLiteService.deleteTask(taskId);
      dispatch({ type: 'DELETE_TASK', payload: taskId });
      
      // Auto-sync if enabled and online
      if (state.settings.autoSync && state.isOnline) {
        await syncTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const syncTasks = async () => {
    if (!state.user || !state.isOnline) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Get unsynced tasks from local storage
      const unsyncedTasks = await SQLiteService.getUnsyncedTasks();
      
      if (unsyncedTasks.length > 0) {
        // Sync to Firebase
        await FirebaseService.syncTasksToFirebase(state.tasks, state.user.id);
        
        // Mark tasks as synced
        await SQLiteService.markTasksAsSynced(unsyncedTasks.map(t => t.id));
      }
      
      // Get latest tasks from Firebase
      const firebaseTasks = await FirebaseService.getTasksFromFirebase(state.user.id);
      dispatch({ type: 'SYNC_TASKS', payload: firebaseTasks });
    } catch (error) {
      console.error('Error syncing tasks:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Settings methods
  const updateSettings = (settings: Partial<Settings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  };

  // Utility methods
  const getTasksForDate = (date: string): Task[] => {
    return state.tasks.filter(task => task.dueDate === date);
  };

  const getNextTask = (): Task | null => {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = getTasksForDate(today).filter(task => !task.completed);
    return todayTasks.length > 0 ? todayTasks[0] : null;
  };

  const value: AppContextType = {
    state,
    dispatch,
    signIn,
    signUp,
    logout,
    addTask,
    updateTask,
    deleteTask,
    syncTasks,
    updateSettings,
    getTasksForDate,
    getNextTask,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

