import PropTypes from 'prop-types';

// Shared PropTypes shapes for the onboarding flow, so PlanCard, the plan modal
// and the step components all validate against one definition instead of each
// re-declaring it.

// A plan feature: a navigator @data definition (module/report/master) that the
// plan's permissions grant — see planFeatures.buildPlanFeatures.
const featureShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  group: PropTypes.string,
  icon: PropTypes.elementType,
  color: PropTypes.string,
  category: PropTypes.string,
  description: PropTypes.string // "Other" features carry the permission's description
});

// Raw subscribed permission as returned by the server; the client matches these
// against its navigator definitions to build the feature list. display_name +
// description label the "Other" permissions that have no navigator definition.
const permissionShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  name: PropTypes.string.isRequired,
  display_name: PropTypes.string,
  description: PropTypes.string,
  type: PropTypes.string
});

const planShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
  // Fixed signup price from the server: amount in the currency's minor unit
  // (paise for INR) plus the ISO currency code. Same for every plan today.
  amount: PropTypes.number,
  currency: PropTypes.string,
  permissions: PropTypes.arrayOf(permissionShape),
  features: PropTypes.arrayOf(featureShape).isRequired
});

const companyShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  state: PropTypes.string,
  employeeCount: PropTypes.string
});

const accountShape = PropTypes.shape({
  name: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  phone: PropTypes.string,
  password: PropTypes.string.isRequired,
  confirmPassword: PropTypes.string.isRequired
});

// Live availability-check state for a field (company name / username).
const availabilityShape = PropTypes.shape({
  status: PropTypes.oneOf(['idle', 'checking', 'available', 'taken', 'error']),
  available: PropTypes.bool
});

export { featureShape, planShape, companyShape, accountShape, availabilityShape };
