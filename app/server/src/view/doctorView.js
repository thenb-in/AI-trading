const logger = require('@startup/logger');
const doctorController = require('../../controller/doctorController');
const { sendSuccess, sendError } = require('@startup/src/utils/response');
const { HTTP_STATUS_OK, HTTP_STATUS_CREATED, HTTP_STATUS_INTERNAL_ERROR } = require('@startup/src/constants/http');

async function getAllDoctorsView(req, res) {
  try {
    const { companyId } = req.user;
    const doctors = await doctorController.getAllDoctors(companyId);
    return sendSuccess(res, {
      statusCode: HTTP_STATUS_OK,
      data: doctors,
      message: `Doctors retrieved successfully. Records: ${doctors.length}.`
    });
  } catch (error) {
    logger.error(`Error fetching doctors. ${error.message}`, error);
    return sendError(res, {
      statusCode: HTTP_STATUS_INTERNAL_ERROR,
      message: `Failed to fetch doctors. ${error.message}`
    });
  }
}

async function getDoctorByIdView(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const doctor = await doctorController.getDoctorByIdController(id, companyId);
    return sendSuccess(res, {
      statusCode: HTTP_STATUS_OK,
      data: doctor,
      message: `Doctor retrieved successfully. id: ${id}.`
    });
  } catch (error) {
    logger.error(`Error fetching doctor. ${error.message}`, error);
    return sendError(res, {
      statusCode: HTTP_STATUS_INTERNAL_ERROR,
      message: `Failed to fetch doctor. ${error.message}`
    });
  }
}

async function createDoctorView(req, res) {
  try {
    const { companyId } = req.user;
    const { doctorData, timingsArray } = req.body;
    const doctor = await doctorController.createDoctorController(doctorData, timingsArray, companyId);
    return sendSuccess(res, {
      statusCode: HTTP_STATUS_CREATED,
      data: doctor,
      message: `Doctor created successfully. id: ${doctor.id}.`
    });
  } catch (error) {
    logger.error(`Error creating doctor. ${error.message}`, error);
    return sendError(res, {
      statusCode: HTTP_STATUS_INTERNAL_ERROR,
      message: `Failed to create doctor. ${error.message}`
    });
  }
}

async function updateDoctorView(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { doctorData, timingsArray } = req.body;
    const doctor = await doctorController.updateDoctorController(id, doctorData, timingsArray, companyId);
    return sendSuccess(res, {
      statusCode: HTTP_STATUS_OK,
      data: doctor,
      message: `Doctor updated successfully. id: ${id}.`
    });
  } catch (error) {
    logger.error(`Error updating doctor. ${error.message}`, error);
    return sendError(res, {
      statusCode: HTTP_STATUS_INTERNAL_ERROR,
      message: `Failed to update doctor. ${error.message}`
    });
  }
}

async function deleteDoctorView(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const result = await doctorController.deleteDoctorController(id, companyId);
    return sendSuccess(res, {
      statusCode: HTTP_STATUS_OK,
      data: result,
      message: `Doctor deleted successfully. id: ${id}.`
    });
  } catch (error) {
    logger.error(`Error deleting doctor. ${error.message}`, error);
    const statusCode = error.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : HTTP_STATUS_INTERNAL_ERROR;
    return sendError(res, {
      statusCode,
      message: `Failed to delete doctor. ${error.message}`
    });
  }
}

async function deleteDoctorTimingView(req, res) {
  try {
    const { companyId } = req.user;
    const { doctorId, timingId } = req.params;
    const result = await doctorController.deleteDoctorTimingsController(timingId, doctorId, companyId);
    return sendSuccess(res, {
      statusCode: HTTP_STATUS_OK,
      data: result,
      message: `Doctor timing deleted successfully. timingId: ${timingId}.`
    });
  } catch (error) {
    logger.error(`Error deleting doctor timing. ${error.message}`, error);
    const statusCode = error.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : HTTP_STATUS_INTERNAL_ERROR;
    return sendError(res, {
      statusCode,
      message: `Failed to delete doctor timing. ${error.message}`
    });
  }
}

module.exports = {
  getAllDoctorsView,
  getDoctorByIdView,
  createDoctorView,
  updateDoctorView,
  deleteDoctorView,
  deleteDoctorTimingView
};
