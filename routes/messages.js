const express = require('express');
const Message = require('../models/Message'); // Import Message model
const Profile = require('../models/Profile'); // Import Profile model to find users
const { authMiddleware } = require('../middlewares/authMiddleware'); // Authentication middleware
const router = express.Router();

// Send a message
// Send a message
router.post('/send-message/:userId', authMiddleware, async (req, res) => {
  try {
    const senderProfile = await Profile.findOne({ userId: req.user.id });
    const receiverProfile = await Profile.findOne({ userId: req.params.userId });

    if (!receiverProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent sending a message to oneself
    if (senderProfile.userId.toString() === receiverProfile.userId.toString()) {
      return res.status(400).json({ message: 'You cannot send a message to yourself' });
    }

    const newMessage = new Message({
      sender: senderProfile.userId,
      receiver: receiverProfile.userId,
      content: req.body.content,
      timestamp: new Date(),
    });

    await newMessage.save();

    // Include the message ID in the response
    res.status(200).json({
      message: 'Message sent successfully',
      messageId: newMessage._id, // Return the message ID
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Get all messages between the current user and another user
router.get('/messages/:userId', authMiddleware, async (req, res) => {
  try {
    const currentUserProfile = await Profile.findOne({ userId: req.user.id });
    const otherUserProfile = await Profile.findOne({ userId: req.params.userId });

    if (!otherUserProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    const messages = await Message.find({
      $or: [
        { sender: currentUserProfile.userId, receiver: otherUserProfile.userId },
        { sender: otherUserProfile.userId, receiver: currentUserProfile.userId },
      ],
    })
      .sort({ timestamp: 1 }) // Sort messages by timestamp in ascending order
      .populate('sender', 'userId name') // Populate sender's name if needed
      .populate('receiver', 'userId name'); // Populate receiver's name if needed

    res.status(200).json({ messages });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a message (optional - for clearing conversations)
router.delete('/delete-message/:messageId', authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if the user is the sender or receiver of the message
    if (message.sender.toString() !== req.user.id && message.receiver.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this message' });
    }

    await message.remove();
    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
