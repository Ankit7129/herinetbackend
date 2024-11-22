const Profile = require('../models/Profile');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2; // Cloudinary for image uploads


// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Your Cloudinary Cloud Name
  api_key: process.env.CLOUDINARY_API_KEY,      // Your Cloudinary API Key
  api_secret: process.env.CLOUDINARY_API_SECRET // Your Cloudinary API Secret
});

// Function to get a user's profile along with details from the User schema
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Using req.user.id from the JWT token

    // Fetch profile data along with User data (email, name, college)
    const profile = await Profile.findOne({ userId }).populate('userId', 'email name college');

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Function to update a user's profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Accessing the user ID from JWT

    const {
      bio,
      educationalBackground,
      professionalExperience,
      achievements,
      hobbies,
      certifications,
      skills,
    } = req.body;

    // Fetch the user's existing profile
    let profile = await Profile.findOne({ userId });

    if (profile) {
      // Update the existing profile fields if new data is provided
      profile.bio = bio || profile.bio;
      profile.educationalBackground = educationalBackground || profile.educationalBackground;
      profile.professionalExperience = professionalExperience || profile.professionalExperience;
      profile.achievements = achievements || profile.achievements;
      profile.hobbies = hobbies || profile.hobbies;
      profile.certifications = certifications || profile.certifications;
      profile.skills = skills || profile.skills;
      profile.updatedAt = Date.now(); // Set the update timestamp
    } else {
      // If no profile exists, create a new one
      profile = new Profile({
        userId,
        bio,
        educationalBackground,
        professionalExperience,
        achievements,
        hobbies,
        certifications,
        skills,
      });
    }

    await profile.save(); // Save the profile
    res.status(200).json({ message: 'Profile updated successfully', profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Function to upload profile picture
const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id; // Accessing userId from JWT token

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload the image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);

    // Fetch the existing profile
    let profile = await Profile.findOne({ userId });

    if (profile) {
      // Update the profile picture in the profile document
      profile.profileImageUrl = result.secure_url;
      profile.updatedAt = Date.now(); // Set update timestamp
    } else {
      // Create a new profile if none exists
      profile = new Profile({ userId, profileImageUrl: result.secure_url, });
    }

    await profile.save(); // Save the updated profile with the new picture
    res.status(200).json({
      message: 'Profile picture uploaded successfully',
      profilePicture: result.secure_url,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
};

// Function to delete profile
const deleteProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Accessing userId from JWT token

    // Delete the profile from the Profile collection
    const profile = await Profile.findOneAndDelete({ userId });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Optionally, you may also want to delete the user's document in the User model
    // const user = await User.findByIdAndDelete(userId);

    res.status(200).json({ message: 'Profile deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePicture,
  deleteProfile,
};
