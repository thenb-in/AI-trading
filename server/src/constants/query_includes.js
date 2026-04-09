function createdByUserInclude(User) {
  return { model: User, as: 'createdByUser', required: false, attributes: ['id', 'name'] };
}

module.exports = { createdByUserInclude };
