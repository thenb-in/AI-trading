const logger = require('../../logger');
const { sequelize } = require('../services/databaseService');
const subscriptionService = require('../services/subscription');
const authService = require('../services/authService');
const companyService = require('../services/companyService');
const companySubscriptionService = require('../services/companySubscription.service');
const roleService = require('../services/roleService');
const userService = require('../services/userService');
const onboardingOrderService = require('../services/onboardingOrder.service');
const walletSubscriptionInterface = require('../../interfaces/wallet/subscriptionInterface');
const { SYSTEM_ROLE_CONSTANTS } = require('../constants/permissions');
const { SUBSCRIPTION_WALLET_HEADS } = require('../constants/subscription');
const { oneYearFromNow } = require('../utils/dateUtils');


async function syncWorkspaceToWallet({ companyId, companyName, subscriptionId, employeeCount, amount, paymentId }) {
  await walletSubscriptionInterface.syncCompanySubscriptionsToWallet({
    companyId,
    companyName,
    planIds: [subscriptionId],
    heads: [{ head: SUBSCRIPTION_WALLET_HEADS, limit: employeeCount }],
    expiryDate: oneYearFromNow(),
    amount,
    paymentId
  });
}

const createWorkspace = async ({
  subscriptionId,
  companyName,
  username,
  password,
  defaultState,
  establishmentCount,
  phone,
  name,
  payment
}) => {
  const transaction = await sequelize.transaction();
  try {
    // Plan must exist and be a public/global plan.
    const subscription = await subscriptionService.getGlobalPlanById(subscriptionId, { transaction });

    // Uniqueness checks inside the txn so they see our own pending writes.
    const existingCompany = await companyService.getCompanyByName(companyName, transaction);
    if (existingCompany) {
      throw { status: 409, message: `A company named "${companyName}" already exists` };
    }
    const existingUser = await userService.getUserByUsername(username, transaction);
    if (existingUser) {
      throw { status: 409, message: `Username "${username}" is already taken` };
    }

    // System roles are global (companyId = null) and shared across companies.
    const [superAdminRole, userRole] = await Promise.all([
      roleService.getRoleByName(SYSTEM_ROLE_CONSTANTS.SUPER_ADMIN.name, transaction),
      roleService.getRoleByName(SYSTEM_ROLE_CONSTANTS.USER.name, transaction)
    ]);
    if (!superAdminRole) {
      throw { status: 500, message: 'System roles are not initialised. Please contact support.' };
    }

    // Company + profile. userRole is the company's default role for new members.
    const company = await companyService.createCompany(
      { name: companyName, mobileApp: false, desktopWeb: true, mobileWeb: false, role_id: userRole?.id ?? null },
      transaction
    );
    await companyService.createCompanyProfile(
      { companyId: company.id, default_state: defaultState, establishment_employee_count: establishmentCount },
      transaction
    );
    const user = await authService.signup(
      username,
      password,
      company.id,
      {
        phone,
        name,
        role: superAdminRole.id,
        is_approved: true,
        last_active: new Date()
      },
      null,
      transaction
    );

    // Attach the chosen plan to the new company.
    await companySubscriptionService.addCompanySubscription(company.id, subscription.id, transaction);

    // Paid amount lives on the order record (in paise) — convert to rupees for the wallet.
    const order = await onboardingOrderService.getByOrderId(payment.orderId, transaction);
    const paidAmount = order && order.amount !== null ? order.amount / 100 : null;

    // Mark the order provisioned in the same txn — keeps the order record and
    // the workspace consistent, and tells the reconcile sweep this one is done.
    await onboardingOrderService.markProvisioned(
      payment.orderId,
      { companyId: company.id, paymentId: payment.paymentId },
      transaction
    );

    await transaction.commit();
    logger.info(
      `Onboarded company "${company.name}" (${company.id}) with admin "${username}" on plan "${subscription.name}"`
    );
    try {
      await syncWorkspaceToWallet({
        companyId: company.id,
        companyName: company.name,
        subscriptionId: subscription.id,
        employeeCount: establishmentCount,
        amount: paidAmount,
        paymentId: payment.paymentId
      });
      await onboardingOrderService.markWalletSynced(payment.orderId);
    } catch (walletError) {
      logger.error(`Wallet sync failed for onboarded company ${company.id} (will retry): ${walletError.message}`,walletError);
    }

    return {
      company: { id: company.id, name: company.name },
      user: { id: user.id, username },
      subscription: { id: subscription.id, name: subscription.name },
      paymentStatus: 'paid', // Razorpay signature verified by the orchestrator
      paymentId: payment.paymentId
    };
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
};

module.exports = { createWorkspace, syncWorkspaceToWallet };
