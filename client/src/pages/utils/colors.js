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
    };
    return colors[color] || colors.blue;
};

export { getColorClasses };