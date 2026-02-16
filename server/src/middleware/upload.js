const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { ALLOWED_FILE_EXTENSIONS } = require('../constants/file_uploads');

const uploadDir = path.join(__dirname, '../uploads'); // Adjust path if needed

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Check if upload directory exists, if not create it
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Only ${ALLOWED_FILE_EXTENSIONS.join(', ')} files are allowed for ${file.originalname}`), false);
  }
};

module.exports = multer({ storage, fileFilter });
