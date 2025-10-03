const path = require("path");
const multer = require("multer");

const fs = require("fs");
// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = "uploads/events";

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp_originalname
    const uniqueSuffix = Date.now() + "_" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    const fileName = file.fieldname + "_" + uniqueSuffix + fileExtension;
    cb(null, fileName);
  },
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10, // Maximum 10 images per property
  },
});

// Middleware for handling multiple image uploads
exports.uploadPropertyImages = upload;
