const mongoose = require('mongoose');

// Predefined college list
const predefinedColleges = [
  "Heritage Institute of Technology",
  "Heritage Business School",
  "The Heritage Academy",
  "Heritage Law College",
  "The Heritage College",
  "Other"
];

// Define User Schema
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    //match: /^[a-zA-Z0-9._%+-]+@heritage\.(student|faculty|alumni)\.in$/ // Uncomment for specific email domain validation
  },
  role: {
    type: String,
    enum: ["Student", "Faculty", "Alumni", "Admin"],
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false // Manually set during promotions
  },
  college: {
    type: String,
    enum: predefinedColleges,
    required: true
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    required: true
  },
  password: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false // To track user verification
  },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexing
UserSchema.index({ email: 1 }); // Index email for faster lookups

const User = mongoose.model("User", UserSchema);
module.exports = {
  User: mongoose.model('User', UserSchema),
  predefinedColleges, // Export predefinedColleges
};
module.exports = User;
