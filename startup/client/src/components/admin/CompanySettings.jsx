import { useState, useEffect, useRef } from "react";
import PropTypes from 'prop-types';
import { CustomerDetailsFields } from "@startup/components/common/CustomerDetailsFields";
import { EMPTY_CUSTOMER_FORM } from "@startup/components/common/customerFormConstants";
import { customerApi, serviceOfferingApi } from "@app/services/api";

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
  IdCard,
  CalendarDays,
} from "lucide-react";
import { AccessDenied } from "../AccessDenied";
import { ToggleSwitch } from "./ToggleSwitch";
import { CompanyLocationFields } from "./CompanyLocationFields";
import { CompanyProfile } from "../CompanyProfile";
import { toast } from "react-toastify";

function CompanySettings() {

  const { userData, setHamburgerMenu, hamburgerMenu } = useDataContext();
  const [isMobileView] = useState(window.innerWidth < 768);
  const [companySettings, setCompanySettings] = useState({
    name: "",
    mobileApp: false,
    desktopWeb: true,
    mobileWeb: false,
    emp_code_basis: "identity_card",
    latitude: "",
    longitude: "",
    consecutive_leave_deactivation_days: "",
  });
  const [companyDetails, setCompanyDetails] = useState(EMPTY_CUSTOMER_FORM);
  const [companyLogoFile, setCompanyLogoFile] = useState(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState(null);
  const [serviceOfferings, setServiceOfferings] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const companyProfileRef = useRef(null);
  const logoInputRef = useRef(null);
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
          emp_code_basis: response.data.emp_code_basis || "identity_card",
          latitude: response.data.latitude ?? "",
          longitude: response.data.longitude ?? "",
          consecutive_leave_deactivation_days: response.data.consecutive_leave_deactivation_days ?? "",
        });

        setIsLoading(false);
      } catch (err) {
        setError(err.error || "Failed to load company settings");
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Load self-customer details and service offerings for the company-details section
  useEffect(() => {
    serviceOfferingApi.getAllServiceOfferings()
      .then((res) => {
        if (res?.data?.success) {
          setServiceOfferings(res.data.data.offerings || []);
        }
      })
      .catch(() => { /* dropdown can stay empty */ });

    customerApi.getSelf()
      .then((res) => {
        if (res?.data?.success && res.data.data) {
          const d = res.data.data;
          setCompanyDetails({
            ...EMPTY_CUSTOMER_FORM,
            customer_code: d.customer_code || "",
            customer_gstin: d.customer_gstin || "",
            service_offering_id: d.service_offering_id || "",
            pan_no: d.pan_no || "",
            customer_email: d.customer_email || "",
            bank_account_holder_name: d.bank_account_holder_name || "",
            bank_account_number: d.bank_account_number || "",
            bank_name: d.bank_name || "",
            bank_ifsc_code: d.bank_ifsc_code || "",
            bank_branch_name: d.bank_branch_name || "",
            entity_type: d.entity_type || "",
            entity_name: d.entity_name || "",
            phone: d.phone || "",
            alternate_phone: d.alternate_phone || "",
            address: d.address || "",
            district: d.district || "",
            proprietor_name: d.proprietor_name || "",
            description: d.description || "",
            service_charge: d.service_charge ?? ""
          });
          setCompanyLogoPreview(d.company_logo || null);
        }
      })
      .catch(() => { /* no self customer yet — keep empty form */ });
  }, []);

  const handleCompanyDetailsChange = (e) => {
    const { name, value } = e.target;
    setCompanyDetails((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleCompanyServiceOfferingChange = (selected) => {
    const value = Array.isArray(selected) && selected.length > 0 ? selected[0] : "";
    setCompanyDetails((prev) => ({ ...prev, service_offering_id: value }));
    setIsDirty(true);
  };

  const handleCompanyLogoChange = (e) => {
    const file = e.target.files?.[0] || null;
    setCompanyLogoFile(file);
    if (file) {
      setCompanyLogoPreview(URL.createObjectURL(file));
      setIsDirty(true);
    }
  };

  const clearCompanyLogo = () => {
    setCompanyLogoFile(null);
    setCompanyLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
    setIsDirty(true);
  };

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
        emp_code_basis: companySettings.emp_code_basis,
        latitude: companySettings.latitude,
        longitude: companySettings.longitude,
        consecutive_leave_deactivation_days: companySettings.consecutive_leave_deactivation_days,
      };

      await ApiService.updateCompanySettings(companyData);

      if (companyProfileRef.current?.save) {
        await companyProfileRef.current.save();
      }

      // Persist the company-as-self customer record (entity_name pulled from companySettings.name)
      const selfFd = new FormData();
      const selfPayload = {
        ...companyDetails,
        entity_name: companySettings.name
      };
      Object.entries(selfPayload).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          selfFd.append(key, value);
        }
      });
      if (companyLogoFile) selfFd.append("company_logo", companyLogoFile);
      await customerApi.upsertSelf(selfFd);

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

  const handleProfileDirtyChange = (isProfileDirty) => {
    if (isProfileDirty) {
      setIsDirty(true);
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

  const handleEmpCodeBasisChange = (e) => {
    handleInputChange("emp_code_basis", e.target.value);
  };

  const handleLatitudeChange = (e) => {
    handleInputChange("latitude", e.target.value);
  };

  const handleLongitudeChange = (e) => {
    handleInputChange("longitude", e.target.value);
  };

  const handleConsecutiveLeaveDeactivationDaysChange = (e) => {
    handleInputChange("consecutive_leave_deactivation_days", e.target.value);
  };

  const handleLocationAutoFill = (lat, lng) => {
    setCompanySettings((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    setIsDirty(true);
    setError("");
    setSuccess("");
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

        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="flex items-center text-gray-700 font-medium mb-2">
            <IdCard className="w-4 h-4 text-gray-600 mr-2" /> Employee Code Basis
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Controls how deactivation behaves on biometric devices. Identity card frees the device slot; serial number keeps the slot reserved but strips card/password and removes biometric templates.
          </p>
          <div className="flex flex-col gap-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="emp_code_basis"
                value="identity_card"
                checked={companySettings.emp_code_basis === "identity_card"}
                onChange={handleEmpCodeBasisChange}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-gray-700">Identity card</span>
                <span className="block text-xs text-gray-500">
                  emp_code is a person-bound ID; deactivation sends DATA DEL_USER and releases the device slot.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="emp_code_basis"
                value="serial_number"
                checked={companySettings.emp_code_basis === "serial_number"}
                onChange={handleEmpCodeBasisChange}
                className="mt-1"
              />
              <span>
                <span className="font-medium text-gray-700">Serial number</span>
                <span className="block text-xs text-gray-500">
                  emp_code is a sequential slot number; deactivation deletes templates and clears card/password but keeps the PIN slot reserved.
                </span>
              </span>
            </label>
          </div>
        </div>

        <CompanyLocationFields
          latitude={companySettings.latitude}
          longitude={companySettings.longitude}
          onLatitudeChange={handleLatitudeChange}
          onLongitudeChange={handleLongitudeChange}
          onAutoFill={handleLocationAutoFill}
        />

        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="flex items-center text-gray-700 font-medium mb-2">
            <CalendarDays className="w-4 h-4 text-gray-600 mr-2" /> Leave Auto-Deactivation
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Runs nightly and deactivates active employees whose current leave streak is greater than this many consecutive days. Leave blank to disable.
          </p>
          <input
            type="number"
            min="8"
            step="1"
            value={companySettings.consecutive_leave_deactivation_days}
            onChange={handleConsecutiveLeaveDeactivationDaysChange}
            placeholder="Disabled"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Company Profile - App-specific settings */}
        <CompanyProfile
          ref={companyProfileRef}
          isLoading={isLoading}
          onDirtyChange={handleProfileDirtyChange}
        />

        {/* Company Details — stored as the self-customer row (is_self=true).
            entity_name is taken from the Company Name field above on save. */}
        <div className="mt-6">
          <CustomerDetailsFields
            formData={companyDetails}
            onChange={handleCompanyDetailsChange}
            labelPrefix="Company"
            omitFields={['customer_code', 'entity_name']}
            logoFile={companyLogoFile}
            logoPreview={companyLogoPreview}
            fileInputRef={logoInputRef}
            onLogoChange={handleCompanyLogoChange}
            onClearLogo={clearCompanyLogo}
            serviceOfferings={serviceOfferings}
            onServiceOfferingChange={handleCompanyServiceOfferingChange}
          />
        </div>

        <motion.button
          onClick={handleSaveAll}
          disabled={isLoading || (!isDirty && !(companyProfileRef.current?.isDirty?.() || false))}
          className={`w-full p-3 rounded-lg text-white font-semibold transition-all flex items-center justify-center ${
            isLoading
              ? "bg-indigo-300 cursor-not-allowed"
              : !isDirty && !(companyProfileRef.current?.isDirty?.() || false)
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
