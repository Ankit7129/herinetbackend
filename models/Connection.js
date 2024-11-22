const mongoose = require('mongoose');

// Connection schema to manage user relationships
const ConnectionSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // The user who is sending the request
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // The user who is receiving the request
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'Followed'],
    default: 'Pending'
  },
  createdAt: { type: Date, default: Date.now }, // Date of the connection request
  updatedAt: { type: Date, default: Date.now }  // Date when the connection status was last updated
});

// Create a model for Connection
const Connection = mongoose.model('Connection', ConnectionSchema);
module.exports = Connection;
