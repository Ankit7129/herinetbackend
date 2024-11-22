const express = require("express");
const router = express.Router();
const { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, withdrawFriendRequest, getAllUsers, getFriends } = require("../controllers/friendController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// Route to send a friend request
router.post("/send", authenticateUser, sendFriendRequest);

// Route to accept a friend request
router.post("/accept/:requestId", authenticateUser, acceptFriendRequest);

// Route to reject a friend request
router.post("/reject/:requestId", authenticateUser, rejectFriendRequest);

// Route to withdraw a sent friend request
router.post("/withdraw/:requestId", authenticateUser, withdrawFriendRequest);

// Route to get all users (excluding the current user)
router.get("/users", authenticateUser, getAllUsers);

// Route to get the list of friends
router.get("/friends", authenticateUser, getFriends);

module.exports = router;
