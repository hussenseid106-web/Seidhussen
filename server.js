const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "YOUR_MONGODB_ATLAS_CONNECTION_STRING";

mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas successfully"))
  .catch(err => console.error("MongoDB connection error:", err));

// ==========================================
// DYNAMIC SUBJECT RULES (Grades 9-12 & Streams)
// ==========================================
const getRequiredSubjects = (grade, section) => {
  const g = String(grade || '').trim();
  const sec = String(section || 'A').toUpperCase().trim();
  
  if (g === '9' || g === '10') {
    return ['Amharic', 'English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History', 'Economics', 'Civics', 'IT', 'Sport', 'Art'];
  } else if (g === '11' || g === '12') {
    if (sec === 'A' || sec === 'B') {
      return ['Amharic', 'English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Agriculture', 'IT', 'Web Design'];
    } else if (sec === 'C' || sec === 'D') {
      return ['Amharic', 'English', 'Mathematics', 'Geography', 'History', 'IT', 'Economics', 'Journalism'];
    }
  }
  return ['Amharic', 'English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History', 'Economics', 'Civics', 'IT', 'Sport', 'Art'];
};

const calculateGrade = (score) => {
  const s = Number(score) || 0;
  if (s >= 90) return 'A';
  if (s >= 80) return 'B';
  if (s >= 70) return 'C';
  if (s >= 60) return 'D';
  if (s >= 50) return 'E';
  return 'F';
};

// ==========================================
// DATABASE SCHEMAS & MODELS
// ==========================================
const studentSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  grade: { type: String, default: '11' },
  section: { type: String, default: 'A' },
  phone: { type: String, default: '' },
  photo: { type: String, default: '' },
  isFirstLogin: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: true },
  results: [
    {
      subject: { type: String, required: true },
      score: { type: Number, required: true, default: 0 },
      grade: { type: String, default: '-' }
    }
  ]
});

const teacherSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, default: '' },
  photo: { type: String, default: '' },
  isAdmin: { type: Boolean, default: false }, // true for Super Admin, false for restricted teachers
  assignments: [
    {
      subject: { type: String, required: true },
      grades: [{ type: String }],    // e.g. ["9", "11"]
      sections: [{ type: String }]   // e.g. ["A", "D", "N"]
    }
  ]
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
    res.json({ token: "sample-student-token", student });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 2. Admin Login
app.post('/api/auth/teacher-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const teacher = await Teacher.findOne({ username });
    if (!teacher || teacher.password !== password) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }
    res.json({ token: "sample-admin-token", teacher });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 3. Teacher Portal Login (Restricted Teacher)
app.post('/api/auth/portal-teacher-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const teacher = await Teacher.findOne({ username });
    if (!teacher || teacher.password !== password) {
      return res.status(401).json({ message: "Invalid teacher username or password" });
    }
    res.json({ token: "sample-portal-teacher-token", teacher });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 4. Register a new teacher with specific subject, grade & section assignments
app.post('/api/auth/register-teacher', async (req, res) => {
  try {
    const { username, password, fullName, photo, assignments, isAdmin } = req.body;
    const existingTeacher = await Teacher.findOne({ username });
    if (existingTeacher) {
      return res.status(400).json({ message: "Teacher username already exists." });
    }
    const newTeacher = new Teacher({ 
      username, 
      password, 
      fullName: fullName || username,
      photo: photo || '',
      isAdmin: isAdmin !== undefined ? isAdmin : false,
      assignments: assignments || [] 
    });
    await newTeacher.save();
    res.status(201).json({ message: "Teacher registered successfully.", teacher: newTeacher });
  } catch (error) {
    res.status(500).json({ message: "Server error creating teacher.", error: error.message });
  }
});

// 5. Update Teacher Profile or Assignments
app.put('/api/teachers/:id', async (req, res) => {
  try {
    const { fullName, password, photo, assignments } = req.body;
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    if (fullName !== undefined) teacher.fullName = fullName;
    if (password !== undefined) teacher.password = password;
    if (photo !== undefined) teacher.photo = photo;
    if (assignments !== undefined) teacher.assignments = assignments;

    await teacher.save();
    res.json({ message: "Teacher updated successfully", teacher });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 6. Get all teachers
app.get('/api/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 7. Delete Teacher Account
app.delete('/api/teachers/:id', async (req, res) => {
  try {
    const deleted = await Teacher.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Teacher not found" });
    res.json({ message: "Teacher deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 8. Change Admin Password
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const teacher = await Teacher.findOne({ isAdmin: true }) || await Teacher.findOne();
    if (!teacher) {
      return res.status(404).json({ message: "Admin account not found." });
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

app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const { username, fullName, password, grade, section, phone, photo, isFirstLogin } = req.body;
    const existing = await Student.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "Student username already exists" });
    }

    const selectedGrade = grade || "11";
    const selectedSection = section || "A";
    const subjectList = getRequiredSubjects(selectedGrade, selectedSection);

    const initialResults = subjectList.map(subj => ({
      subject: subj,
      score: 0,
      grade: '-'
    }));

    const newStudent = new Student({ 
      username, 
      fullName, 
      password, 
      grade: selectedGrade, 
      section: selectedSection, 
      phone: phone || "",
      photo: photo || "",
      isFirstLogin: isFirstLogin !== undefined ? isFirstLogin : true,
      mustChangePassword: isFirstLogin !== undefined ? isFirstLogin : true,
      results: initialResults
    });

    await newStudent.save();
    res.status(201).json(newStudent);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const { password, results, fullName, phone, photo, isFirstLogin, mustChangePassword } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (password !== undefined) student.password = password;
    if (fullName !== undefined) student.fullName = fullName;
    if (phone !== undefined) student.phone = phone;
    if (photo !== undefined) student.photo = photo;
    if (isFirstLogin !== undefined) student.isFirstLogin = isFirstLogin;
    if (mustChangePassword !== undefined) student.mustChangePassword = mustChangePassword;

    if (results && Array.isArray(results)) {
      student.results = results.map(item => ({
        subject: item.subject,
        score: item.score,
        grade: calculateGrade(item.score)
      }));
    }

    await student.save();
    res.json({ message: "Student updated successfully", student });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.put('/api/students/:id/grades', async (req, res) => {
  try {
    const { subject, score } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    let letterGrade = calculateGrade(score);

    const existingResult = student.results.find(r => r.subject.toLowerCase() === subject.toLowerCase());
    if (existingResult) {
      existingResult.score = Number(score);
      existingResult.grade = letterGrade;
    } else {
      student.results.push({ subject, score: Number(score), grade: letterGrade });
    }

    await student.save();
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);
    if (!deletedStudent) return res.status(404).json({ message: "Student not found" });
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
