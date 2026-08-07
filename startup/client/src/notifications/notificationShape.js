import PropTypes from "prop-types";

// Shared shape for a single notification — reused across every component
// so the contract is declared in exactly one place.
const notificationShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  variant: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  // In-app route this notification points at, when it has one.
  link: PropTypes.string,
  time: PropTypes.string,
  group: PropTypes.string,
  read: PropTypes.bool.isRequired,
});

export { notificationShape };
