import { CheckCircle2, Info, AlertTriangle, XCircle } from "lucide-react";

// Visual treatment per notification variant (icon + colours).
const TYPE_STYLES = {
  success: { Icon: CheckCircle2, iconClass: "text-emerald-600", ringClass: "bg-emerald-50" },
  info: { Icon: Info, iconClass: "text-blue-600", ringClass: "bg-blue-50" },
  warning: { Icon: AlertTriangle, iconClass: "text-amber-600", ringClass: "bg-amber-50" },
  error: { Icon: XCircle, iconClass: "text-red-600", ringClass: "bg-red-50" },
};
const DEFAULT_VARIANT = "info";
const DEFAULT_GROUP_LABEL = "Earlier";

export { TYPE_STYLES, DEFAULT_VARIANT, DEFAULT_GROUP_LABEL };
