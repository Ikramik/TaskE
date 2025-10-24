import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface CardProps {
  children: React.ReactNode;
  style?: any;
  padding?: number;
  margin?: number;
  elevation?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 16,
  margin = 8,
  elevation = 2,
}) => {
  const { colors } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      padding,
      margin,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: elevation },
      shadowOpacity: 0.1,
      shadowRadius: elevation * 2,
      elevation,
    },
    style,
  ];

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
  },
});

