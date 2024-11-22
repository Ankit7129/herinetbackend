const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /@heritageit\.edu\.in$/, // Institutional email validation
  },
  password: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  skills: [String],
  interests: [String],
  bio: {
    type: String,
    default: "",
  },
  portfolio: [
    {
      type: String, // URLs or descriptions of projects
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
  // Friends are stored as ObjectIds referencing the User model
  friends: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    select: false,  // Optionally hide the field in queries
    _version: false, // Disable versioning on this field
    default: [] // Ensure this is always initialized as an empty array

  }
});

// Virtual fields for friend requests count
studentSchema.virtual('sentRequestsCount', {
  ref: 'FriendRequest',
  localField: '_id',
  foreignField: 'from',
  count: true
});

studentSchema.virtual('receivedRequestsCount', {
  ref: 'FriendRequest',
  localField: '_id',
  foreignField: 'to',
  count: true
});

// Populate friends with additional details like name, email, profilePicture, and bio
studentSchema.methods.getPopulatedFriends = function() {
  return this.populate({
    path: 'friends',
    select: 'name email profilePicture bio', // Select only the fields you want
  });
};

module.exports = mongoose.model("Student", studentSchema);
