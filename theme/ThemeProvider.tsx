import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    card: string;
  };
}

const lightColors = {
  primary: '#4C8BF5',
  secondary: '#6C757D',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: '#212529',
  textSecondary: '#6C757D',
  border: '#E9ECEF',
  success: '#28A745',
  warning: '#FFC107',
  error: '#DC3545',
  card: '#FFFFFF',
};

const darkColors = {
  primary: '#4C8BF5',
  secondary: '#ADB5BD',
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#ADB5BD',
  border: '#333333',
  success: '#28A745',
  warning: '#FFC107',
  error: '#DC3545',
  card: '#1E1E1E',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('auto');
  
  const isDark = theme === 'dark' || (theme === 'auto' && systemColorScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    isDark,
    setTheme,
    colors,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

