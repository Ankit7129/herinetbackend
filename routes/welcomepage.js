const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = express();
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Image Schema
const imageSchema = new mongoose.Schema({
  type: String, // e.g., "logo" or "carousel"
  url: String,
  publicId: String,
});

const Image = mongoose.model("Image", imageSchema);

// Configure Multer for file handling
const storage = multer.memoryStorage();
const upload = multer({ storage });

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

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload_stream(
      { folder: "college_assets", public_id: `college_logo_${Date.now()}` },
      (err, result) => {
        if (err) {
          return res.status(500).json({ message: "Error uploading logo", error: err.message });
        }

        // Save to database
        const logo = new Image({
          type: "logo",
          url: result.secure_url,
          publicId: result.public_id,
        });

        logo.save();

        res.status(200).json({ message: "Logo uploaded successfully", logo: result.secure_url });
      }
    );

    // Pipe the file buffer to Cloudinary
    const readableStream = require("stream").Readable();
    readableStream._read = () => {};
    readableStream.push(file.buffer);
    readableStream.push(null);
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

    // Find and delete the existing logo
    const existingLogo = await Image.findOne({ type: "logo" });
    if (existingLogo) {
      await cloudinary.uploader.destroy(existingLogo.publicId);
      await existingLogo.deleteOne();
    }

    // Upload the new logo
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "college_assets",
      public_id: `college_logo_${Date.now()}`,
    });

    const logo = new Image({
      type: "logo",
      url: result.secure_url,
      publicId: result.public_id,
    });

    await logo.save();

    res.status(200).json({ message: "Logo updated successfully", logo: result.secure_url });
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

    const uploadPromises = files.map((file) => {
      return new Promise((resolve, reject) => {
        const publicId = `carousel_image_${Date.now()}`;
        cloudinary.uploader.upload_stream(
          { folder: "carousel_images", public_id: publicId },
          async (err, result) => {
            if (err) return reject(err);

            const image = new Image({
              type: "carousel",
              url: result.secure_url,
              publicId: result.public_id,
            });

            await image.save();
            resolve(result.secure_url);
          }
        ).end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);
    res.status(200).json({ message: "Carousel images uploaded successfully", images: results });
  } catch (error) {
    res.status(500).json({ message: "Error uploading carousel images", error: error.message });
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

    // Delete existing carousel images
    const existingImages = await Image.find({ type: "carousel" });
    for (const img of existingImages) {
      await cloudinary.uploader.destroy(img.publicId);
      await img.deleteOne();
    }

    // Upload new carousel images
    const uploadPromises = files.map((file) => {
      return new Promise((resolve, reject) => {
        const publicId = `carousel_image_${Date.now()}`;
        cloudinary.uploader.upload_stream(
          { folder: "carousel_images", public_id: publicId },
          async (err, result) => {
            if (err) return reject(err);

            const image = new Image({
              type: "carousel",
              url: result.secure_url,
              publicId: result.public_id,
            });

            await image.save();
            resolve(result.secure_url);
          }
        ).end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);
    res.status(200).json({ message: "Carousel images updated successfully", images: results });
  } catch (error) {
    res.status(500).json({ message: "Error updating carousel images", error: error.message });
  }
});

/**
 * Fetch Uploaded Images
 * Endpoint: GET /api/images
 */
router.get("/images", async (req, res) => {
  try {
    const logo = await Image.findOne({ type: "logo" });
    const carouselImages = await Image.find({ type: "carousel" });

    res.status(200).json({
      logo: logo ? logo.url : null,
      carouselImages: carouselImages.map((img) => img.url),
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching images", error: error.message });
  }
});

module.exports = router;
