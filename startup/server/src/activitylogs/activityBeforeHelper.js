const setActivityBeforeFromService = async ({ loadById, id, res, companyId }) => {
  const record = companyId !== undefined ? await loadById(id, companyId) : await loadById(id);

  if (record) {
    const plain = record.toJSON ? record.toJSON() : record;
    res.locals.activityBefore = plain;
    res.locals.activityObjectId = plain.id;
  } else {
    res.locals.activityObjectId = id;
  }
};

module.exports = {
  setActivityBeforeFromService
};

