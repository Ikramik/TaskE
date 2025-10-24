import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import {
  getTasks,
  Task,
  updateTask,
} from "../../utils/storage";
import { scheduleRefillReminder } from "../../utils/notifications";

export default function RefillTrackerScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);

  const loadTasks = useCallback(async () => {
    try {
      const allTasks = await getTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks])
  );

  const handleRefill = async (task: Task) => {
    try {
      // For tasks, we'll track completion status instead of "refill"
      const updatedTask = {
        ...task,
        completed: true,
        lastCompleted: new Date().toISOString(),
      };

      await updateTask(updatedTask);
      await loadTasks();

      Alert.alert(
        "Task Completed",
        `${task.title} has been marked as completed.`
      );
    } catch (error) {
      console.error("Error completing task:", error);
      Alert.alert("Error", "Failed to complete task. Please try again.");
    }
  };

  const getTaskStatus = (task: Task) => {
    if (task.completed) {
      return {
        status: "Completed",
        color: "#4CAF50",
        backgroundColor: "#E8F5E9",
      };
    } else {
      const now = new Date();
      const taskDate = new Date(task.startTime);
      
      if (taskDate < now) {
        return {
          status: "Overdue",
          color: "#F44336",
          backgroundColor: "#FFEBEE",
        };
      } else {
        return {
          status: "Pending",
          color: "#FF9800",
          backgroundColor: "#FFF3E0",
        };
      }
    }
  };

  const getProgressPercentage = (task: Task) => {
    // For tasks, progress could be based on completion status
    // or you could add a progress field to your Task type
    return task.completed ? 100 : 0;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a2d8e", "#142269"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#ffffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Task Tracker</Text>
        </View>

        <ScrollView
          style={styles.tasksContainer}
          showsVerticalScrollIndicator={false}
        >
          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No tasks to track</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push("/tasks/add")}
              >
                <Text style={styles.addButtonText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          ) : (
            tasks.map((task) => {
              const taskStatus = getTaskStatus(task);
              const progressPercentage = getProgressPercentage(task);

              return (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <View
                      style={[
                        styles.taskColor,
                        { backgroundColor: task.color || "#1a2d8e" },
                      ]}
                    />
                    <View style={styles.taskInfo}>
                      <Text style={styles.taskName}>
                        {task.title}
                      </Text>
                      <Text style={styles.taskDescription}>
                        {task.description || "No description"}
                      </Text>
                      <Text style={styles.taskTime}>
                        {new Date(task.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: taskStatus.backgroundColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: taskStatus.color },
                        ]}
                      >
                        {taskStatus.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressInfo}>
                      <Text style={styles.progressLabel}>Progress</Text>
                      <Text style={styles.progressValue}>
                        {progressPercentage}%
                      </Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBarBackground}>
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${progressPercentage}%`,
                              backgroundColor: taskStatus.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.taskInfo}>
                      <Text style={styles.frequencyLabel}>
                        Frequency: {task.frequency || "Once"}
                      </Text>
                      {task.completed && (
                        <Text style={styles.lastCompletedDate}>
                          Last completed:{" "}
                          {new Date(task.Completed).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.completeButton,
                      {
                        backgroundColor: task.completed ? "#e0e0e0" : (task.color || "#1a2d8e"),
                      },
                    ]}
                    onPress={() => handleRefill(task)}
                    disabled={task.completed}
                  >
                    <Text style={styles.completeButtonText}>
                      {task.completed ? "Completed" : "Mark Complete"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerGradient: {
    height: 120,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    marginTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fafafaff",
    marginLeft: 15,
  },
  tasksContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    marginTop: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: "#1a2d8e",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  taskCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  taskColor: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  taskDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  taskTime: {
    fontSize: 12,
    color: "#999",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: "#666",
  },
  progressValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginRight: 10,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    minWidth: 30,
  },
  frequencyLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  lastCompletedDate: {
    fontSize: 12,
    color: "#999",
  },
  completeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  completeButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
});