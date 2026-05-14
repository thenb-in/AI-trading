const logger = require('@startup/logger');
const prescriptionController = require('../../controller/prescriptionController');
const { sendSuccess, sendError } = require('@startup/src/utils/response');
const { HTTP_STATUS_OK, HTTP_STATUS_CREATED, HTTP_STATUS_INTERNAL_ERROR } = require('@startup/src/constants/http');

async function getAllPrescriptionsView(req, res) {
  try {
    const { companyId } = req.user;
    const { prescriptions, columns } = await prescriptionController.getAllPrescriptions(companyId);
    return sendSuccess(res, {
      statusCode: HTTP_STATUS_OK,
      data: { prescriptions, columns },
      message: `Prescriptions retrieved successfully. Records: ${prescriptions.length}.`
    });
  } catch (error) {
    logger.error(`Error fetching prescriptions. ${error.message}`, error);
    return sendError(res, {
      statusCode: HTTP_STATUS_INTERNAL_ERROR,
      message: `Failed to fetch prescriptions. ${error.message}`
    });
  }
}

async function getPrescriptionByIdView(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prescription = await prescriptionController.getPrescriptionByIdController(id, companyId);
    return sendSuccess(res, {
      statusCode: HTTP_STATUS_OK,
      data: prescription,
      message: `Prescription retrieved successfully. id: ${id}.`
    });
  } catch (error) {
    logger.error(`Error fetching prescription. ${error.message}`, error);
    return sendError(res, {
      statusCode: HTTP_STATUS_INTERNAL_ERROR,
      message: `Failed to fetch prescription. ${error.message}`
    });
  }
}

async function createPrescriptionView(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const prescriptionData = req.body;
    const prescription = await prescriptionController.createPrescriptionController(prescriptionData, companyId, userId);
    return sendSuccess(res, {
      statusCode: HTTP_STATUS_CREATED,
      data: prescription,
      message: `Prescription created successfully. id: ${prescription.id}.`
    });
  } catch (error) {
    logger.error(`Error creating prescription. ${error.message}`, error);
    return sendError(res, {
      statusCode: HTTP_STATUS_INTERNAL_ERROR,
      message: `Failed to create prescription. ${error.message}`
    });
  }
}

async function updatePrescriptionView(req, res) {
  try {
    const { companyId, id: userId } = req.user;
    const { id } = req.params;
    const prescriptionData = req.body;
    const prescription = await prescriptionController.updatePrescriptionController(id, prescriptionData, companyId, userId);
    return sendSuccess(res, {
      statusCode: HTTP_STATUS_OK,
      data: prescription,
      message: `Prescription updated successfully. id: ${id}.`
    });
  } catch (error) {
    logger.error(`Error updating prescription. ${error.message}`, error);
    return sendError(res, {
      statusCode: HTTP_STATUS_INTERNAL_ERROR,
      message: `Failed to update prescription. ${error.message}`
    });
  }
}

async function deletePrescriptionView(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const result = await prescriptionController.deletePrescriptionController(id, companyId);
    return sendSuccess(res, {
      statusCode: HTTP_STATUS_OK,
      data: result,
      message: `Prescription deleted successfully. id: ${id}.`
    });
  } catch (error) {
    logger.error(`Error deleting prescription. ${error.message}`, error);
    const statusCode = error.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : HTTP_STATUS_INTERNAL_ERROR;
    return sendError(res, {
      statusCode,
      message: `Failed to delete prescription. ${error.message}`
    });
  }
}

module.exports = {
  getAllPrescriptionsView,
  getPrescriptionByIdView,
  createPrescriptionView,
  updatePrescriptionView,
  deletePrescriptionView
};
