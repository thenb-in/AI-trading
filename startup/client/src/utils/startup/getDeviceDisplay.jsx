import { MonitorSpeaker, Smartphone, MonitorSmartphone } from 'lucide-react';

const getDeviceDisplay = (deviceAccess) => {
    if (!deviceAccess) {
      return {
        icon: null,
        label: "Not set",
        color: "text-gray-400"
      };
    }

    const device = deviceAccess.toLowerCase();
    
    if (device.includes('both') || (device.includes('mobile') && device.includes('web'))) {
      return {
        icon: <MonitorSmartphone className="h-4 w-4" />,
        label: "Mobile & Web",
        color: "text-blue-600"
      };
    } else if (device.includes('mobile')) {
      return {
        icon: <Smartphone className="h-4 w-4" />,
        label: "Mobile",
        color: "text-green-600"
      };
    } else if (device.includes('web')) {
      return {
        icon: <MonitorSpeaker className="h-4 w-4" />,
        label: "Web",
        color: "text-purple-600"
      };
    } else {
      return {
        icon: null,
        label: deviceAccess,
        color: "text-gray-600"
      };
    }
  };

export { getDeviceDisplay };


