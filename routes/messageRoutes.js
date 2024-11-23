const express = require('express');
const Project = require('../models/Project');
const User = require('../models/User');
const GroupMessage = require('../models/GroupMessage');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// Post a new project
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { title, description, requiredSkills, tags } = req.body;

    const newProject = new Project({
      title,
      description,
      requiredSkills,
      tags,
      creator: req.user.id,
    });

    await newProject.save();
    res.status(201).json({ message: 'Project created successfully', project: newProject });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Fetch suggested projects for a user
router.get('/suggestions', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const interests = user.interests; // Assume `interests` is an array of tags in the user schema
    const suggestedProjects = await Project.find({ tags: { $in: interests } });

    res.status(200).json(suggestedProjects);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Join a project
router.post('/join/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { role } = req.body;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is already a team member
    if (project.teamMembers.some((member) => member.userId.toString() === req.user.id)) {
      return res.status(400).json({ message: 'You are already a member of this project' });
    }

    // Add user to team members
    project.teamMembers.push({ userId: req.user.id, role });
    await project.save();

    // Create a group chat if not exists
    let groupChat = await GroupMessage.findOne({ projectId });
    if (!groupChat) {
      groupChat = new GroupMessage({ projectId, messages: [] });
      await groupChat.save();
    }

    res.status(200).json({ message: 'Joined project successfully', project });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Send a message in the group chat
router.post('/message/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { content } = req.body;

    const groupChat = await GroupMessage.findOne({ projectId });

    if (!groupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    groupChat.messages.push({
      sender: req.user.id,
      content,
    });

    await groupChat.save();
    res.status(200).json({ message: 'Message sent successfully', groupChat });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Fetch group messages for a project
router.get('/messages/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;

    const groupChat = await GroupMessage.findOne({ projectId }).populate('messages.sender', 'name email');

    if (!groupChat) {
      return res.status(404).json({ message: 'Group chat not found' });
    }

    res.status(200).json(groupChat);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
