import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataContext } from '../../context/AuthContext';
import ApiService from '../../services/ApiService';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Building, Check, AlertCircle, Save, Loader, Menu, Smartphone, Monitor, Globe } from 'lucide-react';
import AccessDenied from '../AccessDenied';
import ToggleSwitch from './ToggleSwitch'; // Import the new component

export default function CompanySettings() {
  const navigate = useNavigate();
  const { userData, setHamburgerMenu, hamburgerMenu } = useDataContext();
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [companySettings, setCompanySettings] = useState({
    name: '',
    disappearingMessages: false,
    deleteOnSeen: false,
    messageTimer: null,
    timeUnit: 'hours',
    hideChat: false,
    mobileApp: false,
    desktopWeb: true,
    mobileWeb: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const hasPermission = userData?.role?.permissions?.some(
    (permission) => permission.name === 'View Company Settings'
  );

  if (!hasPermission) {
    return <AccessDenied />;
  }

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await ApiService.getCompanySettings();

        const timerInSeconds = response.data.messageTimer;
        let displayUnit = 'seconds';
        let displayValue = timerInSeconds;

        if (timerInSeconds) {
          if (timerInSeconds % 3600 === 0 && timerInSeconds >= 3600) {
            displayUnit = 'hours';
            displayValue = timerInSeconds / 3600;
          } else if (timerInSeconds % 60 === 0 && timerInSeconds >= 60) {
            displayUnit = 'minutes';
            displayValue = timerInSeconds / 60;
          }
        }

        setCompanySettings({
          name: response.data.name || '',
          disappearingMessages:
            response.data.deleteOnSeen === false && response.data.messageTimer != null ? true : false,
          deleteOnSeen: response.data.deleteOnSeen || false,
          messageTimer: displayValue || null,
          timeUnit: displayUnit,
          hideChat: response.data.hideChat || false,
          mobileApp: response.data.mobileApp || false,
          desktopWeb: response.data.desktopWeb || true,
          mobileWeb: response.data.mobileWeb || false,
        });

        setIsLoading(false);
      } catch (err) {
        setError(err.message || 'Failed to load company settings');
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleInputChange = (field, value) => {
    setCompanySettings((prev) => {
      if (field === 'disappearingMessages' && value === true) {
        return {
          ...prev,
          [field]: value,
          deleteOnSeen: false,
          messageTimer: prev.messageTimer || 1,
          timeUnit: prev.timeUnit || 'seconds',
        };
      }
      if (field === 'deleteOnSeen' && value === true) {
        return {
          ...prev,
          deleteOnSeen: true,
          disappearingMessages: false,
          messageTimer: prev.messageTimer || 1,
          timeUnit: prev.timeUnit || 'seconds',
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
    setIsDirty(true);
    setError('');
    setSuccess('');
  };

  const getTimeUnitLabel = (unit, value) => {
    if (value === 1) {
      return unit.slice(0, -1);
    }
    return unit;
  };

  const convertToSeconds = (value, unit) => {
    if (!value) return null;
    switch (unit) {
      case 'minutes':
        return value * 60;
      case 'hours':
        return value * 60 * 60;
      case 'seconds':
      default:
        return value;
    }
  };

  const handleUpdateSettings = async () => {
    try {
      setIsLoading(true);
      setShowFeedback(true);

      if (!companySettings.name.trim()) {
        setError('Company name cannot be empty');
        setIsLoading(false);
        return;
      }

      if (
        companySettings.disappearingMessages &&
        (!companySettings.messageTimer || companySettings.messageTimer < 1)
      ) {
        setError('Message timer must be a positive number when disappearing messages is enabled');
        setIsLoading(false);
        return;
      }

      const dataToSend = {
        name: companySettings.name,
        disappearingMessages: companySettings.disappearingMessages,
        deleteOnSeen: companySettings.deleteOnSeen,
        messageTimer: companySettings.disappearingMessages || companySettings.deleteOnSeen
          ? convertToSeconds(companySettings.messageTimer, companySettings.timeUnit)
          : null,
        hideChat: companySettings.hideChat,
        mobileApp: companySettings.mobileApp,
        desktopWeb: companySettings.desktopWeb,
        mobileWeb: companySettings.mobileWeb,
      };

      await ApiService.updateCompanySettings(dataToSend);
      setSuccess('Settings updated successfully');
      setError('');
      setIsDirty(false);

      setTimeout(() => {
        setSuccess('');
        setShowFeedback(false);
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to update company settings');
      setSuccess('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center relative">
      {isMobileView ? (
        <Menu
          className="text-black-600 mr-2 absolute top-4 left-4"
          size={24}
          onClick={() => setHamburgerMenu(!hamburgerMenu)}
        />
      ) : null}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-6 sm:p-8 rounded-xl shadow-xl max-w-lg w-full border border-gray-100"
      >
        <div className="flex mb-6">
          <Building className="text-indigo-500 mr-2" size={24} />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-blue-600">
            Company Settings
          </h2>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center text-red-600 bg-red-50 p-3 rounded-md mb-4 border border-red-100"
            >
              <AlertCircle size={18} className="mr-2 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center text-green-600 bg-green-50 p-3 rounded-md mb-4 border border-green-100"
            >
              <Check size={18} className="mr-2 flex-shrink-0" />
              <p>{success}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-6">
          <label className="flex items-center text-gray-700 font-medium mb-2">
            <Building size={16} className="mr-2 text-gray-500" />
            Company Name
          </label>
          <motion.input
            type="text"
            value={companySettings.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter company name"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            whileFocus={{ scale: 1.01 }}
          />
        </div>

       <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
  <label className="flex items-center text-gray-700 font-medium mb-2">
    <Monitor className="w-4 h-4 text-gray-600 mr-2" />  Device Access
  </label>

  {/* First row → Mobile App + Desktop Web */}
  <div className="flex gap-6 mb-2">
    <ToggleSwitch
      label={
        <span className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-gray-600" />
          App Access
        </span>
      }
      checked={companySettings.mobileApp}
      onChange={(e) => handleInputChange("mobileApp", e.target.checked)}
    />

    <ToggleSwitch
      label={
        <span className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-gray-600" />
          Web Access
        </span>
      }
      checked={companySettings.desktopWeb}
      onChange={(e) => handleInputChange("desktopWeb", e.target.checked)}
    />
  </div>

  {/* Second row → Mobile Web */}
  <ToggleSwitch
    label={
      <span className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-gray-600" />
        Mobile Web Access
      </span>
    }
    checked={companySettings.mobileWeb}
    onChange={(e) => handleInputChange("mobileWeb", e.target.checked)}
  />
</div>

        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <ToggleSwitch
            label="Enable Disappearing Messages"
            checked={companySettings.disappearingMessages}
            onChange={(e) => handleInputChange('disappearingMessages', e.target.checked)}
          />
          <ToggleSwitch
            label="Enable Delete on Seen"
            checked={companySettings.deleteOnSeen}
            onChange={(e) => handleInputChange('deleteOnSeen', e.target.checked)}
          />

          <AnimatePresence>
            {(companySettings.disappearingMessages || companySettings.deleteOnSeen) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="border-t border-gray-200 pt-4">
                  <label className="flex items-center text-gray-700 font-medium mb-2">
                    <Clock size={16} className="mr-2 text-gray-500" />
                    {companySettings.disappearingMessages ? 'Message Timer' : 'Delete After'}
                  </label>
                  <div className="flex flex-col sm:flex-row sm:space-x-3">
                    <motion.input
                      type="number"
                      placeholder="Enter time"
                      value={companySettings.messageTimer || ''}
                      onChange={(e) => handleInputChange('messageTimer', parseInt(e.target.value) || null)}
                      className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all mb-2 sm:mb-0 w-full"
                      min="1"
                      whileFocus={{ scale: 1.01 }}
                    />
                    <select
                      value={companySettings.timeUnit}
                      onChange={(e) => handleInputChange('timeUnit', e.target.value)}
                      className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-full"
                    >
                      <option value="seconds">Seconds</option>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                    </select>
                  </div>
                  {companySettings.messageTimer > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mt-2 italic">
                        {companySettings.disappearingMessages
                          ? `Messages will disappear after ${companySettings.messageTimer} ${getTimeUnitLabel(
                              companySettings.timeUnit,
                              companySettings.messageTimer
                            )}.`
                          : `Messages will be deleted ${companySettings.messageTimer} ${getTimeUnitLabel(
                              companySettings.timeUnit,
                              companySettings.messageTimer
                            )} after being seen.`}
                      </p>
                      <p className="text-xs text-indigo-500 mt-1">
                        (
                        {convertToSeconds(companySettings.messageTimer, companySettings.timeUnit).toLocaleString()}{' '}
                        seconds total)
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <ToggleSwitch
            label="Hide Chat"
            checked={companySettings.hideChat}
            onChange={(e) => handleInputChange('hideChat', e.target.checked)}
            description="Chat functionality will be hidden from users."
          />
        </div>

        <motion.button
          onClick={handleUpdateSettings}
          disabled={isLoading || !isDirty}
          className={`w-full p-3 rounded-lg text-white font-semibold transition-all flex items-center justify-center ${
            isLoading
              ? 'bg-indigo-300 cursor-not-allowed'
              : !isDirty
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700'
          }`}
          whileHover={!isLoading && isDirty ? { scale: 1.03 } : {}}
          whileTap={!isLoading && isDirty ? { scale: 0.98 } : {}}
        >
          {isLoading ? (
            <>
              <Loader size={18} className="animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} className="mr-2" />
              Save Settings
            </>
          )}
        </motion.button>

        {isDirty && !showFeedback && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center mt-3 text-sm text-gray-500"
          >
            You have unsaved changes
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}