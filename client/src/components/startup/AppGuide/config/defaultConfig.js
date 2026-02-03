import {
  FaRocket,
  FaUsers,
  FaCog,
  FaShieldAlt,
  FaBell,
  FaSearch,
  FaBuilding,
  FaUserShield,
  FaClipboardList,
  FaChartBar
} from 'react-icons/fa';

/**
 * Default configuration for AppGuide component
 * This can be overridden by passing custom config as props
 */
const defaultAppGuideConfig = {
  // Header configuration
  header: {
    title: 'Welcome to Your App!',
    subtitle: (userName) => userName ? `Hello, ${userName}!` : 'Hello!',
    subtitleSuffix: "Let's get you started with a quick tour.",
    icon: FaRocket,
    showCloseButton: true,
    gradientColors: {
      from: 'from-blue-600',
      to: 'to-purple-600'
    }
  },

  // Guide steps configuration
  steps: [
   
    {
      id: 'company',
      icon: FaBuilding,
      title: 'Company Management',
      description: 'Manage your company profile, settings, and organizational structure. Configure access controls and preferences.',
      features: [
        'Company profile and settings',
        'Device access management',
        'Company-wide configurations',
        'Team structure management'
      ]
    },
    {
      id: 'users',
      icon: FaUsers,
      title: 'User Management',
      description: 'Add, manage, and organize team members. Assign roles, permissions, and track user activities.',
      features: [
        'Add and manage team members',
        'Role-based access control',
        'User activity tracking',
        'Bulk user operations'
      ]
    },
    {
      id: 'roles',
      icon: FaUserShield,
      title: 'Roles & Permissions',
      description: 'Define custom roles with granular permissions. Control what each user can access and modify.',
      features: [
        'Create custom roles',
        'Granular permission settings',
        'Role assignment and management',
        'Permission inheritance'
      ]
    },
    {
      id: 'master-data',
      icon: FaClipboardList,
      title: 'Master Data',
      description: 'Manage your core business data. Create, update, and organize master records for your operations.',
      features: [
        'CRUD operations on master data',
        'Advanced filtering and search',
        'Bulk import and export',
        'Data validation and integrity'
      ]
    },
    {
      id: 'reports',
      icon: FaChartBar,
      title: 'Reports & Analytics',
      description: 'Generate comprehensive reports and analyze your data. Export reports in multiple formats.',
      features: [
        'Custom report generation',
        'Multiple export formats',
        'Advanced filtering options',
        'Scheduled report delivery'
      ]
    }
  ],

  // Quick tips configuration
  quickTips: [
    {
      icon: FaSearch,
      text: 'Use the search bar to quickly find any feature or data'
    },
    {
      icon: FaBell,
      text: 'Refresh regularly for important updates'
    },
    {
      icon: FaCog,
      text: 'Customize settings to match your workflow preferences'
    },
    {
      icon: FaShieldAlt,
      text: 'Review permissions regularly to maintain security'
    }
  ],

  // Theme configuration
  theme: {
    primaryColor: 'blue',
    secondaryColor: 'purple',
    backgroundGradient: 'from-blue-50 via-white to-purple-50',
    cardShadow: 'shadow-xl',
    borderRadius: 'rounded-2xl'
  },

  // Behavior configuration
  behavior: {
    showQuickTips: true,
    showStepNavigation: true,
    showProgressDots: true,
    allowSkip: true,
    skipText: 'Skip guide and go to dashboard →'
  }
};

export { defaultAppGuideConfig };

