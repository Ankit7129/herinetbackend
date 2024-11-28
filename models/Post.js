const mongoose = require('mongoose');
const { predefinedColleges } = require('./User'); // Adjust the path as necessary

// Define Post Schema
const PostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Refers to the User model
  content: { type: String, required: true, trim: true }, // Content of the post
  media: { 
    type: [{ url: String, type: { type: String, enum: ["image", "video"] } }], // Array of media objects
    default: [] 
  },
  category: {
    type: String,
    enum: ["Announcement", "Discussion", "Idea", "Event", "Achievement", "Help Request", "Tech Projects", "Business and Management", "Design and Creativity", "Research and Academia", "Startup Ideas", "Volunteering and Outreach"], // Added Project Categories
    required: true
  },
  
  
  tags: { type: [String], default: [] }, // Optional tags for discoverability
  
  isProject: { type: Boolean, default: false },  // New field to differentiate posts

  projectDetails: {
    title: {
      type: String,
      required: function () { return this.isProject; } // Required if isProject is true
    },
    description: {
      type: String,
      required: function () { return this.isProject; } // Required if isProject is true
    },
    skillsRequired: {
      type: [String],
      required: function () { return this.isProject; } // Required if isProject is true
    },
    estimatedDuration: {
      type: String,
      required: function () { return this.isProject; } // Required if isProject is true
    },
    teamSize: { type: Number, default: 1 }, // Optional
    attachments: {
      type: [{ url: String, type: { type: String, enum: ["image", "video"] } }],
      default: [] // Optional
    },
    visibility: { 
      type: String, 
      enum: ["Public", "Connections Only", "Custom"], 
      default: "Public" 
    },
    visibilityFilters: {
      role: { 
        type: [String], 
        enum: ["Student", "Faculty", "Alumni", "Admin"], 
        default: [] 
      },
      institution: { 
        type: [String], 
        enum: predefinedColleges, 
        default: [] 
      }
    },
    joinRequests: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, default: mongoose.Types.ObjectId },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'approved', 'denied', 'removed'] },
        requestTime: { type: Date, default: Date.now },
        removalTime: { type: Date }
      }
    ],
    teamFormed: { type: Boolean, default: false },
    teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    groupChatLink: { type: String },
    taskDashboardLink: { type: String }
  },
  
  likes: [{ liker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }], // Array of users who liked the post
  comments: [
    {
      commenter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // User who commented
      content: { type: String, required: true }, // Content of the comment
      createdAt: { type: Date, default: Date.now } // Timestamp for the comment
    }
  ],
  saves: [{ by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }], // Users who saved the post
  shares: [{ by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }], // Number of shares
  
  // Advanced Visibility Options
  visibility: {
    type: String,
    enum: ["Public", "Connections Only", "Custom"], // Custom visibility for specific roles or institutions
    default: "Public"
  },
  visibilityFilters: {
    role: { type: [String], enum: ["Student", "Faculty", "Alumni", "Admin"], default: [] }, // Roles allowed to view
    institution: { type: [String], enum: predefinedColleges, default: [] } // Institutions allowed to view
  },

  // Engagement counts for fast querying
  likeCount: { type: Number, default: 0 }, // Cached like count
  commentCount: { type: Number, default: 0 }, // Cached comment count
  saveCount: { type: Number, default: 0 }, // Cached save count
  shareCount: { type: Number, default: 0 }, // Cached share count

  createdAt: { type: Date, default: Date.now }, // Timestamp for post creation
  updatedAt: { type: Date, default: Date.now }, // Timestamp for last update
});

// Pre-save middleware to update `updatedAt` on modification
PostSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtuals to compute engagement metrics dynamically (optional)
PostSchema.virtual('engagementScore').get(function () {
  return this.likeCount + this.commentCount + this.shareCount + this.saveCount;
});

// Indexing for efficient querying
PostSchema.index({ author: 1 });
PostSchema.index({ category: 1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ 'visibilityFilters.role': 1 });
PostSchema.index({ 'visibilityFilters.institution': 1 });

const Post = mongoose.model('Post', PostSchema);
module.exports = Post;
