const mongoose = require("mongoose");

// Predefined interests list (universal)
const predefinedInterests = [
  "Leadership", "Research", "Entrepreneurship",
  "Programming", "AI", "Data Science", "Cybersecurity", "Robotics",
  "Human Rights", "Corporate Law", "Criminal Justice",
  "Marketing", "Finance", "Business Strategy",
  "Public Health", "Medicine", "Biotech",
  "UI/UX", "Graphic Design", "Architecture",
  "Physics", "Chemistry", "Biology",
  "Sports", "Music", "Arts", "Photography", "Writing",
  "Traveling", "Volunteering", "Other" // "Other" allows manual entry
];

// Predefined college list
const predefinedColleges = [
  "Heritage Law College",
  "Heritage Technology College",
  "Heritage Business Academy",
  "Heritage Arts & Humanities College",
  "Heritage Medical College",
  "Heritage School of Architecture",
  "Other"
];

// Schema for educational background entries
const EducationSchema = new mongoose.Schema({
  degree: { type: String, trim: true, required: true },
  fieldOfStudy: { type: String, trim: true, required: true },
  institutionName: { type: String, trim: true, required: true },
  graduationYear: { type: Number, required: true }
});

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
   //match: /^[a-zA-Z0-9._%+-]+@heritage\.(student|faculty|alumni)\.in$/
  },
  role: {
    type: String,
    enum: ["Student", "Faculty", "Alumni", "Admin"],
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false // Only manually set during promotions
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
  interests: {
    predefined: { type: [String], enum: predefinedInterests, default: [] },
    custom: { type: [String], default: [] } // Custom interests entered manually
  },
  educationalBackground: [EducationSchema], // Allow multiple entries for education
  portfolioLinks: {
    linkedin: { type: String, trim: true },
    github: { type: String, trim: true },
    portfolioWebsite: { type: String, trim: true },
    twitter: { type: String, trim: true },
    email: { type: String, trim: true }
  },
  password: {
    type: String,
    required: true
  },
  isVerified: { // New field added to track user verification
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
