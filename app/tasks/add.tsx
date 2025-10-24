import { useState } from "react";
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Switch, Dimensions, Platform, KeyboardAvoidingView,
    Alert, Modal
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { addTask } from "../../utils/storage";
import { scheduleTaskReminder, scheduleRefillReminder } from "../../utils/notifications";

const { width } = Dimensions.get("window");
const PRIORITIES = [
    { id: 'low', label: 'Low', color: '#4CAF50' },
    { id: 'medium', label: 'Medium', color: '#FF9800' },
    { id: 'high', label: 'High', color: '#F44336' },
];

const CATEGORIES = [
    { id: 'work', label: 'Work', icon: 'briefcase-outline', color: '#2196F3' },
    { id: 'personal', label: 'Personal', icon: 'person-outline', color: '#4CAF50' },
    { id: 'health', label: 'Health', icon: 'fitness-outline', color: '#FF9800' },
    { id: 'study', label: 'Study', icon: 'school-outline', color: '#9C27B0' },
];
const DAYS_OF_WEEK = [
    { id: "0", label: "Sun", fullName: "Sunday" },
    { id: "1", label: "Mon", fullName: "Monday" },
    { id: "2", label: "Tue", fullName: "Tuesday" },
    { id: "3", label: "Wed", fullName: "Wednesday" },
    { id: "4", label: "Thu", fullName: "Thursday" },
    { id: "5", label: "Fri", fullName: "Friday" },
    { id: "6", label: "Sat", fullName: "Saturday" },
];

const DURATION_OPTIONS = [
    { id: "15min", label: "15 min", value: 15, type: "minutes" },
    { id: "30min", label: "30 min", value: 30, type: "minutes" },
    { id: "45min", label: "45 min", value: 45, type: "minutes" },
    { id: "1hour", label: "1 hour", value: 60, type: "minutes" },
    { id: "2hours", label: "2 hours", value: 120, type: "minutes" },
    { id: "4hours", label: "4 hours", value: 240, type: "minutes" },
    { id: "custom", label: "Custom", value: 0, type: "custom" },
];

