const mongoose = require('mongoose');

// Define Project Schema
const ProjectSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  requiredSkills: { type: [String], default: [] }, // Skills needed for the project
  teamSize: { type: Number, default: 0 }, // Current team size
  maxTeamSize: { type: Number, required: true }, // Maximum number of members allowed
  category: {
    type: String,
    enum: ["Tech", "Business", "Design", "Research", "Startup", "Volunteering"],
    required: true
  },
  tags: { type: [String], default: [] }, // Tags for discoverability
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of team member IDs
  requests: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
    }
  ],

  // Advanced Visibility Options
  visibility: {
    type: String,
    enum: ["Public", "Connections Only", "Custom"], // Custom for role-based or institution-specific visibility
    default: "Public"
  },
  visibilityFilters: {
    role: { type: [String], enum: ["Student", "Faculty", "Alumni", "Admin"], default: [] }, // Roles allowed to view
    institution: { type: [String], enum: predefinedColleges, default: [] } // Institutions allowed to view
  },

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Pre-save middleware to update `updatedAt`
ProjectSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexing
ProjectSchema.index({ creator: 1 });
ProjectSchema.index({ category: 1 });
ProjectSchema.index({ tags: 1 });
ProjectSchema.index({ 'visibilityFilters.role': 1 });
ProjectSchema.index({ 'visibilityFilters.institution': 1 });

const Project = mongoose.model('Project', ProjectSchema);
module.exports = Project;
