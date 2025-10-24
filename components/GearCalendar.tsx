import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  //interpolate,
} from 'react-native-reanimated';

interface GearCalendarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  tasksCount: number;
}

const { width } = Dimensions.get('window');
const GEAR_SIZE = width * 0.6;
const CENTER_SIZE = 80;

export const GearCalendar: React.FC<GearCalendarProps> = ({
  selectedDate,
  onDateChange,
  tasksCount,
}) => {
  const { colors } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const rotation = useSharedValue(0);

  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Generates days for the current month
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Calculates rotation based on selected date
  const getRotationValue = () => {
    try {
      const selectedDay = parseInt(selectedDate.split('-')[2]);
      if (isNaN(selectedDay)) return 0;
      return ((selectedDay - 1) / daysInMonth) * 360;
    } catch (error) {
      return 0;
    }
  };  
  const rotationValue = getRotationValue();

  useEffect(() => {
    rotation.value = withSpring(rotationValue, {
      damping: 15,
      stiffness: 150,
    });
  }, [selectedDate, rotationValue, rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    const dateString = newDate.toISOString().split('T')[0];
    onDateChange(dateString);
  };

  const isToday = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    const dateString = date.toISOString().split('T')[0];
    return dateString === selectedDate;
  };

  const getDayPosition = (day: number) => {
    const angle = ((day - 1) / daysInMonth) * 360;
    const radius = (GEAR_SIZE - CENTER_SIZE) / 2;
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius;
    return { x, y };
  };
  const getDisplayDay = () => {
    try {
      return parseInt(selectedDate.split('-')[2]) || 1;
    } catch (error) {
      return 1;
    }
  };

  // Safe function to check if selected date is today
  const isSelectedDateToday = () => {
    try {
      const selected = new Date(selectedDate);
      return selected.toDateString() === today.toDateString();
    } catch (error) {
      return false;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.gearContainer}>
        {/* Gear background */}
        <View
          style={[
            styles.gearBackground,
            {
              width: GEAR_SIZE,
              height: GEAR_SIZE,
              borderRadius: GEAR_SIZE / 2,
              borderColor: colors.border,
            },
          ]}
        />
        
        {/* Rotating gear with days */}
        <Animated.View
          style={[
            styles.rotatingGear,
            {
              width: GEAR_SIZE,
              height: GEAR_SIZE,
            },
            animatedStyle,
          ]}
        >
          {days.map((day) => {
            const position = getDayPosition(day);
            const isTodayDate = isToday(day);
            const isSelectedDate = isSelected(day);
            
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  {
                    left: GEAR_SIZE / 2 + position.x - 15,
                    top: GEAR_SIZE / 2 + position.y - 15,
                    backgroundColor: isSelectedDate
                      ? colors.primary
                      : isTodayDate
                      ? colors.success
                      : colors.surface,
                    borderColor: isSelectedDate
                      ? colors.primary
                      : isTodayDate
                      ? colors.success
                      : colors.border,
                  },
                ]}
                onPress={() => handleDateSelect(day)}
              >
                <Text
                  style={[
                    styles.dayText,
                    {
                      color: isSelectedDate || isTodayDate ? '#FFFFFF' : colors.text,
                      fontWeight: isTodayDate ? 'bold' : 'normal',
                    },
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
        
        {/* Center circle */}
        <View
          style={[
            styles.centerCircle,
            {
              width: CENTER_SIZE,
              height: CENTER_SIZE,
              borderRadius: CENTER_SIZE / 2,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.centerText, { color: colors.text }]}>
            {parseInt(selectedDate.split('-')[2])}
          </Text>
          <Text style={[styles.centerLabel, { color: colors.textSecondary }]}>
            {isToday(new Date(selectedDate).getDate()) ? 'Today' : 'Selected'}
          </Text>
        </View>
      </View>
      
      {/* Tasks count indicator */}
      <View style={styles.tasksIndicator}>
        <Ionicons name="list" size={20} color={colors.primary} />
        <Text style={[styles.tasksText, { color: colors.text }]}>
          {tasksCount} task{tasksCount !== 1 ? 's' : ''} today
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  gearContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearBackground: {
    position: 'absolute',
    borderWidth: 2,
  },
  rotatingGear: {
    position: 'relative',
  },
  dayButton: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  centerCircle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  centerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  centerLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  tasksIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tasksText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
});


