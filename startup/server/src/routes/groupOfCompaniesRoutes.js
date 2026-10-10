const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireSupportUser = require('../middleware/requireSupportUser');
const { createCrudActivityLogs } = require('../middleware/activityLogMiddleware');
const { groupOfCompaniesCreateValidation, groupOfCompaniesUpdateValidation } = require('../validators/groupOfCompaniesValidator');
const { getGroups, getOptions, getUsersForCompanies, createGroup, updateGroup, deleteGroup } = require('../views/groupOfCompaniesView');

const router = express.Router();

const groupLogs = createCrudActivityLogs('GroupOfCompanies');

// A group of companies lives above any one company, so it is support staff's to
// manage — the same gate the multi-company and subscription screens sit behind.
router.use(authMiddleware.protect);
router.use(requireSupportUser);

router.get('/options', getOptions);
router.get('/users', getUsersForCompanies);
router.get('/', getGroups);
router.post('/', groupOfCompaniesCreateValidation, groupLogs.create, createGroup);
router.put('/:id', groupOfCompaniesUpdateValidation, groupLogs.update, updateGroup);
router.delete('/:id', groupLogs.delete, deleteGroup);

module.exports = router;
