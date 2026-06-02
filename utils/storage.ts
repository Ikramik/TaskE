import AsyncStorage from "@react-native-async-storage/async-storage";

const TASKS_KEY = "@tasks";
const SLOT_HISTORY_KEY = "@slot_history";

export interface Task {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  duration: number;
  frequency: "once" | "daily" | "weekly" | "custom";
  selectedDays: string[];
  color: string;
  reminderEnabled: boolean;
  category?: string;
  categoryColor?: string;
  priority?: string;
  customDates?: string[];
  completed?: boolean;
  lastCompleted?: string;
}

export interface SlotHistory {
  id: string;
  taskId: string;
  date: string; 
  timeSlots: string[];
}

export async function getTasks(): Promise<Task[]> {
  try {
    const data = await AsyncStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
}

export async function addTask(task: Task): Promise<void> {
  try {
    const tasks = await getTasks();
    tasks.push(task);
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error("Error adding task:", error);
    throw error;
  }
}

export async function updateTask(updatedTask: Task): Promise<void> {
  try {
    const tasks = await getTasks();
    const index = tasks.findIndex((task) => task.id === updatedTask.id);
    if (index !== -1) {
      tasks[index] = updatedTask;
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    }
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    const tasks = await getTasks();
    const updatedTasks = tasks.filter((task) => task.id !== id);
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updatedTasks));
    
    await cleanupTaskSlots(id);
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
}

export async function getSlotHistory(): Promise<SlotHistory[]> {
  try {
    const data = await AsyncStorage.getItem(SLOT_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting slot history:", error);
    return [];
  }
}

export async function getTodaysSlots(): Promise<SlotHistory[]> {
  try {
    const history = await getSlotHistory();
    const today = new Date().toISOString().split('T')[0]; // Use YYYY-MM-DD format
    return history.filter((slot) => slot.date === today);
  } catch (error) {
    console.error("Error getting today's slots:", error);
    return [];
  }
}

export async function recordSlot(
  taskId: string,
  date: string, // Should be in YYYY-MM-DD format
  timeSlots: string[]
): Promise<void> {
  try {
    const history = await getSlotHistory();
    
    const existingSlotIndex = history.findIndex(
      slot => slot.taskId === taskId && slot.date === date
    );
    
    if (existingSlotIndex !== -1) {
      const existingSlot = history[existingSlotIndex];
      const mergedTimeSlots = [...new Set([...existingSlot.timeSlots, ...timeSlots])];
      history[existingSlotIndex] = {
        ...existingSlot,
        timeSlots: mergedTimeSlots
      };
    } else {
      const newSlot: SlotHistory = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        taskId,
        date,
        timeSlots,
      };
      history.push(newSlot);
    }
    
    await AsyncStorage.setItem(SLOT_HISTORY_KEY, JSON.stringify(history));
    
    const tasks = await getTasks();
    const task = tasks.find((task) => task.id === taskId);
    if (task) {
      const updatedTask = {
        ...task,
        completed: true,
        lastCompleted: new Date().toISOString(),
      };
      await updateTask(updatedTask);
    }
  } catch (error) {
    console.error("Error recording slot:", error);
    throw error;
  }
}

async function cleanupTaskSlots(taskId: string): Promise<void> {
  try {
    const history = await getSlotHistory();
    const filteredHistory = history.filter(slot => slot.taskId !== taskId);
    await AsyncStorage.setItem(SLOT_HISTORY_KEY, JSON.stringify(filteredHistory));
  } catch (error) {
    console.error("Error cleaning up task slots:", error);
  }
}

export async function getSlotsForTaskAndDate(
  taskId: string, 
  date: string
): Promise<SlotHistory[]> {
  try {
    const history = await getSlotHistory();
    return history.filter(
      slot => slot.taskId === taskId && slot.date === date
    );
  } catch (error) {
    console.error("Error getting slots for task and date:", error);
    return [];
  }
}

export async function isTaskCompletedOnDate(
  taskId: string, 
  date: string
): Promise<boolean> {
  try {
    const slots = await getSlotsForTaskAndDate(taskId, date);
    return slots.some(slot => slot.timeSlots.length > 0);
  } catch (error) {
    console.error("Error checking task completion:", error);
    return false;
  }
}

export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([TASKS_KEY, SLOT_HISTORY_KEY]);
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
}

export async function migrateTaskData(): Promise<void> {
  try {
    const tasks = await getTasks();
    let needsMigration = false;
    
    const migratedTasks = tasks.map(task => {
      if (task.completed === undefined || task.lastCompleted === undefined) {
        needsMigration = true;
        return {
          ...task,
          completed: false,
          lastCompleted: null
        };
      }
      return task;
    });
    
    if (needsMigration) {
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(migratedTasks));
      console.log("Task data migrated successfully");
    }
  } catch (error) {
    console.error("Error migrating task data:", error);
  }
}