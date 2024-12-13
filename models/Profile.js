const mongoose = require('mongoose');

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

// Define Profile Schema
const ProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },


  // Personal Information
  name: { type: String, ref: "User", required: true,  },

  bio: { type: String, trim: true, default: '' },
  profileImageUrl: { type: String, trim: true, default: '' },
  hobbies: { type: [String], default: [] },

  // Interests (Moved from User model)
  interests: {
    predefined: { type: [String], enum: predefinedInterests, default: [] },
    custom: { type: [String], default: [] } // Custom interests entered manually
  },

  // Educational Background
  educationalBackground: [
    {
      institution: { type: String, required: true },
      degree: { type: String },
      fieldOfStudy: { type: String },
      graduationYear: { type: Number },
    }
  ],

  // Professional Experience
  professionalExperience: [
    {
      jobTitle: { type: String, required: true },
      company: { type: String, required: true },
      startYear: { type: Number, required: true },
      endYear: { type: Number },
      description: { type: String, trim: true },
    }
  ],

  // Achievements and Certifications
  achievements: [
    {
      title: { type: String, required: true },
      description: { type: String },
      link: { type: String },
    }
  ],
  certifications: [
    {
      title: { type: String, required: true },
      issuedBy: { type: String },
      year: { type: Number },
    }
  ],

  // Skills
  skills: [
    {
      name: { type: String, required: true },
      level: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], default: "Beginner" },
    }
  ],
// Post-Related Data Integration
posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }], // User's authored posts
likedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }], // Posts liked by the user
savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }], // Posts saved by the user

// Engagement Metrics
engagement: {
  totalLikesReceived: { type: Number, default: 0 },
  totalSharesReceived: { type: Number, default: 0 },
  totalCommentsReceived: { type: Number, default: 0 }
},

// Projects Involvement
projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }], // Projects the user has joined or created

  // Social Features
  connectionRequests: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    }
  ],
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // Messages
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],

  // Privacy and Preferences
  visibility: { type: String, enum: ["Public", "Private", "Connections Only"], default: "Public" },
  preferredPostCategories: { type: [String], enum: ["Announcement", "Discussion", "Idea", "Event", "Achievement", "Help Request"], default: [] },
  preferredProjectCategories: { type: [String], enum: ["Tech", "Business", "Design", "Research", "Startup", "Volunteering"], default: [] },
  
  // Portfolio Links
  portfolioLinks: {
    linkedin: { type: String, trim: true },
    github: { type: String, trim: true },
    portfolioWebsite: { type: String, trim: true },
    twitter: { type: String, trim: true }
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save middleware to update the `updatedAt` field
ProfileSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual to fetch user name and email from the User model
ProfileSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Indexes for optimization
ProfileSchema.index({ userId: 1 });
ProfileSchema.index({ connections: 1 });
ProfileSchema.index({ followers: 1 });
ProfileSchema.index({ 'educationalBackground.institution': 1 });
ProfileSchema.index({ 'skills.name': 1 });

const Profile = mongoose.model('Profile', ProfileSchema);
module.exports = Profile;
