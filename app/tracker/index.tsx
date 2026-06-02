import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import {
  deleteTask,
  getSlotHistory,
  getTasks,
  recordSlot,
  Task,
  updateTask,
} from "../../utils/storage";

export default function RefillTrackerScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [slotHistory, setSlotHistory] = useState<any[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [allTasks, history] = await Promise.all([
        getTasks(),
        getSlotHistory(),
      ]);
      setTasks(allTasks);
      setSlotHistory(history);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Check if task is completed based on slot history
  const isTaskCompleted = (taskId: string): boolean => {
    const today = new Date();
    const normalizedDate = normalizeDate(today);
    
    const daySlots = slotHistory.filter(
      (slot) => normalizeDate(slot.date) === normalizedDate && slot.taskId === taskId
    );
    
    return daySlots.some(slot => slot.timeSlots && slot.timeSlots.length > 0);
  };

  // Date normalization function
  const normalizeDate = (date: Date | string): string => {
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      const currentDate = normalizeDate(new Date());
      const currentTime = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      await recordSlot(task.id, currentDate, [currentTime]);
      
      const updatedTask = {
        ...task,
        completed: true,
        lastCompleted: new Date().toISOString(),
      };
      await updateTask(updatedTask);
      
      await loadData();

      Alert.alert(
        "Task Completed",
        `${task.title} has been marked as completed.`
      );
    } catch (error) {
      console.error("Error completing task:", error);
      Alert.alert("Error", "Failed to complete task. Please try again.");
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      await deleteTask(taskToDelete.id);
      setDeleteModalVisible(false);
      setTaskToDelete(null);
      await loadData();
      
      Alert.alert("Success", `Task "${taskToDelete.title}" has been deleted`);
    } catch (error) {
      console.error("Error deleting task:", error);
      Alert.alert("Error", "Failed to delete task. Please try again.");
    }
  };

  const showDeleteConfirmation = (task: Task) => {
    setTaskToDelete(task);
    setDeleteModalVisible(true);
  };

  // Check if task is scheduled for a specific date
  const isTaskScheduledForDate = (task: Task, date: Date): boolean => {
    const normalizedDate = normalizeDate(date);
    const dayOfWeek = date.getDay().toString();

    switch (task.frequency) {
      case "daily":
        return true;
      case "weekly":
        return task.selectedDays.includes(dayOfWeek);
      case "custom":
        return task.selectedDays.includes(normalizedDate);
      case "once":
        return normalizeDate(new Date(task.startTime)) === normalizedDate;
      default:
        return false;
    }
  };

  // Improved task status logic
  const getTaskStatus = (task: Task) => {
    const completed = isTaskCompleted(task.id) || task.completed;
    
    if (completed) {
      return {
        status: "Completed",
        color: "#4CAF50",
        backgroundColor: "#E8F5E9",
      };
    }

    const now = new Date();
    const today = new Date();
    const normalizedToday = normalizeDate(today);
    const taskDateTime = new Date(task.startTime);

    // For one-time tasks
    if (task.frequency === "once") {
      if (taskDateTime < now) {
        return {
          status: "Overdue",
          color: "#F44336",
          backgroundColor: "#FFEBEE",
        };
      } else if (normalizeDate(taskDateTime) === normalizedToday) {
        return {
          status: "Pending",
          color: "#FF9800",
          backgroundColor: "#FFF3E0",
        };
      } else {
        return {
          status: "Upcoming",
          color: "#2196F3",
          backgroundColor: "#E3F2FD",
        };
      }
    }

    // For recurring tasks
    const isScheduledToday = isTaskScheduledForDate(task, today);
    
    if (isScheduledToday) {
      const taskTime = new Date(task.startTime);
      const scheduledTimeToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        taskTime.getHours(),
        taskTime.getMinutes(),
        taskTime.getSeconds()
      );
      
      if (scheduledTimeToday < now) {
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
    } else {
      // Check if there are any missed occurrences for recurring tasks
      if (hasMissedScheduledDates(task)) {
        return {
          status: "Overdue",
          color: "#F44336",
          backgroundColor: "#FFEBEE",
        };
      } else {
        return {
          status: "Upcoming",
          color: "#2196F3",
          backgroundColor: "#E3F2FD",
        };
      }
    }
  };

  // Check for missed scheduled dates
  const hasMissedScheduledDates = (task: Task): boolean => {
    const today = new Date();
    const normalizedToday = normalizeDate(today);

    switch (task.frequency) {
      case "daily":
        // Daily tasks are always scheduled, so if not completed and time passed, it's overdue
        const taskTime = new Date(task.startTime);
        const scheduledTimeToday = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          taskTime.getHours(),
          taskTime.getMinutes(),
          taskTime.getSeconds()
        );
        return scheduledTimeToday < new Date();

      case "weekly":
        // Check if any scheduled day earlier in the week has passed
        const currentDayOfWeek = today.getDay();
        const pastScheduledDays = task.selectedDays
          .map(day => parseInt(day))
          .filter(day => day < currentDayOfWeek);
        return pastScheduledDays.length > 0;

      case "custom":
        // Check if any custom date has passed
        const pastCustomDates = task.selectedDays.filter(date => {
          const scheduledDate = new Date(date);
          return scheduledDate < today && normalizeDate(scheduledDate) !== normalizedToday;
        });
        return pastCustomDates.length > 0;

      default:
        return false;
    }
  };

  const getProgressPercentage = (task: Task) => {
    const completed = isTaskCompleted(task.id) || task.completed;
    return completed ? 100 : 0;
  };

  const getLastCompletedDate = (task: Task): string | null => {
    const taskSlots = slotHistory
      .filter(slot => slot.taskId === task.id && slot.timeSlots.length > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (taskSlots.length > 0) {
      return new Date(taskSlots[0].date).toLocaleDateString();
    }
    
    if (task.lastCompleted) {
      return new Date(task.lastCompleted).toLocaleDateString();
    }
    
    return null;
  };

  // Delete Confirmation Modal
  const renderDeleteModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={deleteModalVisible}
      onRequestClose={() => setDeleteModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.deleteModalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="warning" size={32} color="#FF6B6B" />
                <Text style={styles.deleteModalTitle}>Delete Task</Text>
              </View>
              
              <Text style={styles.deleteModalText}>
                Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
              </Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={handleDeleteTask}
                >
                  <Ionicons name="trash-outline" size={18} color="white" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

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
              const lastCompleted = getLastCompletedDate(task);
              const isCompleted = isTaskCompleted(task.id) || task.completed;

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
                      {lastCompleted && (
                        <Text style={styles.lastCompletedDate}>
                          Last completed: {lastCompleted}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.completeButton,
                        {
                          backgroundColor: isCompleted ? "#e0e0e0" : (task.color || "#1a2d8e"),
                        },
                      ]}
                      onPress={() => handleCompleteTask(task)}
                      disabled={isCompleted}
                    >
                      <Text style={styles.completeButtonText}>
                        {isCompleted ? "Completed" : "Mark Complete"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteTaskButton}
                      onPress={() => showDeleteConfirmation(task)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                      <Text style={styles.deleteTaskButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {renderDeleteModal()}
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
  frequencyLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  lastCompletedDate: {
    fontSize: 12,
    color: "#999",
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  completeButton: {
    flex: 2,
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
  deleteTaskButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE0E0',
    gap: 6,
  },
  deleteTaskButtonText: {
    color: "#FF6B6B",
    fontWeight: "600",
    fontSize: 14,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  deleteModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});