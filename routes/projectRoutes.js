const express = require('express');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { authMiddleware } = require('../middlewares/authMiddleware');
const Post = require('../models/Post');
const Profile = require('../models/Profile');

const router = express.Router();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer for handling file uploads
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
});

// Calculate Engagement Score (based on likes, shares, saves, comments)
function calculateEngagementScore(post) {
  const likeWeight = 2; // Likes have a weight of 2
  const shareWeight = 3; // Shares have a weight of 3
  const saveWeight = 1; // Saves have a weight of 1
  const commentWeight = 1; // Comments have a weight of 1

  const likesScore = post.likes.length * likeWeight;
  const sharesScore = post.shares * shareWeight;
  const savesScore = post.saves.length * saveWeight;
  const commentsScore = post.comments.length * commentWeight;

  return likesScore + sharesScore + savesScore + commentsScore;
}

// Post a project
router.post(
  '/post-project',
  authMiddleware,
  upload.array('attachments', 5), // Max 5 attachments for projects
  async (req, res) => {
    try {
      const author = req.user.id;
      const { title, description, skillsRequired, estimatedDuration, visibility, teamSize, visibilityFilters } = req.body;

      if (!title || !description || !skillsRequired || !estimatedDuration) {
        return res.status(400).json({ message: 'Title, Description, Skills Required, and Estimated Duration are required fields.' });
      }

      // Handle file attachments (if any)
      // Handle file attachments (if any)
      const attachments = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              { folder: 'project_attachments', resource_type: 'auto' },
              (err, result) => (err ? reject(err) : resolve(result))
            ).end(file.buffer);
          });
          attachments.push({ url: uploadResult.secure_url, type: uploadResult.resource_type });
        }
      }


      // Handle visibility filters (role-based, institution-based)
      const parsedVisibilityFilters = {
        role: visibilityFilters?.role ? JSON.parse(visibilityFilters.role) : [],
        institution: visibilityFilters?.institution
          ? JSON.parse(visibilityFilters.institution)
          : [],
      };

      const newProjectPost = new Post({
        author,
        content: description,
        category: 'Tech Projects', // Assuming the default category, adjust as needed
        isProject: true, // Automatically mark as a project post

        projectDetails: {
          title,
          description,
          skillsRequired: skillsRequired.split(','), // Split comma-separated skills
          estimatedDuration,
          teamSize: teamSize ? parseInt(teamSize) : 1, // Default to 1 team member
          attachments,
          visibility: visibility || 'Public', // Default to 'Public'
        },
        visibility: visibility || 'Public',
        visibilityFilters: parsedVisibilityFilters,
        likes: [],
        saves: [],
        shares: [],
        comments: [],
      });

      // Calculate and store engagement score (defaulting to 0 at creation)
      newProjectPost.engagementScore = calculateEngagementScore(newProjectPost);

      await newProjectPost.save();
      // Update the user's profile to include this new project
      await Profile.findOneAndUpdate(
        { user: author },
        { $push: { projects: newProjectPost._id } },
        { new: true }
      );

      res.status(201).json({ message: 'Project posted successfully.', project: newProjectPost });
    } catch (error) {
      res.status(500).json({ message: 'Failed to create project post.', error: error.message });
    }
  }
);


// Route to request to join a project
router.post('/request-to-join/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Fetch the project
    const project = await Post.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    // Ensure the team is not full before allowing a join request
    if (project.projectDetails.teamMembers.length >= project.projectDetails.teamSize) {
      return res.status(400).json({ message: 'Team size limit reached. Cannot join the project.' });
    }

    // Initialize joinRequests if not already present
    project.projectDetails.joinRequests = project.projectDetails.joinRequests || [];

    // Check if user is already part of the project team
    if (project.projectDetails.teamMembers?.includes(userId)) {
      return res.status(400).json({ message: 'You are already part of this project team.' });
    }

    // Check if the user has already sent a request
    const existingRequest = project.projectDetails.joinRequests.find(
      (request) => request.userId.toString() === userId );
      
      if (existingRequest && existingRequest.status === 'removed') {
        // Check if one hour has passed since removal
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
        const timeSinceRemoval = Date.now() - existingRequest.removalTime;
        
        if (timeSinceRemoval < oneHour) {
          return res.status(400).json({ message: 'You can only request to rejoin after one hour from removal.' });
        }
      }
  
      // Check if the user has already sent a request
      if (existingRequest && existingRequest.status === 'pending' ) {
        return res.status(400).json({ message: 'You have already requested to join this project.' });
      }

    // Create a new request
    const joinRequest = {
      userId,
      status: 'pending',
    };
    project.projectDetails.joinRequests.push(joinRequest);

    // Save the project and log the updated structure
    await project.save();
    console.log('Updated Project:', project); // Log the entire project for debugging

    res.status(201).json({ message: 'Request to join the project sent successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send join request.', error: error.message });
  }
});



