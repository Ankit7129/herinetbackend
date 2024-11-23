const express = require('express');
const Message = require('../models/Message');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// Send a message
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ message: 'Receiver and content are required' });
    }

    const newMessage = new Message({
      sender: req.user.id,
      receiver: receiverId,
      content,
    });

    await newMessage.save();
    res.status(200).json({ message: 'Message sent successfully', newMessage });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Fetch message history with a specific user
router.get('/history/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id },
      ],
    }).sort({ timestamp: 1 }); // Sort messages by timestamp

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
