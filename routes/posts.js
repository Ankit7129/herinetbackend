const express = require('express');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { authMiddleware } = require('../middlewares/authMiddleware');
const Post = require('../models/Post');
const Profile = require('../models/Profile');
const User = require('../models/User'); // Import User model


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


// Create Post
// Create Post
router.post('/create-post',authMiddleware,upload.array('media', 10), // Max 10 media files
  async (req, res) => {
    try {
      const author = req.user.id;
      const {
        content,
        category,
        tags,
        visibility,
        visibilityFilters,
        isProject = false, // Default to false if not provided
      } = req.body;

      // Basic validation
      if (!content || !category) {
        return res.status(400).json({ message: 'Content and category are required.' });
      }

      // Media upload
      const media = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              { folder: 'post_media', resource_type: 'auto' },
              (err, result) => (err ? reject(err) : resolve(result))
            ).end(file.buffer);
          });
          media.push({ url: uploadResult.secure_url, type: uploadResult.resource_type });
        }
      }

      // Parse visibility filters if provided
      const parsedVisibilityFilters = {
        role: visibilityFilters?.role ? JSON.parse(visibilityFilters.role) : [],
        institution: visibilityFilters?.institution ? JSON.parse(visibilityFilters.institution) : [],
      };

      // Initialize the post object with `isProject` defaulting to false
      const postData = {
        author,
        content,
        media,
        category,
        tags: tags ? JSON.parse(tags) : [],
        visibility: visibility || 'Public',
        visibilityFilters: parsedVisibilityFilters,
        isProject: false, // Always set to false
        likes: [],
        saves: [],
        shares: [],
        comments: [],
      };

      // Create and save the post
      const newPost = new Post(postData);
      await newPost.save();

      // Update the user's profile to include this new post
      await Profile.findOneAndUpdate(
        { user: author },
        { $push: { posts: newPost._id } },
        { new: true }  // Return updated profile
      );

      res.status(201).json({ message: 'Post created successfully.', post: newPost });
    } catch (error) {
      res.status(500).json({ message: 'Failed to create post.', error: error.message });
    }
  }
);


