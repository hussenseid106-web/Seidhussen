const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection (Make sure your Render environment variables have MONGO_URI, or replace with your string)
const MONGO_URI = process.env.MONGO_URI || "YOUR_MONGODB_ATLAS_CONNECTION_STRING";

mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

// ==========================================
// DATABASE SCHEMAS & MODELS
// ==========================================
const studentSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  grade: { type: String },
  section: { type: String },
  results: [
    {
      subject: { type: String, required: true },
      score: { type: Number, required: true },
      grade: { type: String }
    }
  ]
});

const teacherSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const Student = mongoose.model('Student', studentSchema);
const Teacher = mongoose.model('Teacher', teacherSchema);

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// 1. Student Login
app.post('/api/auth/student-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const student = await Student.findOne({ username });
    if (!student || student.password !== password) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    res.json({ token: "sample-token", student });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 2. Teacher Login
app.post('/api/auth/teacher-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const teacher = await Teacher.findOne({ username });
    if (!teacher || teacher.password !== password) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }
    res.json({ token: "sample-token", teacher });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 3. Register a new co-teacher / admin
app.post('/api/auth/register-teacher', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingTeacher = await Teacher.findOne({ username });
    if (existingTeacher) {
      return res.status(400).json({ message: "Teacher username already exists." });
    }
    const newTeacher = new Teacher({ username, password });
    await newTeacher.save();
    res.status(201).json({ message: "Teacher registered successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error creating teacher.", error: error.message });
  }
});

// 4. Change Teacher Password
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    const teacher = await Teacher.findOne({ username });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher account not found." });
    }
    if (teacher.password !== oldPassword) {
      return res.status(401).json({ message: "Incorrect current password." });
    }
    teacher.password = newPassword;
    await teacher.save();
    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error changing password.", error: error.message });
  }
});

// ==========================================
// STUDENT & GRADE MANAGEMENT ROUTES
// ==========================================

// 5. Get all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 6. Register a single student (or used by bulk upload loop)
app.post('/api/students', async (req, res) => {
  try {
    const { username, fullName, password, grade, section } = req.body;
    const existing = await Student.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "Student username already exists" });
    }
    const newStudent = new Student({ username, fullName, password, grade, section: section || "A", results: [] });
    await newStudent.save();
    res.status(201).json(newStudent);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 7. Add or Update a Student's Grade
app.put('/api/students/:id/grades', async (req, res) => {
  try {
    const { subject, score } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Calculate basic letter grade
    let letterGrade = 'F';
    if (score >= 90) letterGrade = 'A';
    else if (score >= 80) letterGrade = 'B';
    else if (score >= 70) letterGrade = 'C';
    else if (score >= 60) letterGrade = 'D';
    else if (score >= 50) letterGrade = 'E';

    // Update if subject exists, otherwise add new
    const existingResult = student.results.find(r => r.subject.toLowerCase() === subject.toLowerCase());
    if (existingResult) {
      existingResult.score = score;
      existingResult.grade = letterGrade;
    } else {
      student.results.push({ subject, score, grade: letterGrade });
    }

    await student.save();
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 8. Delete a specific subject grade
app.delete('/api/students/:id/grades/:subjectId', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    student.results = student.results.filter(r => r._id.toString() !== req.params.subjectId);
    await student.save();
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
