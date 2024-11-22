const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  bio: { type: String, default: '' },
  educationalBackground: [
    {
      institution: { type: String, default: '' }, // Make institution optional
      degree: { type: String, default: '' },
      yearOfGraduation: { type: Number, default: null },
    },
  ],
  professionalExperience: { type: Array, default: [] },
  achievements: { type: Array, default: [] },
  hobbies: { type: Array, default: [] },
  certifications: { type: Array, default: [] },
  skills: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
