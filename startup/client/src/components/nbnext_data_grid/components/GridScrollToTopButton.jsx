import PropTypes from "prop-types";
import { ArrowUp } from "lucide-react";

function GridScrollToTopButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-20 right-6 z-50 px-4 py-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
      title="Scroll to top"
      aria-label="Scroll to top"
    >
      <ArrowUp size={18} />
      <span className="text-sm font-medium">Scroll to Top</span>
    </button>
  );
}

GridScrollToTopButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

export { GridScrollToTopButton };
