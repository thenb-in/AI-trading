import {
  Settings,
  MapPin,
} from "lucide-react";


// Base framework tabs. Apps that need extra tabs (e.g. an attendance/compliance
// "Company Profile" panel) compose their own page around these — the scaffold
// does not reference app-specific customizations.
const COMPANY_SETTINGS_TABS = [
  { id: "general", label: "General", description: "Identity, access & company details", icon: Settings },
  { id: "location", label: "Geofencing", description: "Punch location & radius", icon: MapPin }

];

const EMPTY_COMPANY_DETAILS_FORM = {
  company_email: "",
  phone: "",
  alternate_phone: "",
  district: "",
  address: "",
  company_gstin: "",
  pan_no: "",
  bank_account_holder_name: "",
  bank_account_number: "",
  bank_name: "",
  bank_branch_name: "",
  bank_ifsc_code: "",
  epf_no: "",
  sac_code: "",
};

export { COMPANY_SETTINGS_TABS, EMPTY_COMPANY_DETAILS_FORM };