// Fetch Feed with Filtering and Pagination
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    // Fetch current user's profile data
    const currentUserProfile = await Profile.findOne({ userId: req.user.id })
      .populate('userId', 'email profileImageUrl name college role'); // Populate fields from the referenced userId

    if (!currentUserProfile) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    const { category, tags, page = 1, limit = 10, filterByCollege, filterByGender, postId } = req.query;

    const currentPage = Math.max(1, parseInt(page));
    const pageLimit = Math.max(1, parseInt(limit));

    // Build the query based on filters
    let query = {};

    if (postId) {
      query._id = postId;  // Filter by postId
    }

    if (category) {
      query.category = category;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      if (tagArray.length > 0) {
        query.tags = { $in: tagArray };
      }
    }

    if (filterByCollege) {
      query['author.college'] = filterByCollege;
    }

    if (filterByGender) {
      query['author.gender'] = filterByGender;
    }

    // Fetch posts with pagination and populate author, commenter, liker, saver, and sharer details
    const posts = await Post.find(query)
      .populate('author', 'name profileImageUrl email role gender college')  // Populate basic author details
      .populate('comments.commenter', 'name profileImageUrl')  // Populate commenter details from Profile model
      .populate('likes.liker', 'name profileImageUrl email role gender college')  // Populate liker details from Profile model
      .populate('saves.by', 'name profileImageUrl email role gender college')  // Populate saver details from Profile model
      .populate('shares.by', 'name profileImageUrl')  // Populate sharer details from Profile model
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * pageLimit)
      .limit(pageLimit);

    // Fetch the complete profile details of authors by populating the 'profile' field
    await Promise.all(posts.map(async (post) => {
      const authorProfile = await Profile.findOne({ userId: post.author._id }).select('profileImageUrl');
      post.author = {
        ...post.author.toObject(),
        profile: authorProfile  // Add the profile information to the author
      };
    }));

    // Fetch all posts without pagination to calculate accurate counts
    const allPosts = await Post.find(query).populate('author', 'role profileImageUrl gender college');

    // Separate posts into normal posts and projects
    const normalPosts = [];
    const projects = [];

    allPosts.forEach(post => {
      if (post.projectDetails && post.projectDetails.title) {
        projects.push(post);  // It's a project
      } else {
        normalPosts.push(post);  // It's a normal post
      }
    });

    // Initialize count objects with user IDs
    const roleCount = { normalPosts: {}, projects: {} };
    const genderCount = { normalPosts: {}, projects: {} };
    const collegeCount = { normalPosts: {}, projects: {} };
    const genderCollegeCount = {};

    [...normalPosts, ...projects].forEach(post => {
      const { role, gender, college, _id: userId } = post.author;

      // Handle project posts
      if (post.projectDetails && post.projectDetails.title) {
        roleCount.projects[role] = roleCount.projects[role] || { count: 0, userIds: [] };
        roleCount.projects[role].count++;
        roleCount.projects[role].userIds.push(userId);

        genderCount.projects[gender] = genderCount.projects[gender] || { count: 0, userIds: [] };
        genderCount.projects[gender].count++;
        genderCount.projects[gender].userIds.push(userId);

        collegeCount.projects[college] = collegeCount.projects[college] || { count: 0, userIds: [] };
        collegeCount.projects[college].count++;
        collegeCount.projects[college].userIds.push(userId);

        if (!genderCollegeCount[college]) {
          genderCollegeCount[college] = { Male: [], Female: [] };
        }
        genderCollegeCount[college][gender].push(userId);
      } else {
        // Handle normal posts
        roleCount.normalPosts[role] = roleCount.normalPosts[role] || { count: 0, userIds: [] };
        roleCount.normalPosts[role].count++;
        roleCount.normalPosts[role].userIds.push(userId);

        genderCount.normalPosts[gender] = genderCount.normalPosts[gender] || { count: 0, userIds: [] };
        genderCount.normalPosts[gender].count++;
        genderCount.normalPosts[gender].userIds.push(userId);

        collegeCount.normalPosts[college] = collegeCount.normalPosts[college] || { count: 0, userIds: [] };
        collegeCount.normalPosts[college].count++;
        collegeCount.normalPosts[college].userIds.push(userId);

        if (!genderCollegeCount[college]) {
          genderCollegeCount[college] = { Male: [], Female: [] };
        }
        genderCollegeCount[college][gender].push(userId);
      }
    });

    // Add dynamic counts to each post (normal and project posts)
    const updatedPosts = posts.map(post => {
      return {
        ...post.toObject(),
      
        likeCount: post.likes.length,
        commentCount: post.comments.length,
        saveCount: post.saves.length,
        shareCount: post.shares.length || 0, // Default to 0 if not defined
        isProject: post.isProject,  // Flag to indicate if it's a project post
        projectDetails: post.isProject ? { ...post.projectDetails, projectId: post._id } : undefined,  // Include projectId for project posts
      };
    });

    const totalNormalPosts = normalPosts.length; // Total normal posts
    const totalProjects = projects.length; // Total projects
    const totalPosts = allPosts.length; // Total posts (normal + projects)
    const totalPages = Math.ceil(totalPosts / pageLimit);

    // Respond with the updated feed data
    res.status(200).json({
      posts: updatedPosts,
      totalPosts,
      totalProjects,  // Total projects count
      totalNormalPosts,  // Total normal posts count
      totalPages,
      totalProjectsByRole: roleCount.projects,
      totalNormalPostsByRole: roleCount.normalPosts,
      totalProjectsByGender: genderCount.projects,
      totalNormalPostsByGender: genderCount.normalPosts,
      totalProjectsByCollege: collegeCount.projects,
      totalNormalPostsByCollege: collegeCount.normalPosts,
      genderCollegeCount, // Breakdown of gender per college for projects and normal posts
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch posts.', error: err.message });
  }
});

















