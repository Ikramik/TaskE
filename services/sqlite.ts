import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types';

const TASKS_KEY = 'taske_tasks';

export class SQLiteService {
  static async initDatabase(): Promise<void> {
    try {
      // Initialize AsyncStorage - no setup needed
      console.log('AsyncStorage initialized for TaskE');
    } catch (error) {
      console.error('Error initializing AsyncStorage:', error);
      throw error;
    }
  }

  static async createTask(task: Task): Promise<void> {
    try {
      const existingTasks = await this.getTasks(task.userId);
      const updatedTasks = [...existingTasks, task];
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  static async getTasks(userId: string): Promise<Task[]> {
    try {
      const tasksJson = await AsyncStorage.getItem(TASKS_KEY);
      if (!tasksJson) return [];
      
      const allTasks: Task[] = JSON.parse(tasksJson);
      return allTasks.filter(task => task.userId === userId);
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw error;
    }
  }

  static async updateTask(task: Task): Promise<void> {
    try {
      const existingTasks = await this.getTasks(task.userId);
      const updatedTasks = existingTasks.map(t => t.id === task.id ? task : t);
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  static async deleteTask(taskId: string): Promise<void> {
    try {
      const tasksJson = await AsyncStorage.getItem(TASKS_KEY);
      if (!tasksJson) return;
      
      const allTasks: Task[] = JSON.parse(tasksJson);
      const updatedTasks = allTasks.filter(task => task.id !== taskId);
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  static async getUnsyncedTasks(): Promise<Task[]> {
    try {
      const tasksJson = await AsyncStorage.getItem(TASKS_KEY);
      if (!tasksJson) return [];
      
      const allTasks: Task[] = JSON.parse(tasksJson);
      return allTasks.filter(task => !task.synced);
    } catch (error) {
      console.error('Error getting unsynced tasks:', error);
      throw error;
    }
  }

  static async markTasksAsSynced(taskIds: string[]): Promise<void> {
    try {
      const tasksJson = await AsyncStorage.getItem(TASKS_KEY);
      if (!tasksJson) return;
      
      const allTasks: Task[] = JSON.parse(tasksJson);
      const updatedTasks = allTasks.map(task => 
        taskIds.includes(task.id) ? { ...task, synced: true } : task
      );
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Error marking tasks as synced:', error);
      throw error;
    }
  }

  static async clearAllTasks(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TASKS_KEY);
    } catch (error) {
      console.error('Error clearing all tasks:', error);
      throw error;
    }
  }
}
