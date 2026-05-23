import PropTypes from 'prop-types';
import { BaseFilter } from './BaseFilter';

const MasterFilter = (props) => <BaseFilter {...props} />;

MasterFilter.propTypes = {
  onFiltersApply: PropTypes.func.isRequired,
  filtersConfig: PropTypes.array,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
};

export { MasterFilter };
