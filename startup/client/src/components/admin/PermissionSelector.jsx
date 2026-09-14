import { ApiService } from '@services/ApiService';
import { MasterSelector } from '@startup/components/base_components/fields/MasterSelector';

const loadPermissions = () => ApiService.getPermissions().then((response) => response.data?.data ?? []);

const permissionOption = ({ name, display_name: displayName }) => ({ label: displayName || name, searchKeys: [displayName, name] });

// What a rule or an audience keeps is the permission's name.
const permissionName = (permission) => permission.name;

/** Picks permissions by name; `multiple` for a set of them. */
const PermissionSelector = (props) => (
  <MasterSelector loadRows={loadPermissions} toOption={permissionOption} getValue={permissionName} optionName="Permission" allowCreate={false} {...props} />
);

export { PermissionSelector };
