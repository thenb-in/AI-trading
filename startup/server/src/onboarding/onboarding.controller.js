const onboardingService = require('./onboarding.service');

const onboardingController = {
  /**
   * Get the public plan catalogue with features.
   * @returns {Promise<array>} Plans
   */
  async getPlans() {
    return await onboardingService.getPublicPlans();
  },

  /**
   * Verify payment and provision company + admin user + plan.
   * @param {object} payload - { subscriptionId, company, user, payment }
   * @returns {Promise<object>} Created company / user / subscription summary
   */
  async onboard(payload) {
    return await onboardingService.onboard(payload);
  },

  /**
   * Apply a verified Razorpay webhook event (signature already checked in view).
   * @param {object} event - The Razorpay webhook body.
   */
  async handleWebhook(event) {
    return await onboardingService.handleWebhookEvent(event);
  }
};

module.exports = onboardingController;
