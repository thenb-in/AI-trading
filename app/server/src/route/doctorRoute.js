const express = require('express');
const router = express.Router();

const { protect } = require('@startup/src/middleware/authMiddleware');
const requirePermission = require('@startup/src/middleware/requirePermission');

const {
  validateCreateDoctor,
  validateUpdateDoctor,
  validateGetDoctorById,
  validateDeleteDoctor,
  validateDeleteDoctorTiming,
  handleValidationErrors
} = require('../validator/doctorValidation');

const {
  getAllDoctorsView,
  getDoctorByIdView,
  createDoctorView,
  updateDoctorView,
  deleteDoctorView,
  deleteDoctorTimingView
} = require('../view/doctorView');

const { MASTER_PERMISSION_CONSTANTS } = require('@startup/server/src/constants/permissions');
const { DOCTOR } = MASTER_PERMISSION_CONSTANTS;

/**
 * GET /doctor
 * Get all doctors for the company
 */
router.get(
  '/',
  protect,
  requirePermission(DOCTOR.read.name),
  getAllDoctorsView
);

/**
 * GET /doctor/:id
 * Get a specific doctor by ID
 */
router.get(
  '/:id',
  protect,
  requirePermission(DOCTOR.read.name),
  validateGetDoctorById,
  handleValidationErrors,
  getDoctorByIdView
);

/**
 * POST /doctor
 * Create a new doctor
 */
router.post(
  '/',
  protect,
  requirePermission(DOCTOR.create.name),
  validateCreateDoctor,
  handleValidationErrors,
  createDoctorView
);

/**
 * PUT /doctor/:id
 * Update an existing doctor
 */
router.put(
  '/:id',
  protect,
  requirePermission(DOCTOR.update.name),
  validateUpdateDoctor,
  handleValidationErrors,
  updateDoctorView
);

/**
 * DELETE /doctor/:id
 * Delete a doctor
 */
router.delete(
  '/:id',
  protect,
  requirePermission(DOCTOR.delete.name),
  validateDeleteDoctor,
  handleValidationErrors,
  deleteDoctorView
);

/**
 * DELETE /doctor/:doctorId/timing/:timingId
 * Delete a specific doctor timing
 */
router.delete(
  '/:doctorId/timing/:timingId',
  protect,
  requirePermission(DOCTOR.delete.name),
  validateDeleteDoctorTiming,
  handleValidationErrors,
  deleteDoctorTimingView
);

module.exports = router;
