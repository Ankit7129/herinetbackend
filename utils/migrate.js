const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User'); // Assuming your User model is in models/User.js
const Student = require('../models/Student'); // Assuming your Student model is in models/Student.js
const Teacher = require('../models/Teacher'); // Assuming your Teacher model is in models/Teacher.js
const Alumni = require('../models/Alumni'); // Assuming your Alumni model is in models/Alumni.js

// Load environment variables from .env file
dotenv.config();

// MongoDB connection URI (use your MongoDB Atlas URI)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost/herinet'; // Fallback to local MongoDB if not provided in .env

// Connect to MongoDB Atlas
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// Migration function to transfer data
const migrateData = async () => {
  try {
    // Migrate Alumni data
    const alumni = await Alumni.find();
    for (const alum of alumni) {
      const user = new User({
        name: alum.name,
        email: alum.email,
        password: alum.password,
        role: 'alumni',
        profilePicture: alum.profilePicture,
        skills: alum.skills,
        interests: alum.interests,
        bio: alum.bio,
        portfolio: alum.portfolio,
        endorsements: alum.endorsements,
        recommendations: alum.recommendations,
        isVerified: alum.isVerified,
        isAdmin: alum.isAdmin,
      });
      await user.save();
    }

    // Migrate Student data
    const students = await Student.find();
    for (const student of students) {
      const user = new User({
        name: student.name,
        email: student.email,
        password: student.password,
        role: 'student',
        profilePicture: student.profilePicture,
        skills: student.skills,
        interests: student.interests,
        bio: student.bio,
        portfolio: student.portfolio,
        endorsements: student.endorsements,
        recommendations: student.recommendations,
        isVerified: student.isVerified,
        isAdmin: student.isAdmin,
      });
      await user.save();
    }

    // Migrate Teacher data
    const teachers = await Teacher.find();
    for (const teacher of teachers) {
      const user = new User({
        name: teacher.name,
        email: teacher.email,
        password: teacher.password,
        role: 'teacher',
        profilePicture: teacher.profilePicture,
        fieldOfInterest: teacher.fieldOfInterest,
        bio: teacher.bio,
        portfolio: teacher.portfolio,
        endorsements: teacher.endorsements,
        recommendations: teacher.recommendations,
        isVerified: teacher.isVerified,
        isAdmin: teacher.isAdmin,
      });
      await user.save();
    }

    console.log('Migration completed successfully!');
    process.exit(0); // Exit the process after migration is complete
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1); // Exit with error code if migration fails
  }
};

// Run the migration
migrateData();
