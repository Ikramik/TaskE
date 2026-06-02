import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { addTask } from "../../utils/storage";

// ⚠️ Ensure this matches your computer's IP
const API_URL = "http://192.168.1.38:5000/chat";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ParsedTask {
  title: string;
  description?: string;
  duration?: number;
  time?: string;
  dateStr?: string; // Stores "monday", "tomorrow", etc.
}

export default function ChatbotScreen() {
  const [category, setCategory] = useState('personal');
  const [priority, setPriority] = useState('medium');
  const router = useRouter();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm TaskE. What would you like to schedule?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTask, setPendingTask] = useState<Partial<ParsedTask> | null>(null);
  
  const flatListRef = useRef<FlatList>(null);

  // --- 📅 DATE UTILITIES ---
  const getNextDayOfWeek = (dayName: string) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    const targetDay = days.indexOf(dayName.toLowerCase());
    if (targetDay === -1) return today;

    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7; // Move to next week if day passed

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntil);
    return nextDate;
  };

  const calculateTaskDateTime = (timeStr: string, dateStr: string) => {
    let targetDate = new Date();

    // 1. Handle Date
    const lowerDate = dateStr.toLowerCase();
    if (lowerDate.includes("tomorrow")) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].some(d => lowerDate.includes(d))) {
      targetDate = getNextDayOfWeek(lowerDate);
    }
    // If "today" or unknown, it stays as new Date() (Today)

    // 2. Handle Time (Parses "5pm", "10:30am")
    const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

      if (period === "pm" && hours < 12) hours += 12;
      if (period === "am" && hours === 12) hours = 0;

      targetDate.setHours(hours, minutes, 0, 0);
    }

    return targetDate.toISOString();
  };

  const parseTaskFromMessage = (message: string): ParsedTask | null => {
    const lowerMessage = message.toLowerCase();

    // Regex: Time
    const timeMatch = lowerMessage.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    
    // Regex: Duration
    const durationMatch = lowerMessage.match(/(\d+)\s*(?:hour|hr|minute|min)/i);
    let duration: number | undefined;
    if (durationMatch) {
      const value = parseInt(durationMatch[1]);
      if (lowerMessage.includes("hour") || lowerMessage.includes("hr")) {
        duration = value * 60;
      } else {
        duration = value;
      }
    }

    // Regex: Date Keywords
    const daysRegex = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)/i;
    const dateMatch = lowerMessage.match(daysRegex);

    // Clean Title
    let title = message
      .replace(/(add|create|remind me to|task to|schedule)\s*/gi, "")
      .replace(/(at|for|on)\s+\d.*/gi, "")
      .replace(daysRegex, "")
      .trim();

    if (title.length < 2) title = message;

    return {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      description: `Created via AI`,
      duration: duration,
      time: timeMatch ? timeMatch[0] : undefined,
      dateStr: dateMatch ? dateMatch[0] : undefined
    };
  };

  const generateBotResponse = async (userMessage: string) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userMessage }),
      });

      if (!response.ok) throw new Error("Server Error");
      const data = await response.json();
      return {
        text: data.text,
        intent: data.intent || "unknown",
      };
    } catch (error) {
      return { text: "I'm having trouble connecting.", intent: "error" };
    }
  };

  const handleAddTask = async (task: ParsedTask) => {
    try {
      const finalStartTime = calculateTaskDateTime(task.time!, task.dateStr || "today");

      await addTask({
        id: Date.now().toString(),
        title: task.title,
        description: task.description,
        frequency: "once",
        selectedDays: [],
        duration: task.duration || 60,
        startTime: finalStartTime,
        completed: false,
        color: "#1a2d8e",
        reminderEnabled: true,
        category: category,
        priority: priority as any,
        categoryColor: "#1a2d8e"
      });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessageText = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: userMessageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    // 1. Get Intent from Cloud
    const aiResult = await generateBotResponse(userMessageText);
    
    // 2. Local Parsing
    const parsed = parseTaskFromMessage(userMessageText);
    
    let botReplyText = aiResult.text;
    let shouldSave = false;
    let finalTask: ParsedTask | null = null;

    // --- 🧠 IMPROVED LOGIC ---

    if (pendingTask) {
      // Merging info logic
      const mergedTask = { ...pendingTask };
      if (parsed?.time) mergedTask.time = parsed.time;
      if (parsed?.duration) mergedTask.duration = parsed.duration;
      if (parsed?.dateStr) mergedTask.dateStr = parsed.dateStr;

      // CHECK: Do we have EVERYTHING?
      if (!mergedTask.dateStr) {
         botReplyText = "Which day? (e.g., Today, Tomorrow, Monday)";
         setPendingTask(mergedTask); 
      } else if (!mergedTask.time) {
         botReplyText = `What time on ${mergedTask.dateStr}?`;
         setPendingTask(mergedTask);
      } else if (!mergedTask.duration) {
         botReplyText = "How long will this task take? (e.g., 1 hour)";
         setPendingTask(mergedTask);
      } else {
         // All good!
         finalTask = mergedTask as ParsedTask;
         shouldSave = true;
         setPendingTask(null);
         botReplyText = `Perfect. Scheduling "${finalTask.title}" on ${finalTask.dateStr} at ${finalTask.time} for ${finalTask.duration} mins.`;
      }

    } else if (aiResult.intent === "add_task") {
      // New Task Request
      const tempTask = parsed || { title: "New Task" };
      
      if (!tempTask.dateStr) {
        botReplyText = `I can add "${tempTask.title}". Which day?`;
        setPendingTask(tempTask);
      } else if (!tempTask.time) {
        botReplyText = `What time on ${tempTask.dateStr}?`;
        setPendingTask(tempTask);
      } else if (!tempTask.duration) {
        botReplyText = "How long is the task?";
        setPendingTask(tempTask);
      } else {
        finalTask = tempTask as ParsedTask;
        shouldSave = true;
        botReplyText = `Scheduling "${finalTask.title}" on ${finalTask.dateStr} at ${finalTask.time}.`;
      }
    }

    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: botReplyText,
      isUser: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, botMessage]);

    if (shouldSave && finalTask) {
      const success = await handleAddTask(finalTask);
      if (success) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: (Date.now() + 2).toString(),
            text: `✅ Saved to Calendar!`,
            isUser: false,
            timestamp: new Date(),
          }]);
        }, 500);
      }
    }

    setIsLoading(false);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.isUser ? styles.userMessage : styles.botMessage]}>
      <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.messageText, item.isUser ? styles.userMessageText : styles.botMessageText]}>
          {item.text}
        </Text>
        <Text style={styles.timestamp}>
           {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1a2d8e", "#031c9cff"]} style={styles.headerGradient} start={{ x: 0.2, y: 1 }} end={{ x: 0, y: 0 }} />
      <View style={styles.content}>
        <View style={styles.header}>
           <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>TaskE Assistant</Text>
            <Text style={styles.headerSubtitle}>Online</Text>
          </View>
          <View style={{width: 28}} /> 
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
        />

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type message..."
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerGradient: { height: 120, position: "absolute", top: 0, left: 0, right: 0 },
  content: { flex: 1, marginTop: 60 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 15 },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#b4b4b4ff" },
  backButton: { padding: 5 },
  messagesList: { flex: 1 },
  messagesContainer: { padding: 16, paddingBottom: 8 },
  messageContainer: { marginBottom: 16, flexDirection: "row" },
  userMessage: { justifyContent: "flex-end" },
  botMessage: { justifyContent: "flex-start" },
  messageBubble: { maxWidth: "80%", padding: 12, borderRadius: 18 },
  userBubble: { backgroundColor: "#1a2d8e", borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: "#f0f0f0", borderBottomLeftRadius: 4 },
  messageText: { fontSize: 16 },
  userMessageText: { color: "white" },
  botMessageText: { color: "#333" },
  timestamp: { fontSize: 11, color: "#ccc", marginTop: 4, alignSelf: "flex-end" },
  inputContainer: { padding: 16, paddingTop: 8, backgroundColor: "white", borderTopWidth: 1, borderColor: "#f0f0f0" },
  inputWrapper: { flexDirection: "row", backgroundColor: "#f8f9fa", borderRadius: 24, padding: 8, paddingLeft: 16, alignItems: 'center' },
  textInput: { flex: 1, padding: 8, fontSize: 16 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1a2d8e", justifyContent: "center", alignItems: "center", marginLeft: 8 },
});