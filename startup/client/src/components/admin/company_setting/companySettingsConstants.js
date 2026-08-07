import {
  Settings,
  MapPin,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";


const COMPANY_SETTINGS_TABS = [
  { id: "general", label: "General", description: "Identity, access & company details", icon: Settings },
  { id: "profile", label: "Company Profile", description: "Attendance, compliance & credentials", icon: SlidersHorizontal },
  { id: "location", label: "Geofencing", description: "Punch location & radius", icon: MapPin }
];

const ENGINEERING_SETTINGS_TAB = {
  id: "engineering",
  label: "Engineering",
  description: "Settings that are not part of the normal company setup",
  icon: Wrench,
};

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

export { COMPANY_SETTINGS_TABS, ENGINEERING_SETTINGS_TAB, EMPTY_COMPANY_DETAILS_FORM };
