const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, uploadProfilePicture, deleteProfile } = require('../controllers/profileController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const multer = require('multer'); // For file upload

const upload = multer({ dest: 'uploads/' }); // Use a directory for temporary file storage

// Route to get the profile (protected by JWT)
router.get('/profiles', authMiddleware, getProfile);

// Route to update the profile (protected by JWT)
router.put('/update', authMiddleware, updateProfile);

// Route to upload profile picture (protected by JWT)
router.post('/upload-picture', authMiddleware, upload.single('profilePicture'), uploadProfilePicture);

// Route to delete the profile (protected by JWT)
router.delete('/delete', authMiddleware, deleteProfile);

module.exports = router;