// Route to approve or deny join request (Project Creator)
// Route to approve or deny join request (Project Creator)
router.patch('/manage-join-requests/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { requestId, action } = req.body;

    if (!requestId || !action) {
      return res.status(400).json({ message: 'Request ID and action are required.' });
    }

    // Fetch the project
    const project = await Post.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Ensure only the project creator can approve/deny requests
    if (project.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the project creator can approve or deny requests.' });
    }

    // Access the joinRequests under projectDetails
    const request = project.projectDetails.joinRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found.' });
    }

    // Handle approval or denial
    if (action === 'approve') {
     
      // Check if team size before adding the member
       if (project.projectDetails.teamMembers.length >= project.projectDetails.teamSize) {
        return res.status(400).json({ message: 'Cannot add more members. Team size limit reached.' });
      }

      // Check if user is already a member
      if (project.projectDetails.teamMembers.includes(request.userId.toString())) {
        return res.status(400).json({ message: 'User is already part of the team.' });
      }
      if (request.status !== 'pending') {
        return res.status(400).json({ message: 'This user was either denied or removed previously. They must send a new request to rejoin.' });
      }

      // Add the user to the team
      project.projectDetails.teamMembers.push(request.userId);
      request.status = 'approved';

      // Check if team size is 7 or more and set teamFormed to true
      if (project.projectDetails.teamMembers.length >= project.projectDetails.teamSize) {
        project.projectDetails.teamFormed = true;
      }
    } else if (action === 'deny') {
      request.status = 'denied';
    } else {
      return res.status(400).json({ message: 'Invalid action.' });
    }

    // Save the project after modifying join request and teamMembers
    await project.save();
    res.status(200).json({ message: `Request ${action}d successfully.` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to manage join request.', error: error.message });
  }
});

// Route to remove a team member (Project Creator)
router.patch('/remove-team-member/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userIdToRemove } = req.body;

    if (!userIdToRemove) {
      return res.status(400).json({ message: 'User ID to remove is required.' });
    }

    // Fetch the project
    const project = await Post.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Ensure only the project creator can remove team members
    if (project.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the project creator can remove team members.' });
    }

    // Remove the user from the teamMembers array
    const teamIndex = project.projectDetails.teamMembers.indexOf(userIdToRemove);
    if (teamIndex === -1) {
      return res.status(404).json({ message: 'User not found in the team.' });
    }

    // Remove the user from the team array
    project.projectDetails.teamMembers.splice(teamIndex, 1);

    // Update the teamFormed flag if the team has less than 7 members
    if (project.projectDetails.teamMembers.length < project.projectDetails.teamSize) {
      project.projectDetails.teamFormed = false;
    }
    
    // Mark the user as removed and set removal time
    const joinRequest = project.projectDetails.joinRequests.find(req => req.userId.toString() === userIdToRemove);
    if (joinRequest) {
      joinRequest.status = 'removed';
      joinRequest.removalTime = Date.now(); // Set removal time
    }

    // Save the updated project
    await project.save();
    res.status(200).json({ message: 'Team member removed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove team member.', error: error.message });
  }
});


// Add a new task to the project
router.post('/add-task/:projectId', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, assignedTo, dueDate } = req.body;

    const project = await Post.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const newTask = { title, description, assignedTo, dueDate };
    project.tasks.push(newTask);
    await project.save();

    res.status(201).json({ message: 'Task added successfully.', task: newTask });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add task.', error: error.message });
  }
});

// Update a task (e.g., change status)
router.patch('/update-task/:projectId/:taskId', authMiddleware, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const { status } = req.body; // Status can be 'Not Started', 'In Progress', or 'Completed'

    const project = await Post.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const task = project.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    task.status = status;
    await project.save();

    res.status(200).json({ message: 'Task updated successfully.', task });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update task.', error: error.message });
  }
});


// Route to send a message to a specific project chat
router.post('/project/:projectId/message', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { message } = req.body;
    const sender = req.user.id;

    // Find the project by ID
    const project = await Post.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Create the message
    const newMessage = new Message({
      projectId,
      sender,
      message
    });

    // Save the message to the database
    await newMessage.save();

    // Emit the message via Socket.io
    req.io.to(projectId).emit('receive_message', {
      sender: req.user.name,
      message,
      timestamp: newMessage.timestamp
    });

    return res.status(200).json({ message: 'Message sent successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to send message.', error: error.message });
  }
});

// Route to fetch messages for a specific project
router.get('/project/:projectId/messages', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;
    const messages = await Message.find({ projectId })
      .populate('sender', 'name email')
      .sort({ timestamp: 1 });

    return res.status(200).json({ messages });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch messages.', error: error.message });
  }
});


module.exports = router;
