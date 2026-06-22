'use strict';

// Registers the onboarding recovery job: a periodic sweep that settles any
// self-serve order which was paid for but never turned into a workspace —
// refunding the captured payment so a browser/server failure after checkout can
// never leave a customer charged for nothing. Cadence is ONBOARDING_RECONCILE_CRON
// (env var name kept for deployment-config stability).

const env = require('../config/env');
const { registerJob } = require('../../scheduler');
const onboardingService = require('./onboarding.service');

function registerOnboardingJobs() {
  registerJob({
    name: 'onboarding-reconcile',
    cronTime: env.ONBOARDING_RECONCILE_CRON,
    run: () => onboardingService.recoverPendingOrders()
  });
}

module.exports = { registerOnboardingJobs };
