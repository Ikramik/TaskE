import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, Animated,
  Modal, Alert, AppState,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import {
  getTasks, Task, getTodaysSlots, recordSlot, SlotHistory,
} from "../utils/storage";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  registerForPushNotificationsAsync, scheduleTaskReminder,
} from "../utils/notifications";

const { width } = Dimensions.get("window");

// Create animated circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const CATEGORIES = [
  { id: 'work', label: 'Work', icon: 'briefcase-outline', color: '#2196F3' },
  { id: 'personal', label: 'Personal', icon: 'person-outline', color: '#4CAF50' },
  { id: 'health', label: 'Health', icon: 'fitness-outline', color: '#FF9800' },
  { id: 'study', label: 'Study', icon: 'school-outline', color: '#9C27B0' },
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#4CAF50' },
  { id: 'medium', label: 'Medium', color: '#FF9800' },
  { id: 'high', label: 'High', color: '#F44336' },
];
const Quick_Actions = [{
  icon: "add-circle-outline" as const,
  label: "Add Task",
  route: "/tasks/add" as any,
  color: "#171940ff",
  gradient: ["#44479cff", "#232661ff"] as [string, string],
},
{
  icon: "calendar-outline" as const,
  label: "Calendar\nView",
  route: "/calendar" as any,
  color: "#1976D2",
  gradient: ["#2196F3", "#1976D2"] as [string, string],
},
{
  icon: "people-outline" as const,
  label: "Your TaskE",
  route: "/chatbot" as any,
  color: "#23085cff",
  gradient: ["#6c42c5ff", "#310d80ff"] as [string, string],
},
{
  icon: "create-outline" as const,
  label: "Completion\nTracker",
  route: "/tracker" as any,
  color: "#C2185B",
  gradient: ["#e24a7dff", "#C2185B"] as [string, string],
},
{
  icon: "settings-outline" as const,
  label: "Settings",
  route: "/settings" as any,
  color: "#666666",
  gradient: ["#888888", "#666666"] as [string, string],
},

];

interface CircularProgressProps {
  progress: number;
  totalslots: number;
  completedslots: number;
}

