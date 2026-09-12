import { RECIPIENT_MODE } from '../constants';

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

const audienceSummary = (recipients = {}, countFor) => {
  const parts = [
    recipients[RECIPIENT_MODE.COMPANY] && 'everyone in the company',
    countFor(RECIPIENT_MODE.ROLE) > 0 && plural(countFor(RECIPIENT_MODE.ROLE), 'role', 'roles'),
    countFor(RECIPIENT_MODE.PERMISSION) > 0
      && plural(countFor(RECIPIENT_MODE.PERMISSION), 'permission', 'permissions'),
    countFor(RECIPIENT_MODE.USERS) > 0 && plural(countFor(RECIPIENT_MODE.USERS), 'user', 'users'),
    countFor(RECIPIENT_MODE.ADDRESSES) > 0
      && plural(countFor(RECIPIENT_MODE.ADDRESSES), 'address', 'addresses')
  ].filter(Boolean);

  return parts.join(', ');
};

export { audienceSummary };
