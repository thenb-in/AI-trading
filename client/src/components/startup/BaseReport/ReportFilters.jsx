import { Filter } from '../Filter'
import { format } from 'date-fns'
import PropTypes from 'prop-types'

const ReportFilter = ({onFiltersApply, additionalFilters =[], initialFilters, disabled}) => {
    const getYesterdayDate = () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return format(yesterday, 'yyyy-MM-dd');
    };
    
    const filters = [
        { name: 'start_date', label: 'Start Date', type: 'date', default: getYesterdayDate(), is_standard: true, order: 1},
        { name: 'end_date', label: 'End Date', type: 'date', default: getYesterdayDate(), is_standard: true, order: 2},
        ...additionalFilters
    ];
    const debugFilters=['is_debug_mode']
  return (
    <Filter
     onFiltersApply={onFiltersApply}
     additionalFilters={filters}
     initialFilters={initialFilters}
     disabled={disabled}
     debugFilters={debugFilters}
    />
  )
}

ReportFilter.propTypes = {
  onFiltersApply: PropTypes.func,
  additionalFilters: PropTypes.array,
  initialFilters: PropTypes.object,
  disabled: PropTypes.bool
}

export { ReportFilter }
