const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Profile = require('../models/Profile');
const User = require('../models/User');
const { authMiddleware } = require('../middlewares/authMiddleware');
const multer = require('multer'); // For handling file uploads
const cloudinary = require('cloudinary').v2; // For Cloudinary integration

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ dest: 'uploads/' }); // Temporary storage for uploaded files

// ===========================
// Route: Get All Profiles
// ===========================
router.get('/profiles', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const profiles = await Profile.find()
      .populate('userId', 'email name college role')
      .skip(skip)
      .limit(limit);

    const totalProfiles = await Profile.countDocuments();

    res.status(200).json({
      profiles,
      currentPage: page,
      totalPages: Math.ceil(totalProfiles / limit),
      totalProfiles,
    });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// ===========================
// Route: Get Specific Profile by userId
// ===========================
// Fetch a detailed profile by userId
router.get('/profile/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    const profile = await Profile.findOne({ userId })
      .populate('userId', 'email name college role') // Fetch user details
      .populate({
        path: 'connections',
        select: 'name profileImageUrl email role', // Fetch details about connections
      })
      .populate({
        path: 'followers',
        select: 'name profileImageUrl email role', // Fetch details about followers
      })
      .populate({
        path: 'following',
        select: 'name profileImageUrl email role', // Fetch details about users being followed
      })
      .populate({
        path: 'posts',
        select: 'title content createdAt likes comments', // Fetch detailed post data
      })
      .populate({
        path: 'projects',
        select: 'title description status createdAt', // Fetch detailed project data
      });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});


// ===========================
// Route: Fetch My Profile (Authenticated User)
// ===========================
router.get('/my-profile', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id; // Extracted from the JWT token
  
      // Fetch the profile linked to the authenticated user
      const profile = await Profile.findOne({ userId })
        .populate('userId', 'email name college role')
        .populate('connections', 'name profileImageUrl')
        .populate('followers', 'name profileImageUrl')
        .populate('following', 'name profileImageUrl')
        .populate('posts', 'title content createdAt');
  
      if (!profile) {
        return res.status(404).json({ message: 'Profile not found' });
      }
  
      res.status(200).json(profile);
    } catch (error) {
      console.error('Error fetching my profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  
// ===========================
// Route: Update Profile
// ===========================
router.put('/update', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Update only the provided fields
    Object.keys(updates).forEach(key => {
      profile[key] = updates[key];
    });

    await profile.save();
    res.status(200).json({ message: 'Profile updated successfully', profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ===========================
// Route: Upload Profile Picture
// ===========================
router.post('/upload-picture', authMiddleware, upload.single('profilePicture'), async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);

    const profile = await Profile.findOneAndUpdate(
      { userId },
      { profileImageUrl: result.secure_url },
      { new: true }
    );

    res.status(200).json({
      message: 'Profile picture uploaded successfully',
      profilePicture: result.secure_url,
      profile,
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// ===========================
// Route: Delete Profile
// ===========================
router.delete('/delete', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await Profile.findOneAndDelete({ userId });
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Optionally, delete the user account
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

module.exports = router;
