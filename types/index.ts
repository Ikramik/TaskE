export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  synced: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  profilePicture?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

export interface Settings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  autoSync: boolean;
}

export interface AppState {
  user: User | null;
  tasks: Task[];
  settings: Settings;
  isLoading: boolean;
  isOnline: boolean;
}

export type Priority = 'Low' | 'Medium' | 'High';
export type Theme = 'light' | 'dark' | 'auto';

