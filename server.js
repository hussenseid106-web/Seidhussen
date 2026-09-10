const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is missing in environment variables');
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Student Result Schema & Model
const resultSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  grade: { type: String, required: true },
  subjects: [
    {
      subjectName: String,
      mark: Number
    }
  ],
  totalMarks: Number,
  average: Number,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

const Result = mongoose.model('Result', resultSchema);

// Base route for testing
app.get('/', (req, res) => {
  res.send('School Result Backend API is running!');
});

// Create or update a student result (Teacher Portal)
app.post('/api/results', async (req, res) => {
  try {
    const { studentId, name, grade, subjects, totalMarks, average, status } = req.body;

    const updatedResult = await Result.findOneAndUpdate(
      { studentId },
      { name, grade, subjects, totalMarks, average, status },
      { new: true, upsert: true }
    );

    res.status(200).json({
      message: 'Result saved successfully',
      data: updatedResult
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch a single student result by ID (Student Portal)
app.get('/api/results/:studentId', async (req, res) => {
  try {
    const result = await Result.findOne({ studentId: req.params.studentId });
    if (!result) {
      return res.status(404).json({ message: 'Student result not found' });
    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
