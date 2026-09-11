import { useState, useEffect, useRef } from "react";
import { useDataContext } from "@context/useDataContext";
import { ApiService } from "@services/ApiService";
import { toast } from "react-toastify";
import { EMPTY_COMPANY_DETAILS_FORM } from "./companySettingsConstants";


function useCompanySettings() {
  const { userData } = useDataContext();

  const [companySettings, setCompanySettings] = useState({
    name: "",
    mobileApp: false,
    desktopWeb: true,
    mobileWeb: false,
    latitude: "",
    longitude: "",
    geofence_radius_meters: "",
    debug_mode_shortcut: "",
  });
  const [companyDetails, setCompanyDetails] = useState(EMPTY_COMPANY_DETAILS_FORM);
  const [companyLogoFile, setCompanyLogoFile] = useState(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const companyProfileRef = useRef(null);
  const logoInputRef = useRef(null);

  const originalCompanyRef = useRef(null);
  const originalDetailsRef = useRef(EMPTY_COMPANY_DETAILS_FORM);
  const originalLogoPreviewRef = useRef(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsFetching(true);
        const response = await ApiService.getCompanySettings();

        const next = {
          name: response.data.name || "",
          mobileApp: response.data.mobileApp || false,
          desktopWeb: response.data.desktopWeb || true,
          mobileWeb: response.data.mobileWeb || false,
          latitude: response.data.latitude ?? "",
          longitude: response.data.longitude ?? "",
          geofence_radius_meters: response.data.geofence_radius_meters ?? "",
          debug_mode_shortcut: response.data.debug_mode_shortcut ?? "",
        };
        setCompanySettings(next);
        originalCompanyRef.current = next;

        setIsFetching(false);
      } catch (err) {
        toast.error(err.error || "Failed to load company settings");
        setIsFetching(false);
      }
    };
    fetchSettings();
  }, []);

  // Load the company details for the company-details section.
  useEffect(() => {
    ApiService.getCompanyDetails()
      .then((res) => {
        if (res?.data?.success && res.data.data) {
          const d = res.data.data;
          const next = {
            ...EMPTY_COMPANY_DETAILS_FORM,
            company_gstin: d.company_gstin || "",
            pan_no: d.pan_no || "",
            company_email: d.company_email || "",
            bank_account_holder_name: d.bank_account_holder_name || "",
            bank_account_number: d.bank_account_number || "",
            bank_name: d.bank_name || "",
            bank_ifsc_code: d.bank_ifsc_code || "",
            bank_branch_name: d.bank_branch_name || "",
            phone: d.phone || "",
            alternate_phone: d.alternate_phone || "",
            address: d.address || "",
            district: d.district || "",
            epf_no: d.epf_no || "",
            sac_code: d.sac_code || ""
          };
          setCompanyDetails(next);
          originalDetailsRef.current = next;
          originalLogoPreviewRef.current = d.company_logo || null;
          setCompanyLogoPreview(d.company_logo || null);
        }
      })
      .catch(() => { /* no company details yet — keep empty form */ });
  }, []);

  const handleInputChange = (field, value) => {
    setCompanySettings((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleCompanyDetailsChange = (e) => {
    const { name, value } = e.target;
    setCompanyDetails((prev) => ({ ...prev, [name]: value }));
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

  const handleSaveAll = async () => {
    try {
      setIsLoading(true);
      setShowFeedback(true);

      if (!companySettings.name.trim()) {
        toast.error("Company name cannot be empty");
        setIsLoading(false);
        return;
      }

      const companyData = {
        name: companySettings.name,
        mobileApp: companySettings.mobileApp,
        desktopWeb: companySettings.desktopWeb,
        mobileWeb: companySettings.mobileWeb,
        latitude: companySettings.latitude,
        longitude: companySettings.longitude,
        geofence_radius_meters: companySettings.geofence_radius_meters,
        debug_mode_shortcut: companySettings.debug_mode_shortcut || null,
      };

      await ApiService.updateCompanySettings(companyData);

      // Persist the embedded CompanyProfile settings (app-owned) through its ref.
      if (companyProfileRef.current?.save) {
        await companyProfileRef.current.save();
      }

      // Persist the company details. entity_name is not stored — it is derived
      // from the Company name on read.
      const detailsFd = new FormData();
      const detailsPayload = { ...companyDetails };
      Object.entries(detailsPayload).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          detailsFd.append(key, value);
        }
      });
      if (companyLogoFile) detailsFd.append("company_logo", companyLogoFile);
      await ApiService.updateCompanyDetails(detailsFd);

      setIsDirty(false);
      toast.success("Settings updated successfully");

      setTimeout(() => {
        setShowFeedback(false);
      }, 3000);
    } catch (err) {
      // 400 validation errors (err.errors[]) are already toasted by the axios
      // interceptor — don't add a second generic toast on top of them.
      if (!Array.isArray(err?.errors)) {
        toast.error(err.error || err.message || "Failed to update settings");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileDirtyChange = (isProfileDirty) => {
    if (isProfileDirty) {
      setIsDirty(true);
    }
  };

  // Restore every section to its last-loaded values — no page reload.
  const handleDiscardAll = () => {
    if (originalCompanyRef.current) setCompanySettings(originalCompanyRef.current);
    setCompanyDetails(originalDetailsRef.current);
    setCompanyLogoFile(null);
    setCompanyLogoPreview(originalLogoPreviewRef.current);
    if (logoInputRef.current) logoInputRef.current.value = "";
    companyProfileRef.current?.reset?.();
    setIsDirty(false);
  };

  const handleNameChange = (e) => handleInputChange("name", e.target.value);
  const handleMobileAppChange = (e) => handleInputChange("mobileApp", e.target.checked);
  const handleDesktopWebChange = (e) => handleInputChange("desktopWeb", e.target.checked);
  const handleMobileWebChange = (e) => handleInputChange("mobileWeb", e.target.checked);
  const handleLatitudeChange = (e) => handleInputChange("latitude", e.target.value);
  const handleLongitudeChange = (e) => handleInputChange("longitude", e.target.value);
  const handleGeofenceRadiusChange = (e) => handleInputChange("geofence_radius_meters", e.target.value);
  const handleDebugModeShortcutChange = (shortcut) => handleInputChange("debug_mode_shortcut", shortcut);

  const handleLocationAutoFill = (lat, lng) => {
    setCompanySettings((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    setIsDirty(true);
  };

  // Save is enabled when this form is dirty OR the embedded CompanyProfile is dirty.
  const canSave = isDirty || (companyProfileRef.current?.isDirty?.() || false);

  return {
    userData,
    companySettings,
    companyDetails,
    companyLogoFile,
    companyLogoPreview,
    isFetching,
    isLoading,
    showFeedback,
    isDirty,
    canSave,
    companyProfileRef,
    logoInputRef,
    handleInputChange,
    handleCompanyDetailsChange,
    handleCompanyLogoChange,
    clearCompanyLogo,
    handleSaveAll,
    handleDiscardAll,
    handleProfileDirtyChange,
    handleNameChange,
    handleMobileAppChange,
    handleDesktopWebChange,
    handleMobileWebChange,
    handleLatitudeChange,
    handleLongitudeChange,
    handleGeofenceRadiusChange,
    handleDebugModeShortcutChange,
    handleLocationAutoFill,
  };
}

export { useCompanySettings };
