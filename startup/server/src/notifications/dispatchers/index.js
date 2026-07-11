const { notifyCompanyAdminsOfLogin } = require('./loginDispatcher');
const { notifyCreatorOfApprovalDecision } = require('./approvalDispatcher');
const { notifyApproversOfPendingRequest } = require('./pendingApprovalDispatcher');

module.exports = {
  notifyCompanyAdminsOfLogin,
  notifyCreatorOfApprovalDecision,
  notifyApproversOfPendingRequest
};
