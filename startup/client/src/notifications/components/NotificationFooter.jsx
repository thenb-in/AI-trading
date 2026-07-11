import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

// Sticky footer action to navigate to the full notifications view.
function NotificationFooter({ onNavigate }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/admin/notifications");
    onNavigate?.();
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5">
      <button
        type="button"
        onClick={handleClick}
        className="w-full rounded-md py-1.5 text-center text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
      >
        View all notifications
      </button>
    </div>
  );
}

NotificationFooter.propTypes = {
  onNavigate: PropTypes.func,
};

export { NotificationFooter };
