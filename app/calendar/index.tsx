import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  RefreshControl,
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
  SlotHistory,
  Task,
} from "../../utils/storage";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [slotHistory, setSlotHistory] = useState<SlotHistory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const loadData = useCallback(async () => {
    try {
      console.log("Loading calendar data...");
      const [allTasks, history] = await Promise.all([
        getTasks(),
        getSlotHistory(),
      ]);
      console.log(`Loaded ${allTasks.length} tasks and ${history.length} slot history entries`);
      
      setTasks(allTasks);
      setSlotHistory(history);
    } catch (error) {
      console.error("Error loading calendar data:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  // FIXED: Better date normalization that matches slot history format
  const normalizeDate = (date: Date | string): string => {
    if (typeof date === 'string') {
      // If it's already a string in YYYY-MM-DD format, return as is
      return date.split('T')[0];
    }
    // Convert Date to YYYY-MM-DD format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if a task should appear on a specific date
  const taskOccursOnDate = (task: Task, date: Date): boolean => {
    const taskStartTime = new Date(task.startTime);
    const normalizedDate = normalizeDate(date);
    const dayOfWeek = date.getDay().toString();

    switch (task.frequency) {
      case "once":
        return normalizeDate(taskStartTime) === normalizedDate;
      case "daily":
        return true;
      case "weekly":
        return task.selectedDays.includes(dayOfWeek);
      case "custom":
        return task.selectedDays.includes(normalizedDate);
      default:
        return false;
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      setRefreshing(true);
      await deleteTask(taskToDelete.id);
      console.log(`Task "${taskToDelete.title}" deleted successfully`);
      
      setDeleteModalVisible(false);
      setTaskToDelete(null);
      await loadData();
      
      Alert.alert("Success", `Task "${taskToDelete.title}" has been deleted`);
    } catch (error) {
      console.error("Error deleting task:", error);
      Alert.alert("Error", "Failed to delete task. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const showDeleteConfirmation = (task: Task) => {
    setTaskToDelete(task);
    setDeleteModalVisible(true);
    setOptionsModalVisible(false);
  };

  const showOptionsModal = (task: Task) => {
    setSelectedTask(task);
    setOptionsModalVisible(true);
  };

  const { days, firstDay } = getDaysInMonth(selectedDate);

  const renderCalendar = () => {
    const calendar: React.ReactElement[] = [];
    let week: React.ReactElement[] = [];

    for (let i = 0; i < firstDay; i++) {
      week.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    for (let day = 1; day <= days; day++) {
      const date = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        day
      );
      const isToday = normalizeDate(new Date()) === normalizeDate(date);

      const hasTasks = tasks.some(task => taskOccursOnDate(task, date));

      week.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && styles.today,
          ]}
          onPress={() => setSelectedDate(date)}
        >
          <Text style={[styles.dayText, isToday && styles.todayText]}>
            {day}
          </Text>
          {hasTasks && <View style={styles.eventDot} />}
        </TouchableOpacity>
      );

      if (week.length === 7) {
        calendar.push(
          <View key={`week-${day}`} style={styles.calendarWeek}>
            {week}
          </View>
        );
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) {
        week.push(<View key={`empty-end-${week.length}`} style={styles.calendarDay} />);
      }
      calendar.push(
        <View key="last-week" style={styles.calendarWeek}>
          {week}
        </View>
      );
    }

    return calendar;
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      setRefreshing(true);
      const currentDate = normalizeDate(selectedDate);
      const currentTime = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      console.log(`Recording slot for task ${taskId} on ${currentDate} at ${currentTime}`);
      
      await recordSlot(taskId, currentDate, [currentTime]);
      
      await loadData();
      
      console.log(`Successfully recorded completion for task ${taskId}`);
    } catch (error) {
      console.error("Error completing task:", error);
      Alert.alert("Error", "Failed to mark task as complete");
    }
  };

  // FIXED: Proper completion detection that matches slot history format
  const isTaskCompleted = (taskId: string, date: Date): boolean => {
    const normalizedDate = normalizeDate(date);
    
    console.log(`Checking completion for task ${taskId} on ${normalizedDate}`);
    
    // Find ALL slot history entries for this task and date
    const daySlots = slotHistory.filter(
      (slot) => {
        const slotDateNormalized = normalizeDate(slot.date);
        const matches = slot.taskId === taskId && slotDateNormalized === normalizedDate;
        
        if (matches) {
          console.log(`✓ Found matching slot:`, {
            slotTaskId: slot.taskId,
            slotDate: slot.date,
            normalizedSlotDate: slotDateNormalized,
            targetDate: normalizedDate,
            timeSlots: slot.timeSlots,
            hasTimeSlots: slot.timeSlots.length > 0
          });
        }
        
        return matches;
      }
    );
    
    // Check if any of the matching slots have time slots
    const hasCompletedSlots = daySlots.some(slot => slot.timeSlots && slot.timeSlots.length > 0);
    
    console.log(`Completion result for task ${taskId}:`, {
      normalizedDate,
      matchingSlotsCount: daySlots.length,
      hasCompletedSlots,
      allMatchingSlots: daySlots.map(slot => ({
        date: slot.date,
        timeSlots: slot.timeSlots
      }))
    });
    
    return hasCompletedSlots;
  };

  const renderTasksForDate = () => {
    const normalizedSelectedDate = normalizeDate(selectedDate);
    
    console.log(`\n=== Rendering tasks for: ${normalizedSelectedDate} ===`);
    console.log(`Total tasks: ${tasks.length}, Slot history entries: ${slotHistory.length}`);

    const dayTasks = tasks.filter(task => taskOccursOnDate(task, selectedDate));

    console.log(`Filtered tasks for date: ${dayTasks.length}`);

    if (dayTasks.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>No tasks scheduled for this day</Text>
        </View>
      );
    }

    return dayTasks.map((task) => {
      const completed = isTaskCompleted(task.id, selectedDate);

      console.log(`Rendering task "${task.title}": completed = ${completed}`);

      return (
        <View key={task.id} style={styles.medicationCard}>
          <View
            style={[
              styles.medicationColor,
              { backgroundColor: task.color },
            ]}
          />
          <View style={styles.medicationInfo}>
            <View style={styles.taskHeader}>
              <Text style={styles.medicationName}>{task.title}</Text>
              <TouchableOpacity 
                style={styles.deleteIconButton}
                onPress={() => showOptionsModal(task)}
              >
                <Ionicons name="ellipsis-vertical" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.medicationDosage}>{task.description}</Text>
            <Text style={styles.medicationTime}>
              {new Date(task.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </Text>
            <Text style={styles.medicationFrequency}>
              Frequency: {task.frequency}
            </Text>
            <Text style={[styles.completionStatus, completed ? styles.completedText : styles.pendingText]}>
              Status: {completed ? 'Completed' : 'Pending'}
            </Text>
          </View>
          {completed ? (
            <View style={styles.takenBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#4C50AF" />
              <Text style={styles.takenText}>Completed</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.takeDoseButton,
                { backgroundColor: task.color },
              ]}
              onPress={() => handleCompleteTask(task.id)}
              disabled={refreshing}
            >
              <Text style={styles.takeDoseText}>
                {refreshing ? '...' : 'Complete'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    });
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
                  disabled={refreshing}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={handleDeleteTask}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Text style={styles.deleteButtonText}>Deleting...</Text>
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={18} color="white" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Options Modal
  const renderOptionsModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={optionsModalVisible}
      onRequestClose={() => setOptionsModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setOptionsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.optionsModalContent}>
              <Text style={styles.optionsModalTitle}>Task Options</Text>
              
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  setOptionsModalVisible(false);
                  Alert.alert("Edit", "Edit functionality would go here");
                }}
              >
                <Ionicons name="create-outline" size={20} color="#1a2d8e" />
                <Text style={styles.optionButtonText}>Edit Task</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.optionButton, styles.deleteOptionButton]}
                onPress={() => {
                  if (selectedTask) {
                    showDeleteConfirmation(selectedTask);
                  }
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                <Text style={[styles.optionButtonText, styles.deleteOptionText]}>Delete Task</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelOptionButton}
                onPress={() => setOptionsModalVisible(false)}
              >
                <Text style={styles.cancelOptionText}>Cancel</Text>
              </TouchableOpacity>
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
            <Ionicons name="chevron-back" size={28} color="#1a2d8e" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calendar</Text>
        </View>

        <View style={styles.calendarContainer}>
          <View style={styles.monthHeader}>
            <TouchableOpacity
              onPress={() =>
                setSelectedDate(
                  new Date(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth() - 1,
                    1
                  )
                )
              }
            >
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {selectedDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setSelectedDate(
                  new Date(
                    selectedDate.getFullYear(),
                    selectedDate.getMonth() + 1,
                    1
                  )
                )
              }
            >
              <Ionicons name="chevron-forward" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayHeader}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          {renderCalendar()}
        </View>

        <View style={styles.scheduleContainer}>
          <Text style={styles.scheduleTitle}>
            {selectedDate.toLocaleDateString("default", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={loadData}
                colors={["#1a2d8e"]}
              />
            }
          >
            {renderTasksForDate()}
          </ScrollView>
        </View>
      </View>

      {renderDeleteModal()}
      {renderOptionsModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 140 : 120,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginLeft: 15,
  },
  calendarContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    margin: 20,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  weekdayHeader: {
    flexDirection: "row",
    marginBottom: 10,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    color: "#666",
    fontWeight: "500",
  },
  calendarWeek: {
    flexDirection: "row",
    marginBottom: 5,
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    position: 'relative',
  },
  dayText: {
    fontSize: 16,
    color: "#333",
  },
  today: {
    backgroundColor: "#1a2d8e",
  },
  todayText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1a2d8e",
    position: "absolute",
    bottom: 8,
  },
  scheduleContainer: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 15,
  },
  medicationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medicationColor: {
    width: 12,
    height: 40,
    borderRadius: 6,
    marginRight: 15,
  },
  medicationInfo: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  deleteIconButton: {
    padding: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  medicationTime: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  medicationFrequency: {
    fontSize: 12,
    color: "#888",
    fontStyle: 'italic',
  },
  completionStatus: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  completedText: {
    color: '#4C50AF',
  },
  pendingText: {
    color: '#666',
  },
  takeDoseButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  takeDoseText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  takenBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  takenText: {
    color: "#4C50AF",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    textAlign: "center",
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
  optionsModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 300,
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
  optionsModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
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
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  deleteOptionButton: {
    backgroundColor: '#FFF5F5',
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a2d8e',
    marginLeft: 12,
  },
  deleteOptionText: {
    color: '#FF6B6B',
  },
  cancelOptionButton: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f8f9fa',
  },
  cancelOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
});