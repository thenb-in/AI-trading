const { listDoctors, getDoctorById } = require('../service/doctorService/listDoctors');
const { createDoctor } = require('../service/doctorService/createDoctor');
const { updateDoctor } = require('../service/doctorService/updateDoctor');
const { deleteDoctor, deleteDoctorTimings } = require('../service/doctorService/deleteDoctor');
const { DOCTOR_COLUMNS, DOCTOR_TIMINGS_COLUMNS } = require('../column/doctor');

const getAllDoctors = async (companyId) => {
  const doctors = await listDoctors(companyId);
  return { doctors, columns: DOCTOR_COLUMNS };
};

const getDoctorByIdController = async (doctorId, companyId) => {
  return await getDoctorById(doctorId, companyId);
};

const createDoctorController = async (doctorData, timingsArray, companyId) => {
  return await createDoctor(doctorData, timingsArray, companyId);
};

const updateDoctorController = async (doctorId, doctorData, timingsArray, companyId) => {
  return await updateDoctor(doctorId, doctorData, timingsArray, companyId);
};

const deleteDoctorController = async (doctorId, companyId) => {
  return await deleteDoctor(doctorId, companyId);
};

const deleteDoctorTimingsController = async (timingId, doctorId, companyId) => {
  return await deleteDoctorTimings(timingId, doctorId, companyId);
};

module.exports = {
  getAllDoctors,
  getDoctorByIdController,
  createDoctorController,
  updateDoctorController,
  deleteDoctorController,
  deleteDoctorTimingsController
};
