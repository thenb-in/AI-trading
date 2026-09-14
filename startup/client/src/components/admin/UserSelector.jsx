import { ApiService } from '@services/ApiService';
import { MasterSelector } from '@startup/components/base_components/fields/MasterSelector';
import { MASTERS } from '@startup/constants/masters';

const loadUsers = () => ApiService.getAllUsers().then((response) => response.data?.users ?? []);

const userOption = ({ name, username }) => ({ label: name || username, searchKeys: [name, username] });

/** Picks the company's users; `multiple` for a set of them. */
const UserSelector = (props) => (
  <MasterSelector loadRows={loadUsers} toOption={userOption} masterName={MASTERS.USER} allowCreate={false} {...props} />
);

export { UserSelector };
