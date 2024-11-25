const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer for file handling
const storage = multer.memoryStorage();
const upload = multer({ storage });

// In-memory storage for image metadata (replace with a database in production)
let uploadedImages = [];
let logoImage = null;

/**
 * Upload College Logo
 * Endpoint: POST /api/upload-logo
 * Form-data Key: logo
 */
router.post("/upload-logo", upload.single("logo"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await cloudinary.uploader.upload_stream(
      { folder: "college_assets", public_id: "college_logo" },
      (err, result) => {
        if (err) {
          res.status(500).json({ message: "Error uploading logo", error: err.message });
        } else {
          logoImage = result.secure_url;
          res.status(200).json({ message: "Logo uploaded successfully", logo: logoImage });
        }
      }
    );

    // Create a readable stream from the file buffer and pipe it to Cloudinary
    const readableStream = require("stream").Readable();
    readableStream._read = () => {}; // No-op
    readableStream.push(file.buffer);
    readableStream.push(null); // Signal the end of the stream
    readableStream.pipe(result);
  } catch (error) {
    res.status(500).json({ message: "Error uploading logo", error: error.message });
  }
});

/**
 * Update College Logo
 * Endpoint: PUT /api/update-logo
 * Form-data Key: logo
 */
router.put("/update-logo", upload.single("logo"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload the new logo to Cloudinary with the same public_id to overwrite it
    const result = await cloudinary.uploader.upload_stream(
      { folder: "college_assets", public_id: "college_logo" },
      (err, result) => {
        if (err) {
          res.status(500).json({ message: "Error updating logo", error: err.message });
        } else {
          logoImage = result.secure_url;
          res.status(200).json({ message: "Logo updated successfully", logo: logoImage });
        }
      }
    );

    // Create a readable stream from the file buffer and pipe it to Cloudinary
    const readableStream = require("stream").Readable();
    readableStream._read = () => {}; // No-op
    readableStream.push(file.buffer);
    readableStream.push(null); // Signal the end of the stream
    readableStream.pipe(result);
  } catch (error) {
    res.status(500).json({ message: "Error updating logo", error: error.message });
  }
});

/**
 * Upload Carousel Images
 * Endpoint: POST /api/upload-carousel
 * Form-data Key: images (multiple files)
 */
router.post("/upload-carousel", upload.array("images", 10), async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadPromises = files.map((file, index) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "carousel_images", public_id: `carousel_image_${index}` },
          (err, result) => {
            if (err) reject(err);
            else resolve(result.secure_url);
          }
        );

        const readableStream = require("stream").Readable();
        readableStream._read = () => {}; // No-op
        readableStream.push(file.buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
      });
    });

    const results = await Promise.all(uploadPromises);
    uploadedImages = results;

    res.status(200).json({ message: "Carousel images uploaded successfully", images: uploadedImages });
  } catch (error) {
    res.status(500).json({ message: "Error uploading images", error: error.message });
  }
});

/**
 * Update Carousel Images
 * Endpoint: PUT /api/update-carousel
 * Form-data Key: images (multiple files)
 */
router.put("/update-carousel", upload.array("images", 10), async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const uploadPromises = files.map((file, index) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "carousel_images", public_id: `carousel_image_${index}` },
          (err, result) => {
            if (err) reject(err);
            else resolve(result.secure_url);
          }
        );

        const readableStream = require("stream").Readable();
        readableStream._read = () => {}; // No-op
        readableStream.push(file.buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
      });
    });

    const results = await Promise.all(uploadPromises);
    uploadedImages = results;

    res.status(200).json({ message: "Carousel images updated successfully", images: uploadedImages });
  } catch (error) {
    res.status(500).json({ message: "Error updating carousel images", error: error.message });
  }
});

/**
 * Fetch Uploaded Images
 * Endpoint: GET /api/images
 */
router.get("/images", (req, res) => {
  res.status(200).json({
    logo: logoImage,
    carouselImages: uploadedImages,
  });
});

module.exports = router;
