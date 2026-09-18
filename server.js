const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB Atlas
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// Student Schema
const studentSchema = new mongoose.Schema({
  username: { type: String, trim: true },
  firstName: { type: String, trim: true },
  password: { type: String, required: true },
  fullName: { type: String, default: "Abebe Student" },
  grade: { type: String, default: "10" },
  section: { type: String, default: "A" },
  results: [{
    subject: { type: String, required: true },
    score: { type: Number, required: true },
    grade: { type: String }
  }]
});

const Student = mongoose.model('Student', studentSchema, 'students');

function calculateGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  if (score >= 50) return 'E';
  return 'F';
}

// 1. Student Login Route
app.post('/api/auth/student-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const student = await Student.findOne({
      $or: [
        { username: { $regex: new RegExp('^' + username + '$', 'i') } },
        { firstName: { $regex: new RegExp('^' + username + '$', 'i') } }
      ]
    });

    if (!student || student.password !== password) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const studentObj = student.toObject();
    studentObj.fullName = studentObj.fullName || studentObj.firstName || username;
    studentObj.grade = studentObj.grade || "10";
    studentObj.section = studentObj.section || "A";
    studentObj.results = studentObj.results || [];

    res.json({
      token: "student-token-" + student._id,
      student: studentObj
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// 2. Teacher Login Route
app.post('/api/auth/teacher-login', async (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    return res.json({ token: 'teacher-token-admin' });
  }
  res.status(401).json({ message: 'Invalid teacher credentials (use admin / admin123)' });
});

// 3. Get All Students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find({});
    const formatted = students.map(s => {
      const obj = s.toObject();
      obj.username = obj.username || obj.firstName || 'student';
      obj.fullName = obj.fullName || obj.firstName || 'Student';
      return obj;
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Register New Student
app.post('/api/students', async (req, res) => {
  try {
    const { username, fullName, password, grade, section } = req.body;
    const newStudent = new Student({
      username: username.toLowerCase(),
      firstName: username,
      fullName,
      password,
      grade: grade || "10",
      section: section || "A",
      results: []
    });
    await newStudent.save();
    res.status(201).json({ message: 'Student registered successfully', student: newStudent });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 5. Add or Update Grade
app.put('/api/students/:id/grades', async (req, res) => {
  try {
    const { subject, score } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const gradeLetter = calculateGrade(Number(score));
    
    const existingResult = student.results.find(r => r.subject.toLowerCase() === subject.toLowerCase());
    if (existingResult) {
      existingResult.score = Number(score);
      existingResult.grade = gradeLetter;
    } else {
      student.results.push({ subject, score: Number(score), grade: gradeLetter });
    }

    await student.save();
    res.json({ results: student.results });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 6. Delete Grade
app.delete('/api/students/:id/grades/:subjectId', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    student.results = student.results.filter(r => r._id.toString() !== req.params.subjectId);
    await student.save();
    res.json({ results: student.results });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
