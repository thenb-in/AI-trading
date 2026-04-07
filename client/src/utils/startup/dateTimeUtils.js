// Get current date and time in datetime-local format
const getCurrentDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDate = (date_str) => {
  const date = new Date(date_str);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Convert local datetime to ISO string (no timezone conversion needed)
const convertToISOString = (localDateTime) => {
  if (!localDateTime) return null;
  
  // Create a Date object from the local datetime string
  const date = new Date(localDateTime);
  
  // Return as ISO string (database will handle timezone)
  return date.toISOString();
};

// Calculate duration in minutes between start and end times
const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '';
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  return Math.max(0, Math.round(diffMs / 60000)); // Convert to minutes
};

// Calculate end time based on start time and duration
const calculateEndTime = (startTime, durationMinutes) => {
  if (!startTime || !durationMinutes) return '';
  
  // Parse the start time string to get date components
  const [datePart, timePart] = startTime.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  // Create a new date object with the start time
  const startDate = new Date(year, month - 1, day, hours, minutes);
  
  // Add the duration in minutes
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  
  // Format back to datetime-local format
  const endYear = endDate.getFullYear();
  const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
  const endDay = String(endDate.getDate()).padStart(2, '0');
  const endHours = String(endDate.getHours()).padStart(2, '0');
  const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
  
  return `${endYear}-${endMonth}-${endDay}T${endHours}:${endMinutes}`;
};

// Format duration display (show hours and minutes if > 60)
const formatDurationDisplay = (minutes) => {
  if (!minutes || minutes <= 0) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
};

// Parse duration input (handle "1 hr 40 min" format)
const parseDurationInput = (input) => {
  if (!input) return '';
  // If it's just a number, return as is
  if (/^\d+$/.test(input)) return parseInt(input);
  
  // Parse "X hr Y min" format
  const hourMatch = input.match(/(\d+)\s*hr/);
  const minuteMatch = input.match(/(\d+)\s*min/);
  
  const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
  
  return hours * 60 + minutes;
};

const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

const formatLastActive = (lastActive) => {
  if (!lastActive) return "N/A";

  const date = new Date(lastActive);

  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  };

  const formattedDate = date.toLocaleString('en-US', options);

  // Use UTC methods to get hours and minutes
  let hours = date.getUTCHours() % 12 || 12;
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const ampm = date.getUTCHours() >= 12 ? 'PM' : 'AM';

  return `${formattedDate} at ${hours}:${minutes} ${ampm}`;
};

// Parse date value from various formats to Date object
// Supports: Date objects, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY formats
const parseDateValue = (dateValue) => {
  if (!dateValue) return null;
  
  try {
    // If it's already a Date object
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }
    
    // If it's a string, try to parse it
    if (typeof dateValue === "string") {
      const dateStr = dateValue.trim();
      if (!dateStr) return null;
      
      // Try parsing as ISO date first
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
      
      // Try YYYY-MM-DD format
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
      }
      
      // Try DD-MM-YYYY or DD/MM/YYYY format
      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        const parsed = new Date(`${year}-${month}-${day}`);
        return isNaN(parsed.getTime()) ? null : parsed;
      }
    }
  } catch (error) {
    console.log(`parseDateValue error: ${error}`);
    return null;
  }
  
  return null;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDatePart = (date) =>
  `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

// Format date for display in readable format: "2 Jan 2025"
const formatDateForDisplay = (dateValue) => {
  if (!dateValue) return "-";
  const date = parseDateValue(dateValue);
  if (!date) return "-";
  try {
    return formatDatePart(date);
  } catch (error) {
    console.log(`formatDateForDisplay ${error}`);
    return "-";
  }
};

// Format datetime for display in readable format: "2 Jan 2025 10:30:45" (date in readable format, time in HH:MM:SS)
const formatDateTimeForDisplay = (dateValue) => {
  if (!dateValue) return "-";
  const date = parseDateValue(dateValue);
  if (!date) return "-";
  try {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${formatDatePart(date)} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.log(`formatDateTimeForDisplay ${error}`);
    return "-";
  }
};

export { getCurrentDateTime, formatDate, convertToISOString, calculateDuration, calculateEndTime, formatDurationDisplay, parseDurationInput, formatDateTime, formatLastActive, parseDateValue, formatDateForDisplay, formatDateTimeForDisplay };
