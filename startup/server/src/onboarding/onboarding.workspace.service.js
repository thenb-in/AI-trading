const logger = require('../../logger');
const { sequelize } = require('../services/databaseService');
const subscriptionService = require('../services/subscription.service');
const authService = require('../services/authService');
const companyService = require('../services/companyService');
const companyProfileService = require('../services/companyProfileService');
const companySubscriptionService = require('../services/companySubscription.service');
const roleService = require('../services/roleService');
const userService = require('../services/userService');
const onboardingOrderService = require('../services/onboardingOrder.service');
const { SYSTEM_ROLE_CONSTANTS } = require('../constants/permissions');


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
    await companyProfileService.createCompanyProfile(
      company.id,
      { default_state: defaultState, establishment_employee_count: establishmentCount },
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

module.exports = { createWorkspace };
