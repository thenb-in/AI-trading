import { Headset } from "lucide-react";
import PropTypes from "prop-types";
import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDataContext, hasPermission } from "@context/useDataContext";
import { openHelpSupportNav } from "../utils/openHelpSupportNav";
import { shortcutTitle } from "../utils/keyboardShortcut";
import { ROUTE_HELP_SUPPORT } from "../constants/routes";
import { SHORTCUTS } from "../constants/shortcuts";
import { ShortcutHint } from "./base_components/ShortcutHint";

const HELP_SUPPORT_PERMISSION = "view_help_and_support";

function HelpSupportButton({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dataContext = useDataContext();

  const canOpen = hasPermission(HELP_SUPPORT_PERMISSION, dataContext);

  const handleClick = useCallback(() => {
    void openHelpSupportNav({ navigate, location }).catch(() => {
      // User-facing errors are handled inside openHelpSupportNav where applicable
    });
  }, [navigate, location]);

  if (!canOpen) {
    return null;
  }

  const isActive = location.pathname.startsWith(ROUTE_HELP_SUPPORT);

  return (
    <button
      type="button"
      onClick={handleClick}
      title={shortcutTitle("Help & Support", SHORTCUTS.HELP_SUPPORT)}
      aria-label="Help & Support"
      className={`w-full flex items-center rounded-lg transition-colors font-medium ${
        isActive
          ? "bg-blue-600 text-white"
          : "hover:bg-gray-700 text-gray-300"
      } ${collapsed ? "p-2 justify-center" : "py-3 justify-start"}`}
    >
      <Headset className="w-5 h-5 flex-shrink-0" size={20} />
      {!collapsed && (
        <>
          <span className="ml-2">Support</span>
          <ShortcutHint shortcut={SHORTCUTS.HELP_SUPPORT} />
        </>
      )}
    </button>
  );
}

HelpSupportButton.propTypes = {
  collapsed: PropTypes.bool.isRequired,
};

export { HelpSupportButton };
