const Connection = require('../models/Connection'); // Assuming the Connection model is in models/Connection.js

// Send a connection request
const sendConnectionRequest = async (req, res) => {
  try {
    const { toUserId } = req.body;  // The user who is being sent the connection request
    const fromUserId = req.user.id; // The user sending the connection request (logged-in user)

    // Check if the connection already exists
    const existingConnection = await Connection.findOne({
      fromUser: fromUserId,
      toUser: toUserId
    });

    if (existingConnection) {
      return res.status(400).json({ message: 'Connection request already sent or exists.' });
    }

    // Create a new connection request
    const newConnection = new Connection({
      fromUser: fromUserId,
      toUser: toUserId,
      status: 'Pending'
    });

    await newConnection.save();

    return res.status(200).json({ message: 'Connection request sent successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept a connection request
const acceptConnectionRequest = async (req, res) => {
  try {
    const { connectionId } = req.body; // The ID of the connection request to accept
    const userId = req.user.id; // Logged-in user who is accepting the request

    // Find the connection request by ID
    const connection = await Connection.findById(connectionId);

    if (!connection) {
      return res.status(404).json({ message: 'Connection request not found.' });
    }

    if (connection.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to accept this request.' });
    }

    // Update the connection status to "Accepted"
    connection.status = 'Accepted';
    await connection.save();

    return res.status(200).json({ message: 'Connection request accepted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject a connection request
const rejectConnectionRequest = async (req, res) => {
  try {
    const { connectionId } = req.body; // The ID of the connection request to reject
    const userId = req.user.id; // Logged-in user who is rejecting the request

    // Find the connection request by ID
    const connection = await Connection.findById(connectionId);

    if (!connection) {
      return res.status(404).json({ message: 'Connection request not found.' });
    }

    if (connection.toUser.toString() !== userId) {
      return res.status(403).json({ message: 'You are not authorized to reject this request.' });
    }

    // Update the connection status to "Rejected"
    connection.status = 'Rejected';
    await connection.save();

    return res.status(200).json({ message: 'Connection request rejected.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Follow a user
const followUser = async (req, res) => {
  try {
    const { toUserId } = req.body; // The user to follow
    const fromUserId = req.user.id; // The logged-in user who is following

    // Create a follow relationship (similar to a connection request, but no acceptance required)
    const newFollow = new Connection({
      fromUser: fromUserId,
      toUser: toUserId,
      status: 'Following'
    });

    await newFollow.save();

    return res.status(200).json({ message: 'You are now following this user.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Unfollow a user
const unfollowUser = async (req, res) => {
  try {
    const { toUserId } = req.body; // The user to unfollow
    const fromUserId = req.user.id; // The logged-in user who is unfollowing

    // Remove the follow relationship from the database
    await Connection.deleteOne({
      fromUser: fromUserId,
      toUser: toUserId,
      status: 'Following'
    });

    return res.status(200).json({ message: 'You have unfollowed this user.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all connections (accepted or pending) of a user
const getConnections = async (req, res) => {
  try {
    const userId = req.user.id; // The logged-in user whose connections are being retrieved

    // Find all connections for this user
    const connections = await Connection.find({
      $or: [
        { fromUser: userId },
        { toUser: userId }
      ]
    }).populate('fromUser', 'name email') // Populate fromUser details
      .populate('toUser', 'name email');  // Populate toUser details

    return res.status(200).json(connections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all followers of a user
const getFollowers = async (req, res) => {
  try {
    const userId = req.user.id; // The logged-in user whose followers are being retrieved

    // Find all followers (users who have sent connection requests to this user)
    const followers = await Connection.find({
      toUser: userId,
      status: 'Accepted'
    }).populate('fromUser', 'name email');

    return res.status(200).json(followers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users a user is following
const getFollowing = async (req, res) => {
  try {
    const userId = req.user.id; // The logged-in user whose following list is being retrieved

    // Find all users this user is following
    const following = await Connection.find({
      fromUser: userId,
      status: 'Accepted'
    }).populate('toUser', 'name email');

    return res.status(200).json(following);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  followUser,
  unfollowUser,
  getConnections,
  getFollowers,
  getFollowing
};
