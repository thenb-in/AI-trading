import { registerFilterOptionResolver } from '@startup/components/base_filter/filter/filterOptionResolverRegistry';
import { isWeeklyEmpType } from '@app/components/masters/employee_master/constants/emp_field_constants';

/** Debug off → hide weekly employees in the employee filter dropdown. */
const resolveWeeklyEmployeesByDebugMode = (config, { debugMode }) => {
  if (debugMode || config.name !== 'employee') return config;
  if (!Array.isArray(config.options)) return config;
  if (!config.options.some((o) => o.emp_type != null && o.emp_type !== '')) return config;

  return {
    ...config,
    options: config.options.filter(
      (o) => o.value === 'all' || !isWeeklyEmpType(o.emp_type)
    ),
  };
};

/**
 * Register this app's filter option resolvers into the startup filter
 * registry. Called once at boot from `registerAppData()`.
 */
function registerFilterOptionResolvers() {
  registerFilterOptionResolver(resolveWeeklyEmployeesByDebugMode);
}

export { registerFilterOptionResolvers };
