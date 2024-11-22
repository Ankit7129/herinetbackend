const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const Student = require('../models/Student'); // Import Student model
const Teacher = require('../models/Teacher'); // Import Teacher model
const Alumni = require('../models/Alumni'); // Import Alumni model

// Send a friend request
const sendFriendRequest = async (req, res) => {
    const { to } = req.body; // Assume you get the recipient's ID (to) from the request body
  
    if (!to) {
      return res.status(400).json({ message: 'Recipient ID is required' });
    }
  
    try {
      const friendRequest = new FriendRequest({
        from: req.user.id, // Use the authenticated user's ID
        to: to,
        status: 'pending', // Set initial status to 'pending' (or whatever is appropriate)
      });
  
      await friendRequest.save();
  
      return res.status(201).json({ message: 'Friend request sent successfully', friendRequest });
    } catch (error) {
      return res.status(500).json({ message: 'Error sending friend request', error });
    }
  };

  // Helper function to get user model dynamically based on user type
const getUserModel = async (userId) => {
    // Check if user is a Student, Teacher, or Alumni
    let user;
    user = await Student.findById(userId);
    if (user) return user;
  
    user = await Teacher.findById(userId);
    if (user) return user;
  
    user = await Alumni.findById(userId);
    return user;
  };

// Accept a friend request
const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params; // Get the request ID from the URL

    // Find the friend request
    const request = await FriendRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Get user and friend models dynamically (without checking if logged-in user is the recipient)
    const user = await getUserModel(request.to); // Accept the request for the user to whom the request was sent
    const friend = await getUserModel(request.from); // The person who sent the request

    // Ensure the friend request is not already accepted (avoiding duplicate additions)
    if (user.friends && user.friends.includes(request.from)) {
      return res.status(400).json({ message: "Friend request already accepted" });
    }

    // Initialize friends array if it's undefined
    if (!user.friends) {
      user.friends = []; // Initialize if undefined
    }
    if (!friend.friends) {
      friend.friends = []; // Initialize if undefined
    }

    // Add each other to friends list
    user.friends.push(request.from);
    friend.friends.push(request.to);

    // Use findOneAndUpdate to avoid version conflicts
    await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { friends: user.friends } },
      { new: true, runValidators: true }
    );
    await User.findOneAndUpdate(
      { _id: friend._id },
      { $set: { friends: friend.friends } },
      { new: true, runValidators: true }
    );

    // Remove the friend request from the database
    await FriendRequest.findByIdAndDelete(requestId);

    return res.status(200).json({ message: "Friend request accepted", friend });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

  

// Reject a friend request
const rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest || friendRequest.status !== "pending") {
      return res.status(404).json({ message: "Friend request not found or already handled." });
    }

    friendRequest.status = "rejected";
    await friendRequest.save();

    res.status(200).json({ message: "Friend request rejected." });
  } catch (error) {
    res.status(500).json({ message: "Error rejecting friend request", error });
  }
};

// Withdraw a sent friend request
const withdrawFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest || friendRequest.from.toString() !== req.user.id) {
      return res.status(404).json({ message: "Friend request not found or not owned by you." });
    }

    await friendRequest.deleteOne();

    res.status(200).json({ message: "Friend request withdrawn." });
  } catch (error) {
    res.status(500).json({ message: "Error withdrawing friend request", error });
  }
};

// Get all users (excluding current user)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select("name email profilePicture bio");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
};

// Get friend list
const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("friends", "name email profilePicture bio");
    res.status(200).json(user.friends);
  } catch (error) {
    res.status(500).json({ message: "Error fetching friends", error });
  }
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  withdrawFriendRequest,
  getAllUsers,
  getFriends,
};
