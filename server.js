    async function fetchAndRenderTeacherPortal() {  
      document.getElementById("loginCard").classList.add("hidden");  
      document.getElementById("teacherDashboardCard").classList.remove("hidden");  
      document.getElementById("logoutBtn").classList.remove("hidden");  
  
      try {  
        const [studentsRes, teachersRes] = await Promise.all([  
          fetch(`${API_BASE_URL}/students`, { headers: { 'Authorization': `Bearer ${currentAuthToken}` } }),  
          fetch(`${API_BASE_URL}/teachers`, { headers: { 'Authorization': `Bearer ${currentAuthToken}` } })  
        ]);  
        if (studentsRes.ok) studentsCache = await studentsRes.json();  
        if (teachersRes.ok) teachersCache = await teachersRes.json();  
      } catch (err) {  
        console.error("Error fetching data:", err);  
      }  
  
      renderAdminDashboard();  
    }  

    function renderAdminDashboard() {  
      renderAdminTeachersTable();  
      renderGradeFilterBar();  
      renderSectionFilterBar();  
      filterStudentsDirectory();  
    }  

    function renderAdminTeachersTable() {  
      const tbody = document.getElementById("adminTeachersTableBody");  
      tbody.innerHTML = "";  
      if (!teachersCache || teachersCache.length === 0) {  
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">No registered teachers found.</td></tr>`;  
        return;  
      }  
      teachersCache.forEach(t => {  
        const assignmentsStr = (t.assignments || []).map(a =>   
          `<span class="inline-block bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded text-xs font-semibold mr-1 mb-1 border border-indigo-200 dark:border-indigo-900">${a.subject} (Grades: ${a.grades ? a.grades.join(',') : ''} | Sec: ${a.sections ? a.sections.join(',') : ''})</span>`  
        ).join('') || '<span class="text-slate-400 text-xs">None</span>';  
  
        tbody.innerHTML += `  
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">  
            <td class="p-3">  
              <div class="flex items-center gap-2">  
                ${getAvatarHTML(t, "w-8 h-8")}  
                <div>  
                  <div class="font-bold text-slate-900 dark:text-white">${t.fullName || t.username}</div>  
                  <div class="text-xs text-slate-400 font-mono">@${t.username}</div>  
                </div>  
              </div>  
            </td>  
            <td class="p-3 font-mono text-xs">${t.username} / <span class="text-slate-400">${t.password ? '••••••••' : 'N/A'}</span></td>  
            <td class="p-3">${assignmentsStr}</td>  
            <td class="p-3 text-right">  
              <button onclick="deleteTeacher('${t._id}')" class="px-2.5 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded text-xs font-semibold transition">Delete</button>  
            </td>  
          </tr>  
        `;  
      });  
    }  

    function renderGradeFilterBar() {  
      const bar = document.getElementById("gradeFilterBar");  
      const grades = ['ALL', '9', '10', '11', '12'];  
      bar.innerHTML = grades.map(g => {  
        const isActive = activeGradeFilter === g;  
        const activeClass = isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200';  
        return `<button onclick="setGradeFilter('${g}')" class="px-3 py-1 rounded-lg text-xs font-semibold transition ${activeClass}">${g === 'ALL' ? 'All Grades' : 'Grade ' + g}</button>`;  
      }).join('');  
    }  

    function setGradeFilter(grade) {  
      activeGradeFilter = grade;  
      renderGradeFilterBar();  
      filterStudentsDirectory();  
    }  

    function renderSectionFilterBar() {  
      const bar = document.getElementById("sectionFilterBar");  
      const sections = ['ALL', 'A', 'B', 'C', 'D'];  
      bar.innerHTML = sections.map(s => {  
        const isActive = activeSectionFilter === s;  
        const activeClass = isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200';  
        return `<button onclick="setSectionFilter('${s}')" class="px-3 py-1 rounded-lg text-xs font-semibold transition ${activeClass}">${s === 'ALL' ? 'All Sections' : 'Section ' + s}</button>`;  
      }).join('');  
    }  

    function setSectionFilter(section) {  
      activeSectionFilter = section;  
      renderSectionFilterBar();  
      filterStudentsDirectory();  
    }  

    function filterStudentsDirectory() {  
      const query = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();  
      const filtered = studentsCache.filter(s => {  
        const matchesGrade = activeGradeFilter === 'ALL' || String(s.grade) === activeGradeFilter;  
        const matchesSection = activeSectionFilter === 'ALL' || String(s.section).toUpperCase() === activeSectionFilter;  
        const matchesQuery = !query ||   
          (s.fullName && s.fullName.toLowerCase().includes(query)) ||   
          (s.username && s.username.toLowerCase().includes(query)) ||   
          (s.phone && s.phone.toLowerCase().includes(query));  
        return matchesGrade && matchesSection && matchesQuery;  
      });  

      updateAnalytics(filtered);  
      renderAdminStudentsTable(filtered);  
    }  

    function updateAnalytics(filteredList) {  
      document.getElementById("analyticsTotalStudents").textContent = filteredList.length;  
      if (filteredList.length === 0) {  
        document.getElementById("analyticsClassAvg").textContent = "0.0%";  
        document.getElementById("analyticsPassRate").textContent = "0%";  
        document.getElementById("analyticsTopStudent").textContent = "-";  
        return;  
      }  

      let totalAvgSum = 0;  
      let passCount = 0;  
      let topStudent = null;  
      let topAvg = -1;  

      filteredList.forEach(s => {  
        const res = s.results || s.grades || [];  
        const stats = calculateStats(res);  
        totalAvgSum += stats.avg;  
        if (stats.pass) passCount++;  
        if (stats.avg > topAvg && res.length > 0) {  
          topAvg = stats.avg;  
          topStudent = s;  
        }  
      });  

      const classAvg = (totalAvgSum / filteredList.length).toFixed(1);  
      const passRate = Math.round((passCount / filteredList.length) * 100);  

      document.getElementById("analyticsClassAvg").textContent = `${classAvg}%`;  
      document.getElementById("analyticsPassRate").textContent = `${passRate}%`;  
      document.getElementById("analyticsTopStudent").textContent = topStudent ? topStudent.fullName : "-";  
    }  

    function renderAdminStudentsTable(studentsList) {  
      const tbody = document.getElementById("adminStudentsTableBody");  
      tbody.innerHTML = "";  
      if (!studentsList || studentsList.length === 0) {  
        tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-slate-400">No students found.</td></tr>`;  
        return;  
      }  

      studentsList.forEach(s => {  
        const res = s.results || s.grades || [];  
        const stats = calculateStats(res);  
        const ranks = computeStudentRanks(studentsCache, s);  
        const pwdDisplay = showPasswordsPlain ? s.password : '••••••••';  
        const phoneDisplay = s.phone ? `<a href="tel:${s.phone}" class="text-indigo-600 dark:text-indigo-400 hover:underline font-mono">${s.phone}</a>` : '<span class="text-slate-400">-</span>';  
        const stream = getStudentStream(s.grade, s.section);  

        tbody.innerHTML += `  
          <tr class="hover:bg-indigo-50/40 dark:hover:bg-slate-800/60 transition cursor-pointer" onclick="openAdminGradeEditor('${s._id}')">  
            <td class="p-3.5">  
              <div class="flex items-center gap-3">  
                ${getAvatarHTML(s, "w-9 h-9")}  
                <div>  
                  <div class="font-bold text-slate-900 dark:text-white">${s.fullName}</div>  
                  <div class="text-xs text-slate-400 font-mono">@${s.username}</div>  
                </div>  
              </div>  
            </td>  
            <td class="p-3.5 font-mono text-xs">${pwdDisplay}</td>  
            <td class="p-3.5 text-xs" onclick="event.stopPropagation()">${phoneDisplay}</td>  
            <td class="p-3.5 text-xs">  
              <div class="font-bold">Gr ${s.grade} - Sec ${s.section}</div>  
              <div class="text-[10px] text-slate-400 truncate max-w-[130px]">${stream}</div>  
            </td>  
            <td class="p-3.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">${ranks.sectionRankStr}</td>  
            <td class="p-3.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">${ranks.gradeRankStr}</td>  
            <td class="p-3.5 text-xs font-black">${stats.total} / ${stats.maxTotal}</td>  
            <td class="p-3.5 text-xs">  
              <div class="font-bold text-indigo-600 dark:text-indigo-400">${stats.avg}%</div>  
              <span class="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${stats.pass ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'}">${stats.status}</span>  
            </td>  
            <td class="p-3.5 text-right" onclick="event.stopPropagation()">  
              <button onclick="openAdminGradeEditor('${s._id}')" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 rounded text-xs font-semibold mr-1 transition">Edit Grades</button>  
              <button onclick="deleteStudent('${s._id}')" class="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 rounded text-xs font-semibold transition">Delete</button>  
            </td>  
          </tr>  
        `;  
      });  
    }  

    function togglePasswordsVisibility() {  
      showPasswordsPlain = !showPasswordsPlain;  
      const btn = document.getElementById("togglePasswordsBtn");  
      btn.textContent = showPasswordsPlain ? "🙈 Hide Passwords" : "👁️ Show Passwords";  
      filterStudentsDirectory();  
    }  

    /* ADMIN GRADE EDITOR SECTION */  
    function openAdminGradeEditor(studentId) {  
      selectedStudent = studentsCache.find(s => s._id === studentId);  
      if (!selectedStudent) return;  

      renderStudentDashboard(selectedStudent, true);  
      renderAdminGradeEditorTable();  
    }  

    function renderAdminGradeEditorTable() {  
      if (!selectedStudent) return;  
      const gradeSec = document.getElementById("teacherDashboardGradeSection");  
      gradeSec.classList.remove("hidden");  
      gradeSec.scrollIntoView({ behavior: 'smooth' });  

      document.getElementById("teacherEditorStreamBadge").textContent = getStudentStream(selectedStudent.grade, selectedStudent.section);  
      document.getElementById("dashEditPhoneInput").value = selectedStudent.phone || "";  
      document.getElementById("dashEditPhotoUrlInput").value = selectedStudent.photo || selectedStudent.photoUrl || "";  

      const results = selectedStudent.results || selectedStudent.grades || [];  
      const tbody = document.getElementById("dashAdminGradesBody");  
      tbody.innerHTML = "";  

      if (results.length === 0) {  
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">No subject scores recorded yet. Add custom subject below.</td></tr>`;  
        return;  
      }  

      results.forEach(r => {  
        const safeSub = r.subject.replace(/\s+/g, '_');  
        tbody.innerHTML += `  
          <tr>  
            <td class="p-3 font-semibold text-slate-800 dark:text-slate-200">${r.subject}</td>  
            <td class="p-3">  
              <input type="number" id="dash_score_${safeSub}" min="0" max="100" value="${r.score}" class="w-24 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:ring-2 focus:ring-indigo-600 focus:outline-none">  
            </td>  
            <td class="p-3">  
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${r.score >= 50 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'}">${r.score >= 50 ? 'PASS' : 'FAIL'}</span>  
            </td>  
            <td class="p-3 text-right">  
              <button onclick="saveAdminSubjectScore('${r.subject}')" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold mr-1 transition shadow-xs">Save</button>  
              <button onclick="deleteAdminSubjectScore('${r.subject}')" class="px-2.5 py-1 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded text-xs font-semibold hover:bg-red-200 transition">Delete</button>  
            </td>  
          </tr>  
        `;  
      });  
    }  

    async function saveAdminSubjectScore(subjectName) {  
      if (!selectedStudent) return;  
      const safeSub = subjectName.replace(/\s+/g, '_');  
      const scoreVal = document.getElementById(`dash_score_${safeSub}`)?.value;  
      if (scoreVal === "" || isNaN(scoreVal)) {  
        alert("Please enter a valid score.");  
        return;  
      }  
      const score = parseInt(scoreVal);  

      try {  
        const res = await fetch(`${API_BASE_URL}/students/${selectedStudent._id}/grades`, {  
          method: 'PUT',  
          headers: { 'Content-Type': 'application/json' },  
          body: JSON.stringify({ subject: subjectName, score })  
        });  
        const data = await res.json();  
        if (!res.ok) throw new Error(data.message);  

        selectedStudent.results = data.results || data.grades || [];  
        const idx = studentsCache.findIndex(s => s._id === selectedStudent._id);  
        if (idx !== -1) studentsCache[idx].results = selectedStudent.results;  

        renderStudentDashboard(selectedStudent, true);  
        renderAdminGradeEditorTable();  
        filterStudentsDirectory();  
      } catch (err) {  
        alert("Error saving score: " + err.message);  
      }  
    }  

    async function deleteAdminSubjectScore(subjectName) {  
      if (!selectedStudent || !confirm(`Delete ${subjectName} score for ${selectedStudent.fullName}?`)) return;  
      try {  
        const res = await fetch(`${API_BASE_URL}/students/${selectedStudent._id}/grades/${encodeURIComponent(subjectName)}`, {  
          method: 'DELETE'  
        });  
        const data = await res.json();  
        if (!res.ok) throw new Error(data.message);  

        selectedStudent.results = data.results || data.grades || [];  
        const idx = studentsCache.findIndex(s => s._id === selectedStudent._id);  
        if (idx !== -1) studentsCache[idx].results = selectedStudent.results;  

        renderStudentDashboard(selectedStudent, true);  
        renderAdminGradeEditorTable();  
        filterStudentsDirectory();  
      } catch (err) {  
        alert("Error deleting subject: " + err.message);  
      }  
    }  

    async function addCustomSubject() {  
      if (!selectedStudent) return;  
      const subName = document.getElementById("dashCustomSubjectName").value.trim();  
      const scoreVal = document.getElementById("dashCustomSubjectScore").value;  

      if (!subName || scoreVal === "") {  
        alert("Please provide both subject name and score.");  
        return;  
      }  

      await saveAdminSubjectScore(subName);  
      document.getElementById("dashCustomSubjectName").value = "";  
      document.getElementById("dashCustomSubjectScore").value = "";  
    }  

    async function handleDashUpdateStudentDetails() {  
      if (!selectedStudent) return;  
      const phone = document.getElementById("dashEditPhoneInput").value.trim();  
      const photo = document.getElementById("dashEditPhotoUrlInput").value.trim();  

      try {  
        const res = await fetch(`${API_BASE_URL}/students/${selectedStudent._id}`, {  
          method: 'PUT',  
          headers: { 'Content-Type': 'application/json' },  
          body: JSON.stringify({ phone, photo })  
        });  
        if (!res.ok) throw new Error("Failed to update details");  

        selectedStudent.phone = phone;  
        selectedStudent.photo = photo;  
        const idx = studentsCache.findIndex(s => s._id === selectedStudent._id);  
        if (idx !== -1) {  
          studentsCache[idx].phone = phone;  
          studentsCache[idx].photo = photo;  
        }  

        renderStudentDashboard(selectedStudent, true);  
        filterStudentsDirectory();  
        alert("Contact & Photo updated successfully!");  
      } catch (err) {  
        alert("Error: " + err.message);  
      }  
    }  

    /* RENDER STUDENT DASHBOARD / TRANSCRIPT CERTIFICATE */  
    function renderStudentDashboard(student, isAdminView = false) {  
      document.getElementById("loginCard").classList.add("hidden");  
      document.getElementById("studentDashboardCard").classList.remove("hidden");  
      document.getElementById("logoutBtn").classList.remove("hidden");  

      const backBtn = document.getElementById("teacherBackBtn");  
      if (isAdminView) {  
        backBtn.classList.remove("hidden");  
      } else {  
        backBtn.classList.add("hidden");  
      }  

      const stream = getStudentStream(student.grade, student.section);  
      document.getElementById("studentNameDisplay").textContent = student.fullName;  
      document.getElementById("studentMeta").textContent = `Grade ${student.grade || '9'} | Section ${student.section || 'A'} | ${stream}`;  
      document.getElementById("studentSerialDisplay").textContent = `Serial No: HSS-TR-2026-${student._id ? student._id.substring(student._id.length - 6).toUpperCase() : '000000'}`;  
      document.getElementById("studentAvatarContainer").innerHTML = getAvatarHTML(student, "w-16 h-16 sm:w-20 sm:h-20");  

      const qrImg = document.getElementById("certQrCode");  
      if (qrImg) {  
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=HSS-VERIFY-${student._id}`;  
        document.getElementById("qrcodeContainer").classList.remove("hidden");  
      }  

      const results = student.results || student.grades || [];  
      const stats = calculateStats(results);  
      const ranks = computeStudentRanks(studentsCache, student);  

      document.getElementById("studentTotalDisplay").textContent = `${stats.total} / ${stats.maxTotal}`;  
      document.getElementById("studentAvgDisplay").textContent = `${stats.avg}%`;  

      const statusBadge = document.getElementById("studentStatusBadge");  
      statusBadge.innerHTML = stats.pass   
        ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">PASSED</span>`  
        : `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">FAILED</span>`;  

      document.getElementById("studentSectionRankDisplay").textContent = ranks.sectionRankStr;  
      document.getElementById("studentGradeRankDisplay").textContent = ranks.gradeRankStr;  

      const tbody = document.getElementById("studentResultsBody");  
      tbody.innerHTML = "";  

      if (results.length === 0) {  
        tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400">No grades uploaded yet. Check back later.</td></tr>`;  
        return;  
      }  

      results.forEach(r => {  
        const letter = r.score >= 90 ? 'A+' : r.score >= 80 ? 'A' : r.score >= 70 ? 'B' : r.score >= 60 ? 'C' : r.score >= 50 ? 'D' : 'F';  
        tbody.innerHTML += `  
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">  
            <td class="p-3.5 font-bold text-slate-900 dark:text-white">${r.subject}</td>  
            <td class="p-3.5 font-extrabold text-indigo-600 dark:text-indigo-400 text-base">${r.score} / 100</td>  
            <td class="p-3.5 font-bold">${letter}</td>  
            <td class="p-3.5">  
              <span class="px-2 py-0.5 rounded text-xs font-bold ${r.score >= 50 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'}">${r.score >= 50 ? 'PASS' : 'FAIL'}</span>  
            </td>  
          </tr>  
        `;  
      });  
    }  

    /* STUDENT PROFILE SETTINGS TOGGLE & UPDATE */  
    function toggleStudentSettings() {  
      const resultsView = document.getElementById("studentResultsView");  
      const settingsView = document.getElementById("studentSettingsView");  
      const isOpen = !settingsView.classList.contains("hidden");  

      if (isOpen) {  
        settingsView.classList.add("hidden");  
        resultsView.classList.remove("hidden");  
      } else {  
        resultsView.classList.add("hidden");  
        settingsView.classList.remove("hidden");  
        const activeStudent = loggedInStudent || selectedStudent;  
        if (activeStudent) {  
          document.getElementById("studentEditFullName").value = activeStudent.fullName || "";  
          document.getElementById("studentEditPhone").value = activeStudent.phone || "";  
          document.getElementById("studentEditPhotoUrl").value = activeStudent.photo || activeStudent.photoUrl || "";  
          document.getElementById("studentEditPassword").value = "";  
          document.getElementById("studentSettingsMsg").textContent = "";  
        }  
      }  
    }  

    async function handleStudentProfileUpdate(e) {  
      e.preventDefault();  
      const activeStudent = loggedInStudent || selectedStudent;  
      if (!activeStudent) return;  

      const fullName = document.getElementById("studentEditFullName").value.trim();  
      const phone = document.getElementById("studentEditPhone").value.trim();  
      const photo = document.getElementById("studentEditPhotoUrl").value.trim();  
      const password = document.getElementById("studentEditPassword").value;  
      const msgDiv = document.getElementById("studentSettingsMsg");  

      const payload = { fullName, phone, photo };  
      if (password && password.length >= 4) payload.password = password;  

      try {  
        const res = await fetch(`${API_BASE_URL}/students/${activeStudent._id}`, {  
          method: 'PUT',  
          headers: { 'Content-Type': 'application/json' },  
          body: JSON.stringify(payload)  
        });  
        if (!res.ok) throw new Error("Failed to update student profile");  

        activeStudent.fullName = fullName;  
        activeStudent.phone = phone;  
        activeStudent.photo = photo;  
        if (password) activeStudent.password = password;  

        renderStudentDashboard(activeStudent, !!selectedStudent);  
        msgDiv.className = "text-emerald-500 font-semibold";  
        msgDiv.textContent = "Profile updated successfully!";  
        setTimeout(() => toggleStudentSettings(), 1200);  
      } catch (err) {  
        msgDiv.className = "text-red-500 font-semibold";  
        msgDiv.textContent = "Error: " + err.message;  
      }  
    }  

    /* MODAL ACTION HANDLERS */  
    async function handleRegisterStudent(e) {  
      e.preventDefault();  
      const username = document.getElementById("regUsername").value.trim();  
      const fullName = document.getElementById("regFullName").value.trim();  
      const password = document.getElementById("regPassword").value.trim();  
      const grade = document.getElementById("regGrade").value;  
      const section = document.getElementById("regSection").value;  
      const countryCode = document.getElementById("regCountryCode").value;  
      const phoneNum = document.getElementById("regPhoneNumber").value.trim();  
      const photo = document.getElementById("regPhoto").value.trim();  
      const msgDiv = document.getElementById("regModalMsg");  

      const phone = phoneNum ? `${countryCode}${phoneNum}` : "";  

      try {  
        const res = await fetch(`${API_BASE_URL}/students`, {  
          method: 'POST',  
          headers: { 'Content-Type': 'application/json' },  
          body: JSON.stringify({ username, fullName, password, grade, section, phone, photo, isFirstLogin: true })  
        });  
        const data = await res.json();  
        if (!res.ok) throw new Error(data.message || 'Registration failed');  

        studentsCache.push(data.student || data);  
        closeModal('addStudentModal');  
        filterStudentsDirectory();  
        alert(`Student ${fullName} registered successfully!`);  
      } catch (err) {  
        msgDiv.className = "text-red-500 text-xs font-semibold";  
        msgDiv.textContent = err.message;  
      }  
    }  

    async function handleRegisterTeacher(e) {  
      e.preventDefault();  
      const username = document.getElementById("newTeacherUser").value.trim();  
      const password = document.getElementById("newTeacherPass").value;  
      const fullName = document.getElementById("newTeacherFullName").value.trim();  
      const photo = document.getElementById("newTeacherPhoto").value.trim();  
      const subject = document.getElementById("assignSubject").value.trim();  
      const gradesStr = document.getElementById("assignGrades").value.trim();  
      const sectionsStr = document.getElementById("assignSections").value.trim();  
      const msgDiv = document.getElementById("teacherModalMsg");  

      const assignments = [];  
      if (subject) {  
        const grades = gradesStr ? gradesStr.split(',').map(g => g.trim()) : ['9', '10', '11', '12'];  
        const sections = sectionsStr ? sectionsStr.split(',').map(s => s.trim().toUpperCase()) : ['A', 'B', 'C', 'D'];  
        assignments.push({ subject, grades, sections });  
      }  

      try {  
        const res = await fetch(`${API_BASE_URL}/teachers`, {  
          method: 'POST',  
          headers: { 'Content-Type': 'application/json' },  
          body: JSON.stringify({ username, password, fullName, photo, assignments })  
        });  
        const data = await res.json();  
        if (!res.ok) throw new Error(data.message || 'Teacher registration failed');  

        teachersCache.push(data.teacher || data);  
        closeModal('teacherModal');  
        renderAdminTeachersTable();  
        alert(`Teacher ${fullName || username} registered successfully!`);  
      } catch (err) {  
        msgDiv.className = "text-red-500 text-xs font-semibold";  
        msgDiv.textContent = err.message;  
      }  
    }  

    async function handleChangePassword(e) {  
      e.preventDefault();  
      const oldPassword = document.getElementById("oldPassword").value;  
      const newPassword = document.getElementById("newPassword").value;  
      const msgDiv = document.getElementById("pwdModalMsg");  

      try {  
        const res = await fetch(`${API_BASE_URL}/auth/change-admin-password`, {  
          method: 'PUT',  
          headers: {   
            'Content-Type': 'application/json',  
            'Authorization': `Bearer ${currentAuthToken}`  
          },  
          body: JSON.stringify({ oldPassword, newPassword })  
        });  
        if (!res.ok) throw new Error("Password change failed. Check old password.");  

        closeModal('passwordModal');  
        alert("Admin password updated successfully!");  
      } catch (err) {  
        msgDiv.className = "text-red-500 text-xs font-semibold";  
        msgDiv.textContent = err.message;  
      }  
    }  

    async function handleCSVUpload(e) {  
      const file = e.target.files[0];  
      if (!file) return;  

      const reader = new FileReader();  
      reader.onload = async function(evt) {  
        const lines = evt.target.result.split('\n').filter(l => l.trim() !== '');  
        let successCount = 0;  

        for (let i = 0; i < lines.length; i++) {  
          const cols = lines[i].split(',').map(c => c.trim());  
          if (cols.length < 5) continue;  
          const [username, fullName, password, grade, section, phone, photo] = cols;  

          try {  
            const res = await fetch(`${API_BASE_URL}/students`, {  
              method: 'POST',  
              headers: { 'Content-Type': 'application/json' },  
              body: JSON.stringify({ username, fullName, password, grade, section, phone: phone || '', photo: photo || '', isFirstLogin: true })  
            });  
            if (res.ok) {  
              const data = await res.json();  
              studentsCache.push(data.student || data);  
              successCount++;  
            }  
          } catch (err) {}  
        }  

        alert(`Successfully imported ${successCount} students via CSV!`);  
        filterStudentsDirectory();  
        e.target.value = "";  
      };  
      reader.readAsText(file);  
    }  

    async function deleteStudent(studentId) {  
      if (!confirm("Are you sure you want to delete this student profile?")) return;  
      try {  
        const res = await fetch(`${API_BASE_URL}/students/${studentId}`, { method: 'DELETE' });  
        if (!res.ok) throw new Error("Failed to delete student");  

        studentsCache = studentsCache.filter(s => s._id !== studentId);  
        if (selectedStudent && selectedStudent._id === studentId) {  
          selectedStudent = null;  
          document.getElementById("studentDashboardCard").classList.add("hidden");  
          document.getElementById("teacherDashboardGradeSection").classList.add("hidden");  
        }  
        filterStudentsDirectory();  
      } catch (err) {  
        alert("Delete failed: " + err.message);  
      }  
    }  

    async function deleteTeacher(teacherId) {  
      if (!confirm("Are you sure you want to remove this teacher assignment?")) return;  
      try {  
        const res = await fetch(`${API_BASE_URL}/teachers/${teacherId}`, { method: 'DELETE' });  
        if (!res.ok) throw new Error("Failed to delete teacher");  

        teachersCache = teachersCache.filter(t => t._id !== teacherId);  
        renderAdminTeachersTable();  
      } catch (err) {  
        alert("Delete failed: " + err.message);  
      }  
    }  

    /* LOGOUT & NAVIGATION */  
    function logout() {  
      currentAuthToken = null;  
      loggedInStudent = null;  
      loggedInPortalTeacher = null;  
      selectedStudent = null;  

      document.getElementById("loginCard").classList.remove("hidden");  
      document.getElementById("portalTeacherDashboardCard").classList.add("hidden");  
      document.getElementById("studentDashboardCard").classList.add("hidden");  
      document.getElementById("teacherDashboardCard").classList.add("hidden");  
      document.getElementById("teacherDashboardGradeSection").classList.add("hidden");  
      document.getElementById("logoutBtn").classList.add("hidden");  

      document.getElementById("studentFirstName").value = "";  
      document.getElementById("studentPassword").value = "";  
      document.getElementById("portalTeacherUsername").value = "";  
      document.getElementById("portalTeacherPassword").value = "";  
      document.getElementById("adminUsername").value = "";  
      document.getElementById("adminPassword").value = "";  
    }  

    function backToTeacherPortal() {  
      selectedStudent = null;  
      document.getElementById("studentDashboardCard").classList.add("hidden");  
      document.getElementById("teacherDashboardGradeSection").classList.add("hidden");  
      document.getElementById("teacherDashboardCard").classList.remove("hidden");  
    }  
  </script>  
</body>  
</html>
