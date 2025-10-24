import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Task } from "./storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,    
    shouldShowList: true,      
  }),
});

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  let token: string | null = null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  try {
    const response = await Notifications.getExpoPushTokenAsync();
    token = response.data;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1a2d8e", // Changed to your blue color
      });
    }

    return token;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
}

export async function scheduleTaskReminder(
  task: Task
): Promise<string | undefined> {
  if (!task.reminderEnabled) return;

  try {
    const startTime = new Date(task.startTime);
    const hours = startTime.getHours();
    const minutes = startTime.getMinutes();

    // If time has passed for today, schedule for tomorrow
    const notificationTime = new Date();
    notificationTime.setHours(hours, minutes, 0, 0);
    
    if (notificationTime < new Date()) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Task Reminder",
        body: `Time to start: ${task.title}${task.duration > 0 ? ` (${formatDuration(task.duration)})` : ''}`,
        data: { taskId: task.id },
      },
      trigger: {
        type: Notifications.TriggerType.Daily,
        hour: hours,
        minute: minutes,
        repeats: task.frequency !== "once", // Only repeat if not a one-time task
      },
    });

    return identifier;
  } catch (error) {
    console.error("Error scheduling task reminder:", error);
    return undefined;
  }
}

export async function scheduleRefillReminder(
  task: Task
): Promise<string | undefined> {
  // Tasks don't have refill reminders like medications
  // This function is kept for compatibility but won't do anything
  console.log("Refill reminders not applicable for tasks");
  return undefined;
}

export async function cancelTaskReminders(
  taskId: string
): Promise<void> {
  try {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
      const data = notification.content.data as {
        taskId?: string;
      } | null;
      if (data?.taskId === taskId) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }
  } catch (error) {
    console.error("Error canceling task reminders:", error);
  }
}

export async function updateTaskReminders(
  task: Task
): Promise<void> {
  try {
    // Cancel existing reminders
    await cancelTaskReminders(task.id);

    // Schedule new reminders
    await scheduleTaskReminder(task);
  } catch (error) {
    console.error("Error updating task reminders:", error);
  }
}

// Helper function to format duration for display
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${mins} minute${mins > 1 ? 's' : ''}`;
  }
}

// New function for task completion reminders
export async function scheduleTaskCompletionReminder(
  task: Task
): Promise<string | undefined> {
  if (!task.reminderEnabled) return;

  try {
    const startTime = new Date(task.startTime);
    const endTime = new Date(startTime.getTime() + task.duration * 60000); // Add duration in milliseconds
    
    const hours = endTime.getHours();
    const minutes = endTime.getMinutes();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Task Completion Check",
        body: `Your task "${task.title}" should be completed soon. Mark as done?`,
        data: { taskId: task.id, type: "completion" },
      },
      trigger: {
        type: Notifications.TriggerType.CALENDAR,
        hour: hours,
        minute: minutes,
        repeats: false, // One-time reminder for completion
      },
    });

    return identifier;
  } catch (error) {
    console.error("Error scheduling task completion reminder:", error);
    return undefined;
  }
}