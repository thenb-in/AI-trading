'use strict';

const { UserProfile } = require('../models');

const getProfileByUserId = async (userId) => {
  return UserProfile.findOne({ where: { userId } });
};

module.exports = {
  getProfileByUserId
};
