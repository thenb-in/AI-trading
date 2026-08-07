// Theme mode constants
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';
const THEME_SYSTEM = 'system';

// Theme configuration - centralized location for all colors, spacing, and font sizes
// All styling values must be imported from this file

const colors = {
  // Primary colors
  primary: {
    main: '#1976d2',
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#9c27b0',
    light: '#ba68c8',
    dark: '#7b1fa2',
    contrastText: '#ffffff',
  },
  // Semantic colors
  error: {
    main: '#d32f2f',
    light: '#ef5350',
    dark: '#c62828',
  },
  warning: {
    main: '#ed6c02',
    light: '#ff9800',
    dark: '#e65100',
    background: '#fffde7',
    border: '#f9a825',
    highlight: '#fff176',
  },
  info: {
    main: '#0288d1',
    light: '#03a9f4',
    dark: '#01579b',
  },
  success: {
    main: '#2e7d32',
    light: '#4caf50',
    dark: '#1b5e20',
  },
  // Gray scale
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  // Text colors
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    disabled: '#9ca3af',
  },
  // Background colors
  background: {
    default: '#ffffff',
    paper: '#f9fafb',
    gray: '#f3f4f6',
  },
};

const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
  '3xl': '4rem',    // 64px
  '4xl': '6rem',    // 96px
};

const fontSize = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
  '5xl': '3rem',     // 48px
};



const getColorClasses = (color) => {
  const colors = {
    blue: {
      border: 'border-blue-100',
      bg: 'bg-blue-50 hover:bg-blue-100',
      text: 'text-blue-700',
      iconBg: 'bg-blue-100',
      accent: 'bg-blue-600'
    },
    yellow: {
      border: 'border-yellow-100',
      bg: 'bg-yellow-50 hover:bg-yellow-100',
      text: 'text-yellow-700',
      iconBg: 'bg-yellow-100',
      accent: 'bg-yellow-500'
    },
    red: {
      border: 'border-red-100',
      bg: 'bg-red-50 hover:bg-red-100',
      text: 'text-red-700',
      iconBg: 'bg-red-100',
      accent: 'bg-red-600'
    },
    green: {
      border: 'border-green-100',
      bg: 'bg-green-50 hover:bg-green-100',
      text: 'text-green-700',
      iconBg: 'bg-green-100',
      accent: 'bg-green-600'
    },
    indigo: {
      border: 'border-indigo-100',
      bg: 'bg-indigo-50 hover:bg-indigo-100',
      text: 'text-indigo-700',
      iconBg: 'bg-indigo-100',
      accent: 'bg-indigo-600'
    },
    purple: {
      border: 'border-purple-100',
      bg: 'bg-purple-50 hover:bg-purple-100',
      text: 'text-purple-700',
      iconBg: 'bg-purple-100',
      accent: 'bg-purple-600'
    },
    pink: {
      border: 'border-pink-100',
      bg: 'bg-pink-50 hover:bg-pink-100',
      text: 'text-pink-700',
      iconBg: 'bg-pink-100',
      accent: 'bg-pink-600'
    },
  };
  return colors[color] || colors.blue;
};

export {
  THEME_LIGHT,
  THEME_DARK,
  THEME_SYSTEM,
  colors,
  spacing,
  fontSize,
  getColorClasses,
};
