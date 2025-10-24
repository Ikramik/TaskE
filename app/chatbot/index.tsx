import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { addTask } from "../../utils/storage";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}
const CATEGORIES = [
    { id: 'work', label: 'Work', icon: 'briefcase-outline', color: '#2196F3' },
    { id: 'personal', label: 'Personal', icon: 'person-outline', color: '#4CAF50' },
    { id: 'health', label: 'Health', icon: 'fitness-outline', color: '#FF9800' },
    { id: 'study', label: 'Study', icon: 'school-outline', color: '#9C27B0' },
];
interface ParsedTask {
  title: string;
  description?: string;
  duration?: number;
  time?: string;
}

export default function ChatbotScreen() {
  const [form, setForm] = useState({
        title: "",
        description: "",
        frequency: "",
        selectedDays: [] as string[],
        duration: 0,
        durationType: "preset",
        customHours: "0",
        customMinutes: "30",
        startTime: new Date(), 
        showTimePicker: false,
        reminderEnabled: true,
    });
  const [category, setCategory] = useState('personal');
    const [priority, setPriority] = useState('medium');
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I'm TaskE, your smart assistant.\nI can help you add tasks. \nTry saying: 'Add a task to study for 2 hours at 3 PM' or 'Remind me to call mom tomorrow'",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const parseTaskFromMessage = (message: string): ParsedTask | null => {
    const lowerMessage = message.toLowerCase();
    
    // Extract time patterns
    const timeMatch = lowerMessage.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    const time = timeMatch ? timeMatch[0] : undefined;

    // Extract duration patterns
    const durationMatch = lowerMessage.match(/(\d+)\s*(?:hour|hr|minute|min)/i);
    let duration: number | undefined;
    if (durationMatch) {
      const value = parseInt(durationMatch[1]);
      if (lowerMessage.includes("hour") || lowerMessage.includes("hr")) {
        duration = value * 60; // Convert hours to minutes
      } else {
        duration = value; // Minutes
      }
    }

    // Remove common phrases to get the task title
    let title = message
      .replace(/(add|create|remind me to|task to|schedule)\s*/gi, "")
      .replace(/(at|for|on)\s+\d.*/gi, "")
      .trim();

    // If no meaningful title extracted, use the original message
    if (title.length < 3) {
      title = message;
    }

    return {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      description: `Created via chatbot: "${message}"`,
      duration: duration || 30, // Default 30 minutes
      time,
    };
  };

  const generateBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
      return "Hello! How can I help you with your tasks today?";
    }

    if (lowerMessage.includes("thank")) {
      return "You're welcome! Is there anything else you'd like to add to your tasks?";
    }

    if (lowerMessage.includes("help")) {
      return "I can help you add tasks to your schedule. Just tell me what you want to do and when. For example: 'Add yoga class at 5 PM for 1 hour' or 'Remind me to buy groceries tomorrow'";
    }

    const parsedTask = parseTaskFromMessage(userMessage);
    if (parsedTask) {
      return `I'll add "${parsedTask.title}" to your tasks${parsedTask.time ? ` at ${parsedTask.time}` : ""}${parsedTask.duration ? ` for ${parsedTask.duration} minutes` : ""}. Would you like me to add this task?`;
    }

    return "I can help you add tasks to your schedule. Try saying something like: 'Add meeting with team at 2 PM' or 'Schedule gym session for 1 hour'";
  };

  const handleAddTask = async (parsedTask: ParsedTask) => {
    try {
      const taskData = {
                id: Date.now().toString(),
                title: form.title,
                description: form.description,
                frequency: form.frequency as "once" | "daily" | "weekly" | "custom",
                selectedDays: form.selectedDays,
                duration: form.duration,
                startTime: form.startTime.toISOString(),
                completed: false,
                createdAt: new Date().toISOString(),
                color: "#1a2d8e",
                reminderEnabled: form.reminderEnabled,
                category: category,
                priority: priority as "low" | "medium" | "high",
                categoryColor: CATEGORIES.find(cat => cat.id === category)?.color || "#1a2d8e"
            };

      await addTask(taskData);
      return true;
    } catch (error) {
      console.error("Error adding task:", error);
      return false;
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    // Simulate AI thinking delay
    setTimeout(async () => {
      const botResponseText = generateBotResponse(userMessage.text);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponseText,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);

      // If the bot suggests adding a task, automatically add it
      const parsedTask = parseTaskFromMessage(userMessage.text);
      if (parsedTask && botResponseText.includes("I'll add")) {
        const success = await handleAddTask(parsedTask);
        
        if (success) {
          setTimeout(() => {
            const confirmationMessage: Message = {
              id: (Date.now() + 2).toString(),
              text: `✅ Task "${parsedTask.title}" has been added to your schedule!`,
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, confirmationMessage]);
          }, 1000);
        }
      }

      setIsLoading(false);
    }, 1500);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.botMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.botBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isUser ? styles.userMessageText : styles.botMessageText
        ]}>
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
      <LinearGradient
        colors={["#1a2d8e", "#031c9cff"]}
        style={styles.headerGradient}
        start={{ x: 0.2, y: 1 }}
        end={{ x: 0, y: 0 }}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#ffffffff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>TaskE Assistant</Text>
            <Text style={styles.headerSubtitle}>Online</Text>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#ffffffff" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.inputContainer}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your task here..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons
                name={isLoading ? "time-outline" : "send"}
                size={20}
                color="white"
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 5,
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffffff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#b4b4b4ff",
    marginTop: 2,
  },
  menuButton: {
    padding: 5,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
    flexDirection: "row",
  },
  userMessage: {
    justifyContent: "flex-end",
  },
  botMessage: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: "#1a2d8e",
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: "#f0f0f0",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: "white",
  },
  botMessageText: {
    color: "#333",
  },
  timestamp: {
    fontSize: 11,
    color: "rgba(89, 83, 83, 0.7)",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  inputContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f8f9fa",
    borderRadius: 24,
    padding: 8,
    paddingLeft: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    color: "#333",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a2d8e",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
});