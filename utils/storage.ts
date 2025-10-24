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
    const today = new Date().toDateString();
    return history.filter(
      (slot) => new Date(slot.date).toDateString() === today
    );
  } catch (error) {
    console.error("Error getting today's slots:", error);
    return [];
  }
}

export async function recordSlot(
  taskId: string,
  date: string,
  timeSlots: string[]
): Promise<void> {
  try {
    const history = await getSlotHistory();
    const newSlot: SlotHistory = {
      id: Math.random().toString(36).substr(2, 9),
      taskId,
      date,
      timeSlots,
    };

    history.push(newSlot);
    await AsyncStorage.setItem(SLOT_HISTORY_KEY, JSON.stringify(history));

    const tasks = await getTasks();
    const task = tasks.find((task) => task.id === taskId);
    if (task) {
      await updateTask(task);
    }
  } catch (error) {
    console.error("Error recording slot:", error);
    throw error;
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