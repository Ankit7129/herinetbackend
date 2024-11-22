const jwt = require('jsonwebtoken');
// models/index.js
const User = require('../models/User');
const Student = require('../models/Student');
const Alumni = require('../models/Alumni');
const Teacher = require('../models/Teacher');

module.exports = { User, Student, Alumni, Teacher };

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(403).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// Admin verification middleware
const isAdmin = async (req, res, next) => {
  const user = await Student.findById(req.user.id) || 
               await Alumni.findById(req.user.id) || 
               await Teacher.findById(req.user.id);

  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }

  next();
};

const authenticateUser = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Extract token from Authorization header

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // Verify the token and decode the user info
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // Attach the decoded token to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    return res.status(403).json({ message: 'Token is invalid or expired' });
  }
};


const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Getting token from Authorization header

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Decoding the token to extract user info
    const user = await User.findById(decoded.userId); // Fetch the user based on userId from the token

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user; // Attach user to request object
    next(); // Move to the next middleware or controller
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};




module.exports = { verifyToken,authMiddleware, isAdmin, authenticateUser };
