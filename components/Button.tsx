import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: any;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
}) => {
  const { colors } = useTheme();

  const getButtonStyle = () => {
    const baseStyle = {
      backgroundColor: variant === 'primary' ? colors.primary : 
                     variant === 'secondary' ? colors.secondary : 'transparent',
      borderWidth: variant === 'outline' ? 1 : 0,
      borderColor: variant === 'outline' ? colors.primary : 'transparent',
      paddingVertical: size === 'small' ? 8 : size === 'medium' ? 12 : 16,
      paddingHorizontal: size === 'small' ? 16 : size === 'medium' ? 24 : 32,
      borderRadius: 8,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      opacity: disabled ? 0.6 : 1,
    };

    return [baseStyle, style];
  };

  const getTextStyle = () => {
    return {
      color: variant === 'outline' ? colors.primary : '#FFFFFF',
      fontSize: size === 'small' ? 14 : size === 'medium' ? 16 : 18,
      fontWeight: '600' as const,
    };
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : '#FFFFFF'} />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

