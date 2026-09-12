const userService = require('../../../services/userService');
const { normalizeEmail, normalizePhone } = require('../../../utils/normalizeUtils');
const { RECIPIENT_MODE } = require('../../../constants/notificationRules');


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


/**
 * The one person a record is about, named by the login they sign in with.
 */
function findSubject(allUsers, record) {
  const username = String(record?.subject || '').trim();
  if (!username) {
    return null;
  }

  const user = allUsers.find((candidate) => String(candidate.username || '').trim() === username);
  return user ? fromUser(user) : null;
}

/**
 * The same person, whichever way the two were addressed.
 */
function isSamePerson(recipient, subject) {
  if (subject.key && recipient.key === subject.key) {
    return true;
  }

  if (subject.userId && recipient.userId) {
    return String(recipient.userId) === String(subject.userId);
  }
  if (subject.email && recipient.email === subject.email) {
    return true;
  }
  return Boolean(subject.phone) && recipient.phone === subject.phone;
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

  const audience = [...byKey.values()];
  if (rule.onlyTheSubject) {
    const subject = findSubject(allUsers, record);
    if (!subject) {
      return [];
    }
    return audience.length === 0 || audience.some((person) => isSamePerson(person, subject))
      ? [subject]
      : [];
  }

  return audience;
}

module.exports = { resolveRecipients, fromUser };
