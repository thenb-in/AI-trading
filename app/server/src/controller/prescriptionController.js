const { listPrescriptions, getPrescriptionById } = require('../service/prescriptionService/listPrescriptions');
const { createPrescription } = require('../service/prescriptionService/createPrescription');
const { updatePrescription } = require('../service/prescriptionService/updatePrescription');
const { deletePrescription } = require('../service/prescriptionService/deletePrescription');
const { PRESCRIPTION_COLUMNS } = require('../column/prescription');

const getAllPrescriptions = async (companyId) => {
  const prescriptions = await listPrescriptions(companyId);
  return { prescriptions, columns: PRESCRIPTION_COLUMNS };
};

const getPrescriptionByIdController = async (prescriptionId, companyId) => {
  return await getPrescriptionById(prescriptionId, companyId);
};

const createPrescriptionController = async (prescriptionData, companyId, userId) => {
  return await createPrescription(prescriptionData, companyId, userId);
};

const updatePrescriptionController = async (prescriptionId, prescriptionData, companyId, userId) => {
  return await updatePrescription(prescriptionId, prescriptionData, companyId, userId);
};

const deletePrescriptionController = async (prescriptionId, companyId) => {
  return await deletePrescription(prescriptionId, companyId);
};

module.exports = {
  getAllPrescriptions,
  getPrescriptionByIdController,
  createPrescriptionController,
  updatePrescriptionController,
  deletePrescriptionController
};