export default function AddTaskScreen() {
    const [category, setCategory] = useState('personal');
    const [priority, setPriority] = useState('medium');
    const router = useRouter();
    const [form, setForm] = useState({
        title: "",
        description: "",
        frequency: "",
        selectedDays: [] as string[],
        duration: 0,
        durationType: "preset",
        customHours: "0",
        customMinutes: "30",
        startTime: new Date(), // Default to current time
        showTimePicker: false,
        reminderEnabled: true,
    });

    const [showDayPicker, setShowDayPicker] = useState(false);
    const [showCustomDuration, setShowCustomDuration] = useState(false);
    const FREQUENCY_OPTIONS = [
        {
            id: "once",
            label: "Once",
            icon: "calendar-outline" as const,
            description: "One-time task"
        },
        {
            id: "daily",
            label: "Daily",
            icon: "repeat-outline" as const,
            description: "Every day"
        },
        {
            id: "weekly",
            label: "Weekly",
            icon: "calendar-outline" as const,
            description: "Specific days of the week"
        },
        {
            id: "custom",
            label: "Custom",
            icon: "settings-outline" as const,
            description: "Choose specific days"
        }
    ];

    const [selectedFrequency, setSelectedFrequency] = useState("");

    const handleFrequencySelect = (frequencyId: string) => {
        setSelectedFrequency(frequencyId);
        setForm(prev => ({
            ...prev,
            frequency: frequencyId,
            selectedDays: frequencyId === "custom" ? prev.selectedDays : []
        }));
    };

    const handleDurationSelect = (durationOption: typeof DURATION_OPTIONS[0]) => {
        if (durationOption.id === "custom") {
            setShowCustomDuration(true);
        } else {
            setForm(prev => ({
                ...prev,
                duration: durationOption.value,
                durationType: "preset"
            }));
        }
    };

    const toggleDaySelection = (dayId: string) => {
        setForm(prev => ({
            ...prev,
            selectedDays: prev.selectedDays.includes(dayId)
                ? prev.selectedDays.filter(id => id !== dayId)
                : [...prev.selectedDays, dayId]
        }));
    };

    const saveCustomDuration = () => {
        const hours = parseInt(form.customHours) || 0;
        const minutes = parseInt(form.customMinutes) || 0;
        const totalMinutes = hours * 60 + minutes;

        if (totalMinutes === 0) {
            Alert.alert("Error", "Please set a valid duration");
            return;
        }

        setForm(prev => ({
            ...prev,
            duration: totalMinutes,
            durationType: "custom"
        }));
        setShowCustomDuration(false);
    };
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!form.title.trim()) {
            newErrors.title = "Task title is required";
        }

        if (!form.frequency) {
            newErrors.frequency = "Frequency is required";
        }

        if (form.frequency === "weekly" && form.selectedDays.length === 0) {
            newErrors.frequency = "Please select at least one day for weekly tasks";
        }

        if (form.frequency === "custom" && form.selectedDays.length === 0) {
            newErrors.frequency = "Please select custom days";
        }

        if (form.duration === 0) {
            newErrors.duration = "Duration is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSaveTask = async () => {
        if (!validateForm()) {
            Alert.alert("Error", "Please fill in all required fields");
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

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
            await scheduleTaskReminder(taskData);

            Alert.alert("Success", "Task added successfully!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error) {
            Alert.alert("Error", "Failed to save task");
        } finally {
            setIsSubmitting(false);
        }
    };
    const renderFrequencyOptions = () => {
        return (
            <View style={styles.optionsGrid}>
                {FREQUENCY_OPTIONS.map((option) => (
                    <TouchableOpacity
                        key={option.id}
                        style={[
                            styles.optionCard,
                            selectedFrequency === option.id && styles.selectedOptionCard
                        ]}
                        onPress={() => handleFrequencySelect(option.id)}
                    >
                        <View style={[
                            styles.optionIcon,
                            selectedFrequency === option.id && styles.selectedOptionIcon
                        ]}>
                            <Ionicons
                                name={option.icon}
                                size={24}
                                color={selectedFrequency === option.id ? "white" : "#6d6d6dff"}
                            />
                        </View>
                        <Text style={[
                            styles.optionLabel,
                            selectedFrequency === option.id && styles.selectedOptionLabel
                        ]}>
                            {option.label}
                        </Text>
                        <Text style={styles.optionDescription}>
                            {option.description}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderDurationOptions = () => {
        return (
            <View style={styles.optionsGrid}>
                {DURATION_OPTIONS.map((option) => (
                    <TouchableOpacity
                        key={option.id}
                        style={[
                            styles.durationCard,
                            form.duration === option.value && form.durationType === "preset" && styles.selectedDurationCard,
                            option.id === "custom" && styles.customDurationCard
                        ]}
                        onPress={() => handleDurationSelect(option)}
                    >
                        {option.id === "custom" ? (
                            <>
                                <Ionicons name="time-outline" size={20} color="#8c9be7ff" />
                                <Text style={[
                                    styles.durationLabel,
                                    form.durationType === "custom" && styles.selectedDurationLabel
                                ]}>
                                    {option.label}
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={[
                                    styles.durationNumber,
                                    form.duration === option.value && styles.selectedDurationNumber
                                ]}>
                                    {option.value}
                                </Text>
                                <Text style={styles.durationUnit}>min</Text>
                                <Text style={styles.durationLabel}>{option.label}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderDayPicker = () => (
        <View style={styles.dayPickerContainer}>
            <Text style={styles.dayPickerTitle}>Select Days</Text>
            <View style={styles.daysGrid}>
                {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                        key={day.id}
                        style={[
                            styles.dayButton,
                            form.selectedDays.includes(day.id) && styles.selectedDayButton
                        ]}
                        onPress={() => toggleDaySelection(day.id)}
                    >
                        <Text style={[
                            styles.dayButtonText,
                            form.selectedDays.includes(day.id) && styles.selectedDayButtonText
                        ]}>
                            {day.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {form.selectedDays.length > 0 && (
                <View style={styles.selectedDaysContainer}>
                    <Text style={styles.selectedDaysLabel}>Selected:</Text>
                    <Text style={styles.selectedDaysText}>
                        {form.selectedDays
                            .map(dayId => DAYS_OF_WEEK.find(d => d.id === dayId)?.fullName)
                            .join(", ")}
                    </Text>
                </View>
            )}

            <View style={styles.dayPickerActions}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowDayPicker(false)}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => setShowDayPicker(false)}
                >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderCustomDurationPicker = () => (
        <View style={styles.customDurationContainer}>
            <Text style={styles.customDurationTitle}>Set Custom Duration</Text>

            <View style={styles.timeInputsContainer}>
                <View style={styles.timeInputGroup}>
                    <Text style={styles.timeInputLabel}>Hours</Text>
                    <TextInput
                        style={styles.timeInput}
                        value={form.customHours}
                        onChangeText={(text) => setForm(prev => ({ ...prev, customHours: text }))}
                        keyboardType="numeric"
                        maxLength={2}
                        placeholder="0"
                    />
                </View>

                <Text style={styles.timeSeparator}>:</Text>

                <View style={styles.timeInputGroup}>
                    <Text style={styles.timeInputLabel}>Minutes</Text>
                    <TextInput
                        style={styles.timeInput}
                        value={form.customMinutes}
                        onChangeText={(text) => setForm(prev => ({ ...prev, customMinutes: text }))}
                        keyboardType="numeric"
                        maxLength={2}
                        placeholder="30"
                    />
                </View>
            </View>

            <View style={styles.durationPreview}>
                <Text style={styles.durationPreviewText}>
                    Total: {parseInt(form.customHours) || 0}h {parseInt(form.customMinutes) || 0}m
                </Text>
            </View>

            <View style={styles.customDurationActions}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowCustomDuration(false)}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={saveCustomDuration}
                >
                    <Text style={styles.confirmButtonText}>Set Duration</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const getFrequencyDisplay = () => {
        switch (form.frequency) {
            case "once":
                return "One time only";
            case "daily":
                return "Every day";
            case "weekly":
                return "Weekly on selected days";
            case "custom":
                if (form.selectedDays.length === 0) {
                    return "Select custom days";
                }
                return `${form.selectedDays.length} day(s) selected`;
            default:
                return "Select frequency";
        }
    };

    const getDurationDisplay = () => {
        if (form.duration === 0) {
            return "Select duration";
        }

        if (form.durationType === "custom") {
            const hours = Math.floor(form.duration / 60);
            const minutes = form.duration % 60;

            if (hours > 0 && minutes > 0) {
                return `${hours}h ${minutes}m`;
            } else if (hours > 0) {
                return `${hours} hour${hours > 1 ? 's' : ''}`;
            } else {
                return `${minutes} minute${minutes > 1 ? 's' : ''}`;
            }
        } else {
            const option = DURATION_OPTIONS.find(opt => opt.value === form.duration);
            return option ? option.label : `${form.duration} min`;
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#1a2d8e", "#142269"]}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={28} color="#ffffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Add New Task</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.formContainer}>
                    <View style={styles.section}>
                        {/* Task Title */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[styles.mainInput, errors.title && styles.inputError]}
                                placeholder="Task Title"
                                placeholderTextColor="#999"
                                value={form.title}
                                onChangeText={(text) => {
                                    setForm(prev => ({ ...prev, title: text }));
                                    if (errors.title) setErrors(prev => ({ ...prev, title: "" }));
                                }}
                            />
                            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                        </View>

                        {/* Task Description */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[styles.mainInput, styles.textArea]}
                                placeholder="Task Description"
                                placeholderTextColor="#999"
                                multiline={true}
                                numberOfLines={4}
                                textAlignVertical="top"
                                value={form.description}
                                onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                            />
                        </View>

                        {/* Frequency Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>How often?</Text>
                            {errors.frequency && <Text style={styles.errorText}>{errors.frequency}</Text>}
                            <TouchableOpacity
                                style={styles.frequencyDisplay}
                                onPress={() => {
                                    if (form.frequency === "custom") {
                                        setShowDayPicker(true);
                                    }
                                }}
                            >
                                <Text style={styles.frequencyDisplayText}>
                                    {getFrequencyDisplay()}
                                </Text>
                                {(form.frequency === "custom" || form.frequency === "weekly") && (
                                    <Ionicons name="chevron-forward" size={20} color="#666" />
                                )}
                            </TouchableOpacity>

                            {renderFrequencyOptions()}

                            <Modal
                                visible={showDayPicker}
                                animationType="slide"
                                transparent={true}
                                onRequestClose={() => setShowDayPicker(false)}
                            >
                                <View style={styles.modalOverlay}>
                                    <View style={styles.modalContent}>
                                        {renderDayPicker()}
                                    </View>
                                </View>
                            </Modal>
                        </View>

                        {/* Duration Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>How long will it take?</Text>
                            {errors.duration && <Text style={styles.errorText}>{errors.duration}</Text>}


                            {renderDurationOptions()}

                            <Modal
                                visible={showCustomDuration}
                                animationType="slide"
                                transparent={true}
                                onRequestClose={() => setShowCustomDuration(false)}
                            >
                                <View style={styles.modalOverlay}>
                                    <View style={styles.modalContent}>
                                        {renderCustomDurationPicker()}
                                    </View>
                                </View>
                            </Modal>
                        </View>
                        {/* Time Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>What time?</Text>

                            <TouchableOpacity
                                style={styles.timeDisplay}
                                onPress={() => setForm(prev => ({ ...prev, showTimePicker: true }))}
                            >
                                <View style={styles.timeIconContainer}>
                                    <Ionicons name="time-outline" size={20} color="#1a2d8e" />
                                </View>
                                <Text style={styles.timeDisplayText}>
                                    {form.startTime.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                    })}
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#666" />
                            </TouchableOpacity>

                            {/* Time Picker */}
                            {form.showTimePicker && (
                                <DateTimePicker
                                    value={form.startTime}
                                    mode="time"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, selectedTime: Date | undefined) => {
                                        setForm(prev => ({
                                            ...prev,
                                            showTimePicker: false
                                        }));
                                        if (selectedTime) {
                                            setForm(prev => ({
                                                ...prev,
                                                startTime: selectedTime
                                            }));
                                        }
                                    }}
                                />
                            )}
                        </View>

                        {/* Category Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Category</Text>
                            <View style={styles.optionsGrid}>
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.categoryCard,
                                            category === cat.id && styles.selectedCategoryCard,
                                            { borderLeftColor: cat.color }
                                        ]}
                                        onPress={() => setCategory(cat.id)}
                                    >
                                        <View style={styles.categoryContent}>
                                            <Ionicons
                                                name={cat.icon as any}
                                                size={20}
                                                color={category === cat.id ? "white" : cat.color}
                                            />
                                            <Text style={[
                                                styles.categoryLabel,
                                                category === cat.id && styles.selectedCategoryLabel
                                            ]}>
                                                {cat.label}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Priority Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Priority</Text>
                            <View style={styles.priorityContainer}>
                                {PRIORITIES.map((prio) => (
                                    <TouchableOpacity
                                        key={prio.id}
                                        style={[
                                            styles.priorityButton,
                                            priority === prio.id && styles.selectedPriorityButton,
                                            { backgroundColor: priority === prio.id ? prio.color : `${prio.color}20` }
                                        ]}
                                        onPress={() => setPriority(prio.id)}
                                    >
                                        <Text style={[
                                            styles.priorityLabel,
                                            priority === prio.id && styles.selectedPriorityLabel
                                        ]}>
                                            {prio.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={styles.section}>
                            <View style={styles.card}>
                                <View style={styles.switchRow}>
                                    <View style={styles.switchLabelContainer}>
                                        <View style={styles.iconContainer}>
                                            <Ionicons name="notifications" size={20} color="#1a2d8e" />
                                        </View>
                                        <View>
                                            <Text style={styles.switchLabel}>Reminders</Text>
                                            <Text style={styles.switchSubLabel}>
                                                Get notified when it's time to start your task
                                            </Text>
                                        </View>
                                    </View>
                                    <Switch
                                        value={form.reminderEnabled}
                                        onValueChange={(value) => setForm(prev => ({ ...prev, reminderEnabled: value }))}
                                        trackColor={{ false: "#ddd", true: "#1a2d8e" }}
                                        thumbColor="white"
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
                        onPress={handleSaveTask}
                        disabled={isSubmitting}
                    >
                        <LinearGradient
                            colors={["#1a2d8e", "#142269"]}
                            style={styles.saveButtonGradient}
                        >
                            <Text style={styles.saveButtonText}>
                                {isSubmitting ? "Adding..." : "Add Task"}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
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
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#ffffffff",
        marginLeft: 15,
    },
    formContainer: {
        flex: 1,
    },
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginBottom: 15,
    },
    inputContainer: {
        marginBottom: 20,
    },
    mainInput: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        backgroundColor: "#fff",
    },
    textArea: {
        height: 100,
        textAlignVertical: "top",
    },
    optionsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: -5,
    },
    optionCard: {
        width: (width - 100) / 2,
        backgroundColor: "white",
        borderRadius: 16,
        padding: 15,
        margin: 5,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#e0e0e0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    selectedOptionCard: {
        backgroundColor: "#1a2d8e",
        borderColor: "#1a2d8e",
    },
    optionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#e9ecef",
    },
    selectedOptionIcon: {
        backgroundColor: "#142269",
        borderColor: "#fff",
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        textAlign: "center",
        marginBottom: 4,
    },
    selectedOptionLabel: {
        color: "#fff",
    },
    optionDescription: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
    },
    frequencyDisplay: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
        marginBottom: 15,
    },
    frequencyDisplayText: {
        fontSize: 16,
        color: "#333",
    },
    durationDisplay: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#f8f9fa",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
        marginBottom: 15,
    },
    durationDisplayText: {
        fontSize: 16,
        color: "#333",
    },
    // Duration Cards
    durationCard: {
        width: (width - 100) / 3,
        padding: 16,
        borderRadius: 12,
        margin: 5,
        backgroundColor: "#f8f9fa",
        borderWidth: 1,
        borderColor: "#e9ecef",
        alignItems: "center",
        justifyContent: "center",
    },
    selectedDurationCard: {
        backgroundColor: "#1a2d8e",
        borderColor: "#1a2d8e",
    },
    customDurationCard: {
        flexDirection: "row",
        gap: 8,
    },
    durationNumber: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    selectedDurationNumber: {
        color: "#fff",
    },
    durationUnit: {
        fontSize: 12,
        color: "#666",
        marginBottom: 4,
    },
    durationLabel: {
        fontSize: 14,
        color: "#959292ff",
        textAlign: "center",
    },
    selectedDurationLabel: {
        color: "#fefeffff",
        fontWeight: "600",
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: "white",
        borderRadius: 20,
        padding: 20,
        width: width - 40,
        maxHeight: "80%",
    },
    // Day Picker Styles
    dayPickerContainer: {
        padding: 10,
    },
    dayPickerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        textAlign: "center",
        marginBottom: 20,
    },
    daysGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 20,
    },
    dayButton: {
        width: (width - 100) / 4,
        height: 50,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 12,
        backgroundColor: "#f8f9fa",
        borderWidth: 1,
        borderColor: "#e9ecef",
    },
    selectedDayButton: {
        backgroundColor: "#1a2d8e",
        borderColor: "#1a2d8e",
    },
    dayButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    selectedDayButtonText: {
        color: "#fff",
    },
    selectedDaysContainer: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: "#f0f4ff",
        borderRadius: 12,
    },
    selectedDaysLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1a2d8e",
        marginBottom: 5,
    },
    selectedDaysText: {
        fontSize: 14,
        color: "#333",
    },
    dayPickerActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
    },
    // Custom Duration Styles
    customDurationContainer: {
        padding: 10,
    },
    customDurationTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        textAlign: "center",
        marginBottom: 20,
    },
    timeInputsContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        marginBottom: 20,
    },
    timeInputGroup: {
        alignItems: "center",
    },
    timeInputLabel: {
        fontSize: 14,
        color: "#666",
        marginBottom: 8,
    },
    timeInput: {
        width: 80,
        height: 50,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 12,
        textAlign: "center",
        fontSize: 18,
        fontWeight: "600",
        backgroundColor: "#fff",
    },
    timeSeparator: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
        marginTop: 20,
    },
    durationPreview: {
        padding: 15,
        backgroundColor: "#f0f4ff",
        borderRadius: 12,
        marginBottom: 20,
    },
    durationPreviewText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1a2d8e",
        textAlign: "center",
    },
    customDurationActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
    },
    cancelButton: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        backgroundColor: "#f8f9fa",
        alignItems: "center",
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
    },
    confirmButton: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        backgroundColor: "#1a2d8e",
        alignItems: "center",
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#fff",
    },

    timeDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    timeIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#e8f0fe',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    timeDisplayText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    inputError: {
        borderColor: "#FF5252",
    },
    errorText: {
        color: "#FF5252",
        fontSize: 12,
        marginTop: 4,
        marginLeft: 12,
    },
    footer: {
        padding: 20,
        backgroundColor: "white",
        borderTopWidth: 1,
        borderTopColor: "#e0e0e0",
    },
    saveButton: {
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 12,
    },
    saveButtonGradient: {
        paddingVertical: 15,
        justifyContent: "center",
        alignItems: "center",
    },
    saveButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    switchRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    switchLabelContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#f5f5f5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 15,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
    },
    switchSubLabel: {
        fontSize: 13,
        color: "#666",
        marginTop: 2,
    },
    categoryCard: {
        width: (width - 76) / 2,
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#f8f9fa",
        borderLeftWidth: 4,
        marginBottom: 12,
    },
    selectedCategoryCard: {
        backgroundColor: "#1a2d8e",
    },
    categoryContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    categoryLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
    },
    selectedCategoryLabel: {
        color: "white",
    },

    // Priority Styles
    priorityContainer: {
        flexDirection: "row",
        gap: 12,
        marginTop: 8,
    },
    priorityButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: "center",
        borderWidth: 2,
        borderColor: "transparent",
    },
    selectedPriorityButton: {
        borderColor: "rgba(255,255,255,0.3)",
    },
    priorityLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
    },
    selectedPriorityLabel: {
        color: "white",
        fontWeight: "700",
    },
});