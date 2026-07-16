'use strict';

const { IdentityLink } = require('../models');

// wallet_account_id is unique, so a sub maps to at most one link.
const findByWalletAccountId = async (walletAccountId) => {
  return IdentityLink.findOne({ where: { wallet_account_id: walletAccountId } });
};


const findIdentityLinkByUserId = async (userId) => {
  return IdentityLink.findOne({ where: { user_id: userId } });
};

// transaction is optional: first-login linking has no surrounding work, but
// signup provisioning creates the user and this link together and must not
// leave a link pointing at a user that rolled back.
const linkWalletAccount = async ({ walletAccountId, userId, companyId, transaction = null }) => {
  return IdentityLink.create({
    wallet_account_id: walletAccountId,
    user_id: userId,
    company_id: companyId
  }, { transaction });
};

module.exports = {
  findByWalletAccountId,
  findIdentityLinkByUserId,
  linkWalletAccount
};
