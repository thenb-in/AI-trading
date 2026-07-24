const { validate } = require('uuid');

const isValidUuid = (value) => typeof value === 'string' && validate(value);

module.exports = {
  isValidUuid
};
