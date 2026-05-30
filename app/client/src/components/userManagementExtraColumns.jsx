// import DataAccessCell from './data_acess/DataAccessCell';
import { HomeLocationCell } from './user_management_extra_columns/HomeLocationCell';
import { OfficeLocationCell } from './user_management_extra_columns/OfficeLocationCell';
import { PriceTierCell } from './user_management_extra_columns/user_price_tier/PriceTierCell';
import { DefaultModeCell } from './user_management_extra_columns/DefaultModeCell';
import { CreateEmployeeCell } from './user_management_extra_columns/CreateEmployeeCell';
const getUserManagementExtraColumns = (onUserProfileUpdate) => ([
  // {
  //   key: 'dataAccess',
  //   header: 'Data Access',
  //   render: (user) => <DataAccessCell user={user} />
  // }
  {key: 'home_location', header: 'Home Location', render: (user) => <HomeLocationCell user={user} onUpdate={onUserProfileUpdate} />},
  {key: 'office_location', header: 'Office Location', render: (user) => <OfficeLocationCell user={user} onUpdate={onUserProfileUpdate} />},
  {key:'price_tier', header: 'Price Tier', render: (user) => <PriceTierCell user={user} onUpdate={onUserProfileUpdate} />},
  {key: 'default_mode', header: 'Default Mode', render: (user) => <DefaultModeCell user={user} onUpdate={onUserProfileUpdate} />},
  {key: 'employee', header: 'Employee', render: (user) => <CreateEmployeeCell user={user} />},
]);

export { getUserManagementExtraColumns };


