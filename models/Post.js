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
    enum: ["Announcement", "Discussion", "Idea", "Event", "Achievement", "Help Request"], // Predefined categories
    required: true
  },
  tags: { type: [String], default: [] }, // Optional tags for discoverability
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of users who liked the post
  comments: [
    {
      commenter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // User who commented
      content: { type: String, required: true }, // Content of the comment
      createdAt: { type: Date, default: Date.now } // Timestamp for the comment
    }
  ],

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

  createdAt: { type: Date, default: Date.now }, // Timestamp for post creation
  updatedAt: { type: Date, default: Date.now }, // Timestamp for last update
});

// Pre-save middleware to update `updatedAt` on modification
PostSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexing for efficient querying
PostSchema.index({ author: 1 });
PostSchema.index({ category: 1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ 'visibilityFilters.role': 1 });
PostSchema.index({ 'visibilityFilters.institution': 1 });

const Post = mongoose.model('Post', PostSchema);
module.exports = Post;
