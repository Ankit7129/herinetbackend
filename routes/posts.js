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

// Create Post
router.post(
  '/create-post',
  authMiddleware,
  upload.array('media', 10), // Max 10 media files
  async (req, res) => {
    try {
      const author = req.user.id; // Extract user ID from the token
      const { content, category, tags, visibility, visibilityFilters } = req.body;

      if (!content || !category) {
        return res.status(400).json({ message: 'Content and category are required.' });
      }

       // Log the incoming request data
       console.log("Request Body:", req.body);
       console.log("Files:", req.files);

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

      const parsedVisibilityFilters = {
        role: visibilityFilters?.role ? JSON.parse(visibilityFilters.role) : [],
        institution: visibilityFilters?.institution
          ? JSON.parse(visibilityFilters.institution)
          : [],
      };

      const newPost = new Post({
        author,
        content,
        media,
        category,
        tags: tags ? JSON.parse(tags) : [],
        visibility: visibility || 'Public',
        visibilityFilters: parsedVisibilityFilters,
      });

      await newPost.save();

      res.status(201).json({ message: 'Post created successfully.', post: newPost });
    } catch (error) {
      res.status(500).json({ message: 'Failed to create post.', error: error.message });
    }
  }
);

// Fetch Feed with Filtering and Pagination
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const currentUserProfile = await Profile.findOne({ userId: req.user.id });

    if (!currentUserProfile) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    const userRole = currentUserProfile.role;
    const userInstitution = currentUserProfile.institution;
    const userConnections = currentUserProfile.connections;

    const { category, tags, page = 1, limit = 10 } = req.query;
    const currentPage = Math.max(1, parseInt(page));
    const pageLimit = Math.max(1, parseInt(limit));

    const query = {
      $or: [
        { visibility: 'Public' },
        { visibility: 'Connections Only', author: { $in: userConnections } },
        {
          visibility: 'Custom',
          $or: [
            { 'visibilityFilters.role': userRole },
            { 'visibilityFilters.institution': userInstitution },
          ],
        },
      ],
    };

    if (category) {
      query.category = category;
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      if (tagArray.length > 0) {
        query.tags = { $in: tagArray };
      }
    }

    const posts = await Post.find(query)
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * pageLimit)
      .limit(pageLimit);

    const totalPosts = await Post.countDocuments(query);
    const totalPages = Math.ceil(totalPosts / pageLimit);

    res.status(200).json({ posts, totalPosts, totalPages, currentPage });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch posts.', error: err.message });
  }
});

// Edit Post
router.put('/edit/:postId', authMiddleware, async (req, res) => {
  try {
    const { content, category, tags, visibility, visibilityFilters } = req.body;

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to edit this post.' });
    }

    Object.assign(post, {
      content: content || post.content,
      category: category || post.category,
      tags: tags || post.tags,
      visibility: visibility || post.visibility,
      visibilityFilters: visibilityFilters || post.visibilityFilters,
    });

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

// Like a Post
router.post('/like/:postId', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    if (post.likes.includes(req.user.id)) {
      return res.status(400).json({ message: 'You have already liked this post.' });
    }

    post.likes.push(req.user.id);
    await post.save();

    res.status(200).json({ message: 'Post liked.', likes: post.likes.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to like post.', error: err.message });
  }
});

// Unlike a Post
router.post('/unlike/:postId', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    if (!post.likes.includes(req.user.id)) {
      return res.status(400).json({ message: 'You have not liked this post.' });
    }

    post.likes = post.likes.filter(userId => userId.toString() !== req.user.id);
    await post.save();

    res.status(200).json({ message: 'Post unliked.', likes: post.likes.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to unlike post.', error: err.message });
  }
});

// Add Comment
router.post('/comment/:postId', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Comment content is required.' });
    }

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    post.comments.push({ commenter: req.user.id, content });
    await post.save();

    res.status(201).json({ message: 'Comment added.', comments: post.comments });
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

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    if (post.author.toString() !== req.user.id && comment.commenter.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this comment.' });
    }

    comment.remove();
    await post.save();

    res.status(200).json({ message: 'Comment deleted successfully.', comments: post.comments });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete comment.', error: err.message });
  }
});






module.exports = router;
