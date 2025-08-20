const jwt = require('jsonwebtoken');
const { User } = require('../models');
require('dotenv').config();

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRATION  }
  );
};

const generateRefreshToken = async (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRATION }
  );

 
}


const verifyToken = (token, secret) => {
  if (!token) {
    throw new Error('No token provided');
  }
  return jwt.verify(token, secret);
};

const revokeRefreshToken = async (userId) => {
  const [updated] = await User.update(
    { refresh_token: null },
    { 
      where: { id: userId },
      returning: true
    }
  );

  return updated > 0;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  revokeRefreshToken
};
