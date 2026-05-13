const DOCTOR_COLUMNS = [
  { id: 'id', label: 'Doctor ID', type: 'number', readOnly: true },
  { id: 'alias', label: 'Doctor Name', type: 'text' },
  { id: 'type', label: 'Doctor Type', type: 'text' },
  { id: 'mobile_number', label: 'Mobile Number', type: 'number' },
  { id: 'email', label: 'Email', type: 'email' },
  { id: 'adress', label: 'Address', type: 'text' },
  { id: 'alternate_number', label: 'Alternate Number', type: 'number' }
];

const DOCTOR_TIMINGS_COLUMNS = [
  { id: 'id', label: 'Timing ID', type: 'number', readOnly: true },
  { id: 'day', label: 'Day', type: 'select' },
  { id: 'start_time', label: 'Start Time', type: 'time' },
  { id: 'end_time', label: 'End Time', type: 'time' }
];

module.exports = {
  DOCTOR_COLUMNS,
  DOCTOR_TIMINGS_COLUMNS
};
