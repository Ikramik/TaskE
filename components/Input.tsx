import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, KeyboardTypeOptions } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  error?: string;
  style?: any;
  keyboardType?: KeyboardTypeOptions; 
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  error,
  style,
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: error ? colors.error : isFocused ? colors.primary : colors.border,
      color: colors.text,
    },
    style,
  ];

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      <TextInput
        style={inputStyle}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={numberOfLines}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
  error: {
    fontSize: 14,
    marginTop: 4,
  },
});

