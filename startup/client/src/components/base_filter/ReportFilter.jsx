import PropTypes from 'prop-types';
import { BaseFilter } from './BaseFilter';

const ReportFilter = (props) => <BaseFilter {...props} />;

ReportFilter.propTypes = {
  onFiltersApply: PropTypes.func,
  filtersConfig: PropTypes.array,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
};

export { ReportFilter };
