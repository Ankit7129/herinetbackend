const express = require('express');
const mongoose = require('mongoose');
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Alumni = require('../models/Alumni');

const router = express.Router();

// Function to calculate the friend stats
router.get('/friend-stats', async (req, res) => {
  try {
    // Get the current user (assuming user is logged in and we have the user ID)
    const currentUserId = req.user._id; // Replace with your logic for getting the current user

    // Fetch the user from the database
    const currentUser = await User.findById(currentUserId).populate('friends');

    // Initialize counters
    let teacherCount = 0;
    let alumniCount = 0;
    let studentCount = 0;
    let sentTeacherRequests = 0;
    let sentAlumniRequests = 0;
    let sentStudentRequests = 0;
    let receivedTeacherRequests = 0;
    let receivedAlumniRequests = 0;
    let receivedStudentRequests = 0;

    // Count total friends and categorize them
    currentUser.friends.forEach(friend => {
      if (friend.role === 'teacher') {
        teacherCount++;
      } else if (friend.role === 'alumni') {
        alumniCount++;
      } else if (friend.role === 'student') {
        studentCount++;
      }
    });

    // Count sent and received friend requests by category (Teacher, Alumni, Student)
    // Sent requests are from the current user to others
    sentTeacherRequests = await FriendRequest.countDocuments({ from: currentUserId, status: 'pending', to: { $in: await Teacher.find({}).select('_id') } });
    sentAlumniRequests = await FriendRequest.countDocuments({ from: currentUserId, status: 'pending', to: { $in: await Alumni.find({}).select('_id') } });
    sentStudentRequests = await FriendRequest.countDocuments({ from: currentUserId, status: 'pending', to: { $in: await Student.find({}).select('_id') } });

    // Received requests are to the current user from others
    receivedTeacherRequests = await FriendRequest.countDocuments({ to: currentUserId, status: 'pending', from: { $in: await Teacher.find({}).select('_id') } });
    receivedAlumniRequests = await FriendRequest.countDocuments({ to: currentUserId, status: 'pending', from: { $in: await Alumni.find({}).select('_id') } });
    receivedStudentRequests = await FriendRequest.countDocuments({ to: currentUserId, status: 'pending', from: { $in: await Student.find({}).select('_id') } });

    // Prepare the response data
    const stats = {
      totalFriends: currentUser.friends.length,
      teacherCount,
      alumniCount,
      studentCount,
      sentTeacherRequests,
      sentAlumniRequests,
      sentStudentRequests,
      receivedTeacherRequests,
      receivedAlumniRequests,
      receivedStudentRequests
    };

    // Send the statistics as the response
    res.status(200).json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving friend statistics' });
  }
});

module.exports = router;
