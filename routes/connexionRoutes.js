const express = require('express');
const Profile = require('../models/Profile'); // Import Profile model
const User = require('../models/User'); // Import User model for user info
const { authMiddleware } = require('../middlewares/authMiddleware');
const router = express.Router();

// Fetch all profiles (connexion route) excluding the current user's profile
router.get('/connexion', authMiddleware, async (req, res) => {
  try {
    // Get all profiles excluding the current user's profile
    const profiles = await Profile.find({ userId: { $ne: req.user.id } });

    res.status(200).json(profiles); // Return the profiles as a JSON response
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profiles', error: err.message });
  }
});

// Send connection request
router.post('/send-request/:userId', authMiddleware, async (req, res) => {
    try {
      const currentUserProfile = await Profile.findOne({ userId: req.user.id });
      const requestedUserProfile = await Profile.findOne({ userId: req.params.userId });
  
      if (!requestedUserProfile) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      if (currentUserProfile.userId.toString() === requestedUserProfile.userId.toString()) {
        return res.status(400).json({ message: 'You cannot send a request to yourself' });
      }
  
      if (currentUserProfile.connectionRequests.some(req => req.userId.toString() === requestedUserProfile.userId.toString())) {
        return res.status(400).json({ message: 'Connection request already sent' });
      }
  
      currentUserProfile.connectionRequests.push({
        userId: requestedUserProfile.userId,
        status: 'pending',
      });
  
      await currentUserProfile.save();
      res.status(200).json({ message: 'Connection request sent' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });
  
  // Handle connection request (accept/reject)
  router.post('/handle-request/:userId', authMiddleware, async (req, res) => {
    try {
      const currentUserProfile = await Profile.findOne({ userId: req.user.id });
      const requestedUserProfile = await Profile.findOne({ userId: req.params.userId });
      const action = req.body.action; // either 'accept' or 'reject'
  
      if (!requestedUserProfile) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const request = currentUserProfile.connectionRequests.find(req => req.userId.toString() === requestedUserProfile.userId.toString());
  
      if (!request || request.status !== 'pending') {
        return res.status(400).json({ message: 'Request not found or already handled' });
      }
  
      if (action === 'accept') {
        request.status = 'accepted';
        currentUserProfile.connections.push(requestedUserProfile.userId);
        requestedUserProfile.connections.push(currentUserProfile.userId);
  
        currentUserProfile.connectionRequests = currentUserProfile.connectionRequests.filter(req => req.userId.toString() !== requestedUserProfile.userId.toString());
  
        await currentUserProfile.save();
        await requestedUserProfile.save();
        return res.status(200).json({ message: 'Connection accepted' });
      }
  
      if (action === 'reject') {
        currentUserProfile.connectionRequests = currentUserProfile.connectionRequests.filter(req => req.userId.toString() !== requestedUserProfile.userId.toString());
        await currentUserProfile.save();
        return res.status(200).json({ message: 'Connection request rejected' });
      }
  
      res.status(400).json({ message: 'Invalid action' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });
// Follow a user
router.post('/follow/:userId', authMiddleware, async (req, res) => {
  try {
    const currentUserProfile = await Profile.findOne({ userId: req.user.id });
    const followedUserProfile = await Profile.findOne({ userId: req.params.userId });

    if (!followedUserProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent following the same user
    if (currentUserProfile.userId.toString() === followedUserProfile.userId.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    // Add to following list if not already following
    if (!currentUserProfile.following.includes(followedUserProfile.userId)) {
      currentUserProfile.following.push(followedUserProfile.userId);
      followedUserProfile.followers.push(currentUserProfile.userId);
      await currentUserProfile.save();
      await followedUserProfile.save();
      res.status(200).json({ message: 'User followed' });
    } else {
      return res.status(400).json({ message: 'You are already following this user' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Unfollow a user
router.post('/unfollow/:userId', authMiddleware, async (req, res) => {
  try {
    const currentUserProfile = await Profile.findOne({ userId: req.user.id });
    const unfollowedUserProfile = await Profile.findOne({ userId: req.params.userId });

    if (!unfollowedUserProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent unfollowing the same user
    if (currentUserProfile.userId.toString() === unfollowedUserProfile.userId.toString()) {
      return res.status(400).json({ message: 'You cannot unfollow yourself' });
    }

    // Remove from following list
    currentUserProfile.following = currentUserProfile.following.filter(
      (userId) => userId.toString() !== unfollowedUserProfile.userId.toString()
    );
    unfollowedUserProfile.followers = unfollowedUserProfile.followers.filter(
      (userId) => userId.toString() !== currentUserProfile.userId.toString()
    );

    await currentUserProfile.save();
    await unfollowedUserProfile.save();
    res.status(200).json({ message: 'User unfollowed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get the list of followers
router.get('/followers/:userId', authMiddleware, async (req, res) => {
  try {
    const userProfile = await Profile.findOne({ userId: req.params.userId }).populate('followers', 'userId');

    if (!userProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      followers: userProfile.followers,
      totalFollowers: userProfile.followers.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get the list of following
router.get('/following/:userId', authMiddleware, async (req, res) => {
  try {
    const userProfile = await Profile.findOne({ userId: req.params.userId }).populate('following', 'userId');

    if (!userProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      following: userProfile.following,
      totalFollowing: userProfile.following.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Get all connections for the current user
router.get('/connections', authMiddleware, async (req, res) => {
  try {
    const currentUserProfile = await Profile.findOne({ userId: req.user.id }).populate('connections', 'userId name email');

    if (!currentUserProfile) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    res.status(200).json({
      connections: currentUserProfile.connections,
      totalConnections: currentUserProfile.connections.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Get connections of another user
router.get('/connections/:userId', authMiddleware, async (req, res) => {
  try {
    const userProfile = await Profile.findOne({ userId: req.params.userId }).populate('connections', 'userId name email');

    if (!userProfile) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    res.status(200).json({
      connections: userProfile.connections,
      totalConnections: userProfile.connections.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Remove a connection
router.post('/remove-connection/:userId', authMiddleware, async (req, res) => {
  try {
    const currentUserProfile = await Profile.findOne({ userId: req.user.id });
    const otherUserProfile = await Profile.findOne({ userId: req.params.userId });

    if (!otherUserProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent removing the connection with oneself
    if (currentUserProfile.userId.toString() === otherUserProfile.userId.toString()) {
      return res.status(400).json({ message: 'You cannot remove yourself as a connection' });
    }

    // Check if the users are actually connected
    if (!currentUserProfile.connections.includes(otherUserProfile.userId)) {
      return res.status(400).json({ message: 'No connection found to remove' });
    }

    // Remove from both users' connections
    currentUserProfile.connections = currentUserProfile.connections.filter(
      (userId) => userId.toString() !== otherUserProfile.userId.toString()
    );
    otherUserProfile.connections = otherUserProfile.connections.filter(
      (userId) => userId.toString() !== currentUserProfile.userId.toString()
    );

    await currentUserProfile.save();
    await otherUserProfile.save();

    res.status(200).json({ message: 'Connection removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Fetch all pending connection requests for the current user
router.get('/pending-requests', authMiddleware, async (req, res) => {
  try {
    const currentUserProfile = await Profile.findOne({ userId: req.user.id });

    if (!currentUserProfile) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    // Fetch all the connection requests that are pending for the current user
    const pendingRequests = currentUserProfile.connectionRequests.filter(req => req.status === 'pending');

    res.status(200).json({
      pendingRequests,
      totalRequests: pendingRequests.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// POST /send-message/:receiverId
router.post('/send-message/:receiverId', authMiddleware, async (req, res) => {
  try {
    const senderProfile = await Profile.findOne({ userId: req.user.id });
    const receiverProfile = await Profile.findOne({ userId: req.params.receiverId });

    if (!receiverProfile) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    if (senderProfile.userId.toString() === receiverProfile.userId.toString()) {
      return res.status(400).json({ message: 'You cannot send a message to yourself' });
    }

    const newMessage = new Message({
      senderId: senderProfile.userId,
      receiverId: receiverProfile.userId,
      content: req.body.content,
    });

    await newMessage.save();

    res.status(200).json({ message: 'Message sent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// GET /messages/:receiverId
router.get('/messages/:receiverId', authMiddleware, async (req, res) => {
  try {
    const senderProfile = await Profile.findOne({ userId: req.user.id });
    const receiverProfile = await Profile.findOne({ userId: req.params.receiverId });

    if (!receiverProfile) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Fetch all messages between sender and receiver
    const messages = await Message.find({
      $or: [
        { senderId: senderProfile.userId, receiverId: receiverProfile.userId },
        { senderId: receiverProfile.userId, receiverId: senderProfile.userId },
      ],
    }).sort({ sentAt: 1 });

    res.status(200).json({
      messages,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
