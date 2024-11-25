const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify the token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Extract token from Authorization header

  if (!token) {
    return res.status(403).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify and decode the token
    req.user = decoded; // Attach decoded user data to request object
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// Middleware to check if the user is authenticated
const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Extract token from Authorization header

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Decode the token
    const user = await User.findById(decoded.userId); // Find user based on the decoded userId

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    req.user = user; // Attach the user to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// Middleware to check if the user is an admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id); // Find the user based on their ID from the request

    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    next(); // User is an admin, proceed to the next middleware or route handler
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// Middleware to authenticate and decode token
const authenticateUser = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header

  if (!token) {
    return res.status(401).json({ message: 'No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify and decode the token
    req.user = decoded; // Attach decoded user data to request object
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    return res.status(403).json({ message: 'Token is invalid or expired.' });
  }
};

// Exporting all middlewares
module.exports = { verifyToken, authMiddleware, isAdmin, authenticateUser };
