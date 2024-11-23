const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bio: { type: String, default: '' },
  profileImageUrl: { type: String, default: '' },
  educationalBackground: [
    {
      institution: { type: String, required: true },
      degree: { type: String },
      fieldOfStudy: { type: String },
      graduationYear: { type: Number }
    }
  ],
  professionalExperience: [
    {
      jobTitle: { type: String, required: true },
      company: { type: String, required: true },
      startYear: { type: Number, required: true },
      endYear: { type: Number },
      description: { type: String }
    }
  ],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],

  achievements: [
    {
      title: { type: String, required: true },
      description: { type: String },
      link: { type: String }
    }
  ],
  hobbies: { type: [String], default: [] },
  certifications: [
    {
      title: { type: String, required: true },
      issuedBy: { type: String },
      year: { type: Number }
    }
  ],
  skills: { type: [String], default: [] },
  
  // New fields for connections and followers
  connectionRequests: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    }
  ],
  connections: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // List of accepted connections
  ],
  followers: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Users who follow but are not necessarily connected
  ],
  following: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Users whom this user is following
  ],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Profile = mongoose.model('Profile', ProfileSchema);
module.exports = Profile;
