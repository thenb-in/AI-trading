const userService = require('../../../services/userService');
const { normalizeEmail, normalizePhone } = require('../../../utils/normalizeUtils');
const { RECIPIENT_MODE } = require('../../../constants/notificationRules');
const { getRecipientSource } = require('./recipientSourceRegistry');


// The email column is the address; the username is read only while it is still unset.
function fromUser(user) {
  return {
    key: `user:${user.id}`,
    userId: user.id,
    name: user.name || user.username || '',
    email: normalizeEmail(user.email),
    phone: normalizePhone(user.phone)
  };
}

function fromAddress(address) {
  return {
    key: `address:${address}`,
    userId: null,
    name: address,
    email: normalizeEmail(address),
    phone: normalizePhone(address)
  };
}


async function resolveRecipients(rule, { record } = {}) {
  const recipients = rule.recipients || {};
  const byKey = new Map();
  const add = (recipient) => {
    if (recipient?.key && !byKey.has(recipient.key)) {
      byKey.set(recipient.key, recipient);
    }
  };

  const { users: allUsers } = await userService.getAllUsers(rule.companyId);

  if (recipients[RECIPIENT_MODE.COMPANY]) {
    allUsers.forEach((user) => add(fromUser(user)));
  }

  const permissionNames = recipients[RECIPIENT_MODE.PERMISSION] || [];
  if (permissionNames.length) {
    const idSets = await Promise.all(
      permissionNames.map((permissionName) =>
        userService.getActiveUserIdsByPermissionName(rule.companyId, permissionName))
    );
    const holders = new Set(idSets.flat().map(String));
    allUsers
      .filter((user) => holders.has(String(user.id)))
      .forEach((user) => add(fromUser(user)));
  }

  const roleIds = (recipients[RECIPIENT_MODE.ROLE] || []).map(String);
  if (roleIds.length) {
    allUsers
      .filter((user) => user.role && roleIds.includes(String(user.role.id)))
      .forEach((user) => add(fromUser(user)));
  }

  const userIds = (recipients[RECIPIENT_MODE.USERS] || []).map(String);
  if (userIds.length) {
    allUsers
      .filter((user) => userIds.includes(String(user.id)))
      .forEach((user) => add(fromUser(user)));
  }

  (recipients[RECIPIENT_MODE.ADDRESSES] || []).forEach((address) => add(fromAddress(address)));

  // Anything left is an audience the app registered
  const builtIn = new Set(Object.values(RECIPIENT_MODE));
  const appKeys = Object.keys(recipients).filter((key) => !builtIn.has(key));
  for (const key of appKeys) {
    const source = getRecipientSource(key);
    const value = recipients[key];
    if (!source || !value || (Array.isArray(value) && value.length === 0)) {
      continue;
    }
    const resolved = await source.resolve({ companyId: rule.companyId, value, record });
    (resolved || []).forEach(add);
  }

  return [...byKey.values()];
}

module.exports = { resolveRecipients };
