const colorClassMap = {
  blue: {
    primary: {
      50: 'bg-blue-50',
      100: 'bg-blue-100',
      200: 'bg-blue-200',
      300: 'bg-blue-300',
      400: 'bg-blue-400',
      500: 'bg-blue-500',
      600: 'bg-blue-600',
      700: 'bg-blue-700',
      800: 'bg-blue-800',
      900: 'bg-blue-900',
      text: 'text-blue-600',
      textLight: 'text-blue-500',
      textDark: 'text-blue-700',
      hover: 'hover:bg-blue-700',
      from: 'from-blue-600',
      to: 'to-blue-700',
      gradientFrom: 'from-blue-100',
      gradientTo: 'to-blue-200'
    }
  },
  purple: {
    primary: {
      50: 'bg-purple-50',
      100: 'bg-purple-100',
      200: 'bg-purple-200',
      300: 'bg-purple-300',
      400: 'bg-purple-400',
      500: 'bg-purple-500',
      600: 'bg-purple-600',
      700: 'bg-purple-700',
      800: 'bg-purple-800',
      900: 'bg-purple-900',
      text: 'text-purple-600',
      textLight: 'text-purple-500',
      textDark: 'text-purple-700',
      hover: 'hover:bg-purple-700',
      from: 'from-purple-600',
      to: 'to-purple-700',
      gradientFrom: 'from-purple-100',
      gradientTo: 'to-purple-200'
    }
  },
  green: {
    primary: {
      50: 'bg-green-50',
      100: 'bg-green-100',
      200: 'bg-green-200',
      300: 'bg-green-300',
      400: 'bg-green-400',
      500: 'bg-green-500',
      600: 'bg-green-600',
      700: 'bg-green-700',
      800: 'bg-green-800',
      900: 'bg-green-900',
      text: 'text-green-600',
      textLight: 'text-green-500',
      textDark: 'text-green-700',
      hover: 'hover:bg-green-700',
      from: 'from-green-600',
      to: 'to-green-700',
      gradientFrom: 'from-green-100',
      gradientTo: 'to-green-200'
    }
  },
  indigo: {
    primary: {
      50: 'bg-indigo-50',
      100: 'bg-indigo-100',
      200: 'bg-indigo-200',
      300: 'bg-indigo-300',
      400: 'bg-indigo-400',
      500: 'bg-indigo-500',
      600: 'bg-indigo-600',
      700: 'bg-indigo-700',
      800: 'bg-indigo-800',
      900: 'bg-indigo-900',
      text: 'text-indigo-600',
      textLight: 'text-indigo-500',
      textDark: 'text-indigo-700',
      hover: 'hover:bg-indigo-700',
      from: 'from-indigo-600',
      to: 'to-indigo-700',
      gradientFrom: 'from-indigo-100',
      gradientTo: 'to-indigo-200'
    }
  }
};

/**
 * Get theme classes for a given color
 * @param {string} color - Color name (blue, purple, green, indigo)
 * @returns {Object} Object with theme classes
 */
const getThemeClasses = (color = 'blue') => {
  const theme = colorClassMap[color] || colorClassMap.blue;
  const secondaryTheme = color === 'blue' ? colorClassMap.purple : colorClassMap.blue;
  
  // Create gradient classes based on color
  let buttonGradient = 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700';
  let iconBg = 'bg-gradient-to-br from-blue-100 to-purple-100';
  
  if (color === 'purple') {
    buttonGradient = 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700';
    iconBg = 'bg-gradient-to-br from-purple-100 to-indigo-100';
  } else if (color === 'green') {
    buttonGradient = 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700';
    iconBg = 'bg-gradient-to-br from-green-100 to-emerald-100';
  } else if (color === 'indigo') {
    buttonGradient = 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700';
    iconBg = 'bg-gradient-to-br from-indigo-100 to-purple-100';
  }

  return {
    primary: theme.primary,
    secondary: secondaryTheme.primary,
    buttonPrimary: `${theme.primary[600]} ${theme.primary.hover} text-white`,
    buttonGradient,
    iconBg,
    iconText: theme.primary.text,
    activeStep: `${theme.primary[600]} text-white`,
    progressDot: theme.primary[600]
  };
};

export { getThemeClasses };

