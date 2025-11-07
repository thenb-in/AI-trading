/**
 * Cleans form data by trimming all fields and removing spaces from username and password fields
 * @param {Object} formData - The form data object to clean
 * @returns {Object} - The cleaned form data object
 */
export const cleanFormData = (formData) => {
  const cleaned = {};

  // Fields that should have all spaces removed (not just trimmed)
  const spaceRemovalFields = ['username', 'password', 'confirmPassword', 'newPassword', 'phone'];

  Object.keys(formData).forEach((key) => {
    const value = formData[key];

    // Handle null/undefined values
    if (value === null || value === undefined) {
      cleaned[key] = value;
      return;
    }

    // If it's a string, process it
    if (typeof value === 'string') {
      // Trim all fields
      let cleanedValue = value.trim();

      // Remove all spaces from username, password, and phone fields
      if (spaceRemovalFields.includes(key)) {
        cleanedValue = cleanedValue.replace(/\s+/g, '');
      }

      // Convert username to lowercase
      if (key === 'username') {
        cleanedValue = cleanedValue.toLowerCase();
      }

      cleaned[key] = cleanedValue;
    } else {
      // For non-string values (like role ID), keep as is or trim if it has a toString method
      cleaned[key] = value;
    }
  });

  return cleaned;
};