function CircularProgress({
  progress,
  totalslots,
  completedslots,
}: CircularProgressProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const size = width * 0.55;
  const strokeWidth = 15;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTextContainer}>
        <Text style={styles.progressPercentage}>
          {Math.round(progress * 100)}%
        </Text>
        <Text style={styles.progressDetails}>
          {completedslots} of {totalslots} tasks
        </Text>
      </View>
      <Svg width={size} height={size} style={styles.progressRing}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="white"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todaystasks, setTodaystasks] = useState<Task[]>([]);
  const [completedslots, setCompletedslots] = useState(0);
  const [slotHistory, setSlotHistory] = useState<SlotHistory[]>([]);
  const getCategoryIcon = (category?: string) => {
    if (!category) return 'ellipse-outline';
    const cat = CATEGORIES.find(c => c.id === category);
    return cat ? cat.icon : 'ellipse-outline';
  };

  const getCategoryLabel = (category?: string) => {
    if (!category) return '';
    const cat = CATEGORIES.find(c => c.id === category);
    return cat ? cat.label : '';
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return '#666';
    const prio = PRIORITIES.find(p => p.id === priority);
    return prio ? prio.color : '#666';
  };
  const loadtasks = useCallback(async () => {
    try {
      const [alltasks, todaysslots] = await Promise.all([
        getTasks(),
        getTodaysSlots(),
      ]);

      setSlotHistory(todaysslots);
      setTasks(alltasks);

      // Filter tasks for today
      const today = new Date();
      const todayDayOfWeek = today.getDay().toString();
      const todaytasks = alltasks.filter((task) => {
        const taskStartTime = new Date(task.startTime);

        // Check if task should occur today based on frequency
        switch (task.frequency) {
          case "once":
            return taskStartTime.toDateString() === today.toDateString();
          case "daily":
            return true;
          case "weekly":
            return task.selectedDays.includes(todayDayOfWeek);
          case "custom":
            return task.selectedDays.includes(todayDayOfWeek);
          default:
            return false;
        }
      });

      setTodaystasks(todaytasks);

      // Calculate completed slots
      const completed = todaysslots.filter((slot) => slot.timeSlots.length > 0).length;
      setCompletedslots(completed);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  }, []);

  const setupNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        console.log("Failed to get push notification token");
        return;
      }

      // Schedule reminders for all tasks
      const tasks = await getTasks();
      for (const task of tasks) {
        if (task.reminderEnabled) {
          await scheduleTaskReminder(task);
        }
      }
    } catch (error) {
      console.error("Error setting up notifications:", error);
    }
  };

  // Use useEffect for initial load
  useEffect(() => {
    loadtasks();
    setupNotifications();

    // Handle app state changes for notifications
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        loadtasks();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Use useFocusEffect for subsequent updates
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = () => {
        // Cleanup if needed
      };

      loadtasks();
      return () => unsubscribe();
    }, [loadtasks])
  );

  const handleTakeslot = async (task: Task) => {
    try {
      const currentTime = new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });

      await recordSlot(task.id, new Date().toISOString().split('T')[0], [currentTime]);
      await loadtasks(); // Reload data after recording slot
    } catch (error) {
      console.error("Error recording slot:", error);
      Alert.alert("Error", "Failed to record slot. Please try again.");
    }
  };

  const isslotdone = (taskId: string) => {
    return slotHistory.some(
      (slot) => slot.taskId === taskId && slot.timeSlots.length > 0
    );
  };

  const progress =
    todaystasks.length > 0
      ? completedslots / todaystasks.length
      : 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={["#1a2d8e", "#142269"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.flex1}>
              <Text style={styles.greeting}>Daily Progress</Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => router.push("/sign-in")}
            >
              <Ionicons name="person-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <CircularProgress
            progress={progress}
            totalslots={todaystasks.length }
            completedslots={completedslots}
          />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {Quick_Actions.map((action) => (
              <Link href={action.route} key={action.label} asChild>
                <TouchableOpacity style={styles.actionButton}>
                  <LinearGradient
                    colors={action.gradient}
                    style={styles.actionGradient}
                  >
                    <View style={styles.actionContent}>
                      <View style={styles.actionIcon}>
                        <Ionicons name={action.icon} size={28} color="white" />
                      </View>
                      <Text style={styles.actionLabel}>{action.label}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <Link href="./calendar/index" asChild>
              <TouchableOpacity>
                <Text style={styles.seeAllButton}>See All</Text>
              </TouchableOpacity>
            </Link>
          </View>
          {todaystasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="alarm-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>
                No tasks scheduled for today
              </Text>
              <Link href="/tasks/add" asChild>
                <TouchableOpacity style={styles.addtaskButton}>
                  <Text style={styles.addtaskButtonText}>
                    Add task
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          ) : (
            todaystasks.map((task) => {
              const done = isslotdone(task.id);
              return (
                <View key={task.id} style={styles.slotCard}>
                  <View
                    style={[
                      styles.slotBadge,
                      {
                        backgroundColor: task.categoryColor ? `${task.categoryColor}15` : `${task.color}15`,
                        borderLeftColor: task.categoryColor || task.color,
                        borderLeftWidth: 4,
                      },
                    ]}
                  >
                    <Ionicons
                      name={getCategoryIcon(task.category) as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={task.categoryColor || task.color}
                    />
                  </View>

                  <View style={styles.slotInfo}>
                    <View>
                      <Text style={styles.taskName}>{task.title}</Text>

                      {/* Add category and priority here */}
                      <View style={styles.taskMeta}>
                        <Text style={styles.periodInfo}>{task.duration} min</Text>

                        {/* Show category if available */}
                        {task.category && (
                          <View style={styles.categoryTag}>
                            <Ionicons
                               name={getCategoryIcon(task.category) as keyof typeof Ionicons.glyphMap}
                              size={12}
                              color="#666"
                            />
                            <Text style={styles.categoryTagText}>
                              {getCategoryLabel(task.category)}
                            </Text>
                          </View>
                        )}

                        {/* Show priority if available */}
                        {task.priority && task.priority !== 'medium' && (
                          <View style={[
                            styles.priorityBadge,
                            { backgroundColor: getPriorityColor(task.priority) }
                          ]}>
                            <Text style={styles.priorityBadgeText}>
                              {task.priority}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.slotTime}>
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text style={styles.timeText}>
                        {new Date(task.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  </View>

                  {done ? (
                    <View style={[styles.doneBadge]}>
                      <Ionicons
                        name="checkmark-done-circle-outline"
                        size={20}
                        color="#4C50AF"
                      />
                      <Text style={styles.doneText}>Done</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.takeslotButton,
                        { backgroundColor: task.categoryColor || task.color },
                      ]}
                      onPress={() => handleTakeslot(task)}
                    >
                      <Ionicons name="hourglass-outline" size={20} color="white" />
                      <Text style={styles.takeslotText}>Pending</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }))}

        </View>
      </View>

      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity
                onPress={() => setShowNotifications(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {todaystasks.map((task) => (
              <View key={task.id} style={styles.notificationItem}>
                <View style={styles.notificationIcon}>
                  <Ionicons name="checkmark" size={24} color={task.color} />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>
                    {task.title}
                  </Text>
                  <Text style={styles.notificationMessage}>
                    {task.duration}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {new Date(task.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 15,
  },
  actionButton: {
    width: (width - 52) / 2,
    height: 110,
    borderRadius: 16,
    overflow: "hidden",
  },
  actionGradient: {
    flex: 1,
    padding: 15,
  },
  actionContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 5,
  },
  seeAllButton: {
    color: "#2E327D",
    fontWeight: "600",
  },
  slotCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  slotBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  slotInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  taskName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  periodInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  slotTime: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    marginLeft: 5,
    color: "#666",
    fontSize: 14,
  },
  takeslotButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginLeft: 10,
  },
  takeslotText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  progressContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  progressTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  progressPercentage: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
  },
  progressLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
  },
  progressRing: {
    transform: [{ rotate: "-90deg" }],
  },
  flex1: {
    flex: 1,
  },
  notificationButton: {
    position: "relative",
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    marginLeft: 8,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF5252",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#142269",
    paddingHorizontal: 4,
  },
  notificationCount: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },
  progressDetails: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  notificationItem: {
    flexDirection: "row",
    padding: 15,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    marginBottom: 10,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "white",
    borderRadius: 16,
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    marginBottom: 20,
  },
  addtaskButton: {
    backgroundColor: "#1a2d8e",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addtaskButtonText: {
    color: "white",
    fontWeight: "600",
  },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 10,
  },
  doneText: {
    color: "#4C50AF",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  profileButton: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    marginLeft: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  categoryTagText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  priorityBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});