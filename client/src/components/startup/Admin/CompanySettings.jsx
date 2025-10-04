import { useState, useEffect } from "react";
import { useDataContext } from "../../../context/startup/useDataContext";
import ApiService from "../../../services/startup/ApiService";
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
import AccessDenied from "../AccessDenied";
import ToggleSwitch from "./ToggleSwitch";

export default function CompanySettings() {

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
        console.log(err)
        setError(err.error || "Failed to load company settings");
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const requiredPermission = "View Company Settings";
  const hasPermission = userData?.role?.permissions?.some(
    (permission) => permission.name === requiredPermission
  );

  if (!hasPermission) {
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

  const handleUpdateSettings = async () => {
    try {
      setIsLoading(true);
      setShowFeedback(true);

      if (!companySettings.name.trim()) {
        setError("Company name cannot be empty");
        setIsLoading(false);
        return;
      }

      const dataToSend = {
        name: companySettings.name,
        mobileApp: companySettings.mobileApp,
        desktopWeb: companySettings.desktopWeb,
        mobileWeb: companySettings.mobileWeb,
      };

      await ApiService.updateCompanySettings(dataToSend);
      setSuccess("Settings updated successfully");
      setError("");
      setIsDirty(false);

      setTimeout(() => {
        setSuccess("");
        setShowFeedback(false);
      }, 3000);
    } catch (err) {
      setError(err.message || "Failed to update company settings");
      setSuccess("");
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
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Enter company name"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            whileFocus={{ scale: 1.01 }}
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
              onChange={(e) =>
                handleInputChange("desktopWeb", e.target.checked)
              }
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

        <motion.button
          onClick={handleUpdateSettings}
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