// Edit Post
// Edit Post
router.put('/edit/:postId', authMiddleware, upload.array('media', 10), async (req, res) => {
  try {
    const { content, category, tags, visibility, visibilityFilters } = req.body;

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // Only the author of the post can edit it
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to edit this post.' });
    }

    // Media upload if provided
    const media = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'post_media', resource_type: 'auto' },
            (err, result) => (err ? reject(err) : resolve(result))
          ).end(file.buffer);
        });
        media.push({ url: uploadResult.secure_url, type: uploadResult.resource_type });
      }
    }

    // Update post fields with provided data
    Object.assign(post, {
      content: content || post.content,
      category: category || post.category,
      tags: tags ? JSON.parse(tags) : post.tags, // Ensure tags are parsed correctly
      visibility: visibility || post.visibility,
      visibilityFilters: visibilityFilters ? JSON.parse(visibilityFilters) : post.visibilityFilters,
      media: media.length > 0 ? media : post.media, // Update media if new files are uploaded
    });

    // Recalculate engagement score
    post.engagementScore = calculateEngagementScore(post);

    await post.save();

    res.status(200).json({ message: 'Post updated successfully.', post });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update post.', error: err.message });
  }
});


// Delete Post
router.delete('/delete/:postId', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this post.' });
    }

    await post.remove();

    res.status(200).json({ message: 'Post deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete post.', error: err.message });
  }
});

// Toggle Like/Unlike
// Toggle Like on a Post
router.post('/like/:postId', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    // Ensure likes array is initialized
    post.likes = post.likes || [];

    // Check if the user has already liked the post
    const userLikeIndex = post.likes.findIndex(
      like => like.liker && like.liker.toString() === req.user.id
    );

    if (userLikeIndex === -1) {
      // If not liked, add the like
      post.likes.push({ liker: req.user.id });
      post.likeCount += 1;  // Update cached like count
      await post.save();
      return res.status(200).json({ message: 'Post liked.', likes: post.likeCount });
    } else {
      // If already liked, remove the like
      post.likes.splice(userLikeIndex, 1);
      post.likeCount = Math.max(post.likeCount - 1, 0);  // Prevent negative counts
      await post.save();
      return res.status(200).json({ message: 'Post unliked.', likes: post.likeCount });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle like.', error: err.message });
  }
});

// Share a Post
router.post('/share/:postId', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    // Ensure shares array is initialized
    post.shares = post.shares || [];

    // Add user to the shares array
    post.shares.push({ by: req.user.id });
    post.engagementScore = calculateEngagementScore(post); // Recalculate score
    await post.save();

    // Generate the sharable link
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000'; // Adjust the base URL
    const shareLink = `${baseUrl}/posts/feed?postId=${post._id}`;

    res.status(200).json({
      message: 'Post shared.',
      shares: post.shares.length,
      shareLink: shareLink, // Include the link in the response
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to share post.', error: err.message });
  }
});

// Toggle Save/Unsave
router.post('/save/:postId', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    post.saves = post.saves || [];

    // Check if the user has already saved the post
    const saveIndex = post.saves.findIndex(save => save.by.toString() === req.user.id);

    if (saveIndex === -1) {
      // If not saved, add the save
      post.saves.push({ by: req.user.id });
      message = 'Post saved.';
    } else {
      // If already saved, remove the save
      post.saves.splice(saveIndex, 1);
      message = 'Post unsaved.';
    }

    post.engagementScore = calculateEngagementScore(post); // Recalculate engagement score
    await post.save();

    res.status(200).json({ message, saves: post.saves.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle save.', error: err.message });
  }
});



// Add Comment
router.post('/comment/:postId', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Comment content is required.' });
    }

    // Fetch the post by ID
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // Ensure comments array is initialized
    post.comments = post.comments || [];

    // Add comment with commenter ID
    post.comments.push({
      commenter: req.user.id,  // User ID from the authenticated token
      content
    });

    post.engagementScore = calculateEngagementScore(post); // Recalculate engagement score

    await post.save();

    // Populate the commenter details before returning
    const populatedPost = await post.populate('comments.commenter', 'name _id'); // Adjust fields as needed

    // Get the newly added comment (last in the array)
    const newComment = populatedPost.comments[populatedPost.comments.length - 1];

    res.status(201).json({ message: 'Comment added.', comment: newComment });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add comment.', error: err.message });
  }
});



// Delete Comment
router.delete('/comment/delete/:postId/:commentId', authMiddleware, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // Ensure comments array is initialized
    post.comments = post.comments || [];

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    if (post.author.toString() !== req.user.id && comment.commenter.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this comment.' });
    }

    comment.remove();
    post.engagementScore = calculateEngagementScore(post); // Recalculate score

    await post.save();

    res.status(200).json({ message: 'Comment deleted successfully.', comments: post.comments });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete comment.', error: err.message });
  }
});













module.exports = router;
