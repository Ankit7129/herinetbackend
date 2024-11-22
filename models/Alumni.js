const mongoose = require("mongoose");

const alumniSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /@heritage\.edu$/, // Institutional email validation
  },
  password: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    required: true,
  },
  graduationYear: {
    type: Number,
    required: true,
  },
  currentPosition: String,
  skills: [String],
  interests: [String],
  bio: {
    type: String,
    default: "",
  },
  portfolio: [
    {
      type: String, // URLs or descriptions of work or achievements
    },
  ],
  endorsements: [String], // Skill names
  recommendations: [
    {
      from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      message: String,
    },
  ],
  profilePicture: {
    type: String,
    default: "default-avatar.png",
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Alumni", alumniSchema);
