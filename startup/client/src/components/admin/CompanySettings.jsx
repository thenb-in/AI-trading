import { useState, useEffect } from "react";
import PropTypes from 'prop-types';

const StatusBanner = ({ type, message }) => {
  const styles = type === 'error'
    ? { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', Icon: AlertCircle }
    : { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', Icon: Check };
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-center ${styles.text} ${styles.bg} p-3 rounded-md mb-4 border ${styles.border}`}
    >
      <styles.Icon size={18} className="mr-2 flex-shrink-0" />
      <p>{message}</p>
    </motion.div>
  );
};

StatusBanner.propTypes = {
  type: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
};

import { useDataContext, hasPermission } from "@context/useDataContext";
import { ApiService } from "@services/ApiService";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building,
  Check,
  AlertCircle,
  Save,
  Loader,
  Menu,
  Smartphone,
  Monitor,
  Globe,
} from "lucide-react";
import { AccessDenied } from "../AccessDenied";
import { ToggleSwitch } from "./ToggleSwitch";
import { toast } from "react-toastify";

function CompanySettings() {

  const { userData, setHamburgerMenu, hamburgerMenu } = useDataContext();
  const [isMobileView] = useState(window.innerWidth < 768);
  const [companySettings, setCompanySettings] = useState({
    name: "",
    mobileApp: false,
    desktopWeb: true,
    mobileWeb: false,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await ApiService.getCompanySettings();

        setCompanySettings({
          name: response.data.name || "",
          mobileApp: response.data.mobileApp || false,
          desktopWeb: response.data.desktopWeb || true,
          mobileWeb: response.data.mobileWeb || false,
        });

        setIsLoading(false);
      } catch (err) {
        setError(err.error || "Failed to load company settings");
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const requiredPermission = "view_company_settings";
  const canViewCompanySettings = hasPermission(requiredPermission, useDataContext());

  if (!canViewCompanySettings) {
      return <AccessDenied requiredPermission={requiredPermission} />;
  }

  const handleInputChange = (field, value) => {
    setCompanySettings((prev) => {
      return {
        ...prev,
        [field]: value,
      };
    });
    setIsDirty(true);
    setError("");
    setSuccess("");
  };

  const handleSaveAll = async () => {
    try {
      setIsLoading(true);
      setShowFeedback(true);
      setError("");
      setSuccess("");

      if (!companySettings.name.trim()) {
        setError("Company name cannot be empty");
        setIsLoading(false);
        return;
      }

      const companyData = {
        name: companySettings.name,
        mobileApp: companySettings.mobileApp,
        desktopWeb: companySettings.desktopWeb,
        mobileWeb: companySettings.mobileWeb,
      };

      await ApiService.updateCompanySettings(companyData);

      setSuccess("Settings updated successfully");
      setIsDirty(false);
      toast.success("Settings updated successfully");

      setTimeout(() => {
        setSuccess("");
        setShowFeedback(false);
      }, 3000);
    } catch (err) {
      const errorMessage = err.error || err.message || "Failed to update settings";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuClick = () => {
    setHamburgerMenu(!hamburgerMenu);
  };

  const handleNameChange = (e) => {
    handleInputChange("name", e.target.value);
  };

  const handleMobileAppChange = (e) => {
    handleInputChange("mobileApp", e.target.checked);
  };

  const handleDesktopWebChange = (e) => {
    handleInputChange("desktopWeb", e.target.checked);
  };

  const handleMobileWebChange = (e) => {
    handleInputChange("mobileWeb", e.target.checked);
  };

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center relative">
      {isMobileView ? (
        <Menu
          className="text-black-600 mr-2 absolute top-4 left-4"
          size={24}
          onClick={handleMenuClick}
        />
      ) : null}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white p-6 sm:p-8 rounded-xl shadow-xl max-w-2xl w-full border border-gray-100"
      >
        <div className="flex mb-6">
          <Building className="text-indigo-500 mr-2" size={24} />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-blue-600">
            Company Settings
          </h2>
        </div>

        <AnimatePresence>
          {error && <StatusBanner type="error" message={error} />}
          {success && <StatusBanner type="success" message={success} />}
        </AnimatePresence>

        <div className="mb-6">
          <label className="flex items-center text-gray-700 font-medium mb-2">
            <Building size={16} className="mr-2 text-gray-500" />
            Company Name
            {!userData?.isSupportUser && (
              <span className="ml-2 text-xs text-gray-500">(Read-only)</span>
            )}
          </label>
          <motion.input
            type="text"
            value={companySettings.name}
            onChange={handleNameChange}
            placeholder="Enter company name"
            readOnly={!userData?.isSupportUser}
            className={`w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
              !userData?.isSupportUser ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            whileFocus={userData?.isSupportUser ? { scale: 1.01 } : {}}
          />
        </div>

        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="flex items-center text-gray-700 font-medium mb-2">
            <Monitor className="w-4 h-4 text-gray-600 mr-2" /> Device Access
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
              onChange={handleMobileAppChange}
            />

            <ToggleSwitch
              label={
                <span className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-gray-600" />
                  Web Access
                </span>
              }
              checked={companySettings.desktopWeb}
              onChange={handleDesktopWebChange}
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
            onChange={handleMobileWebChange}
          />
        </div>

        <motion.button
          onClick={handleSaveAll}
          disabled={isLoading || !isDirty}
          className={`w-full p-3 rounded-lg text-white font-semibold transition-all flex items-center justify-center ${
            isLoading
              ? "bg-indigo-300 cursor-not-allowed"
              : !isDirty
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700"
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

export { CompanySettings };
