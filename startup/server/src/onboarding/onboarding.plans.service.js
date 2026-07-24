const razorpayService = require('../razorpay/razorpay.service');
const env = require('../config/env');
const { fetchPlansFromWallet } = require('../../interfaces/wallet/subscriptionInterface');


const getPublicPlans = async () => {
  const plans = await fetchPlansFromWallet(env.APP_KEY);
  const { currency } = razorpayService.getDefaultPricing();

  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description ?? null,
    amount: typeof plan.amount === 'number' ? Math.round(plan.amount * 100) : null,
    currency,
    permissions: plan.permissions || []
  }));
};

module.exports = { getPublicPlans };
