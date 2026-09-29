          teachersCache.push(data.teacher || { _id: Date.now().toString(), username, password, fullName, photo, assignments });
          renderAdminTeachersTable();
          msgDiv.className = "text-emerald-500 text-xs font-semibold";
          msgDiv.textContent = "Teacher registered successfully!";
          setTimeout(() => {
            closeModal('teacherModal');
            msgDiv.textContent = "";
            document.getElementById('newTeacherUser').value = "";
            document.getElementById('newTeacherPass').value = "";
            document.getElementById('newTeacherFullName').value = "";
            document.getElementById('newTeacherPhoto').value = "";
            document.getElementById('assignSubject').value = "";
            document.getElementById('assignGrades').value = "";
            document.getElementById('assignSections').value = "";
          }, 1000);
        } catch (err) {
          msgDiv.className = "text-red-500 text-xs font-semibold";
          msgDiv.textContent = err.message;
        }
      }

      /* REGISTER STUDENT */
      async function handleRegisterStudent(e) {
        e.preventDefault();
        const username = document.getElementById("regUsername").value.trim().toLowerCase();
        const fullName = document.getElementById("regFullName").value.trim();
        const password = document.getElementById("regPassword").value;
        const grade = document.getElementById("regGrade").value;
        const section = document.getElementById("regSection").value;
        const countryCode = document.getElementById("regCountryCode").value;
        const phoneNum = document.getElementById("regPhoneNumber").value.trim();
        const phone = `${countryCode}${phoneNum}`;
        const photo = document.getElementById("regPhoto").value.trim();
        const msgDiv = document.getElementById("regModalMsg");

        try {
          const response = await fetch(`${API_BASE_URL}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, fullName, password, grade, section, phone, photo, isFirstLogin: true })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to register student');

          studentsCache.push(data.student || data);
          buildFilterBars(studentsCache);
          renderFilteredStudentsDirectory();

          msgDiv.className = "text-emerald-500 text-xs font-semibold";
          msgDiv.textContent = "Student registered successfully!";
          setTimeout(() => {
            closeModal('addStudentModal');
            msgDiv.textContent = "";
            document.getElementById("regUsername").value = "";
            document.getElementById("regFullName").value = "";
            document.getElementById("regPassword").value = "";
            document.getElementById("regPhoneNumber").value = "";
            document.getElementById("regPhoto").value = "";
          }, 1000);
        } catch (err) {
          msgDiv.className = "text-red-500 text-xs font-semibold";
          msgDiv.textContent = err.message;
        }
      }

      /* CHANGE ADMIN PASSWORD */
      async function handleChangePassword(e) {
        e.preventDefault();
        const oldPassword = document.getElementById("oldPassword").value;
        const newPassword = document.getElementById("newPassword").value;
        const msgDiv = document.getElementById("pwdModalMsg");

        try {
          const response = await fetch(`${API_BASE_URL}/auth/change-admin-password`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentAuthToken}`
            },
            body: JSON.stringify({ oldPassword, newPassword })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Failed to update password');

          msgDiv.className = "text-emerald-500 text-xs font-semibold";
          msgDiv.textContent = "Admin password updated successfully!";
          setTimeout(() => {
            closeModal('passwordModal');
            msgDiv.textContent = "";
            document.getElementById("oldPassword").value = "";
            document.getElementById("newPassword").value = "";
          }, 1200);
        } catch (err) {
          msgDiv.className = "text-red-500 text-xs font-semibold";
          msgDiv.textContent = err.message;
        }
      }

      /* CSV BULK UPLOAD */
      async function handleCSVUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(event) {
          const text = event.target.result;
          const lines = text.split('\n').filter(line => line.trim() !== '');
          if (lines.length <= 1) {
            alert("CSV file is empty or missing content.");
            return;
          }

          const newStudents = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length >= 5) {
              newStudents.push({
                username: cols[0].toLowerCase(),
                fullName: cols[1],
                password: cols[2],
                grade: cols[3],
                section: cols[4].toUpperCase(),
                phone: cols[5] || '',
                photo: cols[6] || '',
                isFirstLogin: true
              });
            }
          }

          if (newStudents.length === 0) {
            alert("No valid student rows found in CSV.");
            return;
          }

          try {
            const response = await fetch(`${API_BASE_URL}/students/bulk-import`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ students: newStudents })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Bulk upload failed");

            alert(`Successfully imported ${data.count || newStudents.length} students!`);
            const studentRes = await fetch(`${API_BASE_URL}/students`);
            if (studentRes.ok) studentsCache = await studentRes.json();
            buildFilterBars(studentsCache);
            renderFilteredStudentsDirectory();
          } catch (err) {
            alert("CSV Upload Error: " + err.message);
          }
        };
        reader.readAsText(file);
      }

      /* DIRECTORY FILTERING & RENDERING */
      function togglePasswordsVisibility() {
        showPasswordsPlain = !showPasswordsPlain;
        document.getElementById("togglePasswordsBtn").textContent = showPasswordsPlain ? "🙈 Hide Passwords" : "👁️ Show Passwords";
        renderFilteredStudentsDirectory();
      }

      function buildFilterBars(students) {
        const gradeFilterBar = document.getElementById("gradeFilterBar");
        const sectionFilterBar = document.getElementById("sectionFilterBar");

        const grades = ['ALL', '9', '10', '11', '12'];
        gradeFilterBar.innerHTML = grades.map(g => `
          <button onclick="setGradeFilter('${g}')" class="px-3 py-1 rounded-lg text-xs font-semibold transition ${activeGradeFilter === g ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
            ${g === 'ALL' ? 'All Grades' : 'Grade ' + g}
          </button>
        `).join('');

        const sections = ['ALL', 'A', 'B', 'C', 'D'];
        sectionFilterBar.innerHTML = sections.map(s => `
          <button onclick="setSectionFilter('${s}')" class="px-3 py-1 rounded-lg text-xs font-semibold transition ${activeSectionFilter === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
            ${s === 'ALL' ? 'All Sections' : 'Sec ' + s}
          </button>
        `).join('');
      }

      function setGradeFilter(g) {
        activeGradeFilter = g;
        buildFilterBars(studentsCache);
        renderFilteredStudentsDirectory();
      }

      function setSectionFilter(s) {
        activeSectionFilter = s;
        buildFilterBars(studentsCache);
        renderFilteredStudentsDirectory();
      }

      function filterStudentsDirectory() {
        renderFilteredStudentsDirectory();
      }

      function renderFilteredStudentsDirectory() {
        const term = document.getElementById("searchInput").value.toLowerCase();
        const tbody = document.getElementById("adminStudentsTableBody");

        let filtered = studentsCache.filter(s => {
          const matchesGrade = activeGradeFilter === 'ALL' || String(s.grade) === String(activeGradeFilter);
          const matchesSec = activeSectionFilter === 'ALL' || String(s.section).toUpperCase() === String(activeSectionFilter).toUpperCase();
          const matchesTerm = (s.fullName || '').toLowerCase().includes(term) ||
                              (s.username || '').toLowerCase().includes(term) ||
                              (s.phone || '').toLowerCase().includes(term);
          return matchesGrade && matchesSec && matchesTerm;
        });

        document.getElementById("analyticsTotalStudents").textContent = filtered.length;
        let totalAvgSum = 0;
        let passCount = 0;
        let topStudent = null;
        let maxAvg = -1;

        filtered.forEach(s => {
          const res = s.results || s.grades || [];
          const stats = calculateStats(res);
          totalAvgSum += stats.avg;
          if (stats.pass) passCount++;
          if (stats.avg > maxAvg && res.length > 0) {
            maxAvg = stats.avg;
            topStudent = s.fullName;
          }
        });

        const classAvg = filtered.length > 0 ? (totalAvgSum / filtered.length).toFixed(1) : '0.0';
        const passRate = filtered.length > 0 ? Math.round((passCount / filtered.length) * 100) : 0;

        document.getElementById("analyticsClassAvg").textContent = `${classAvg}%`;
        document.getElementById("analyticsPassRate").textContent = `${passRate}%`;
        document.getElementById("analyticsTopStudent").textContent = topStudent ? `${topStudent} (${maxAvg}%)` : '-';

        tbody.innerHTML = "";
        if (filtered.length === 0) {
          tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-slate-400">No student records match the selected filters.</td></tr>`;
          return;
        }

        filtered.forEach(s => {
          const res = s.results || s.grades || [];
          const stats = calculateStats(res);
          const ranks = computeStudentRanks(studentsCache, s);
          const pwdDisplay = showPasswordsPlain ? s.password : '••••••••';
          const stream = getStudentStream(s.grade, s.section);

          tbody.innerHTML += `
            <tr onclick="viewStudentFromAdmin('${s._id}')" class="cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 transition">
              <td class="p-3.5">
                <div class="flex items-center gap-3">
                  ${getAvatarHTML(s, "w-10 h-10")}
                  <div>
                    <div class="font-bold text-slate-900 dark:text-white">${s.fullName}</div>
                    <div class="text-xs text-indigo-600 dark:text-indigo-400 font-mono">@${s.username}</div>
                  </div>
                </div>
              </td>
              <td class="p-3.5 font-mono text-xs font-semibold text-slate-500">${pwdDisplay}</td>
              <td class="p-3.5 text-xs font-mono">${s.phone ? `<a href="tel:${s.phone}" onclick="event.stopPropagation()" class="text-indigo-600 dark:text-indigo-400 hover:underline">📞 ${s.phone}</a>` : '<span class="text-slate-400">-</span>'}</td>
              <td class="p-3.5 text-xs font-medium">
                <span class="font-bold">Gr ${s.grade} - ${s.section}</span>
                <div class="text-[10px] text-slate-400">${stream}</div>
              </td>
              <td class="p-3.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">${ranks.sectionRankStr}</td>
              <td class="p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">${ranks.gradeRankStr}</td>
              <td class="p-3.5 text-xs font-bold">${stats.total} / ${stats.maxTotal}</td>
              <td class="p-3.5 text-xs">
                <span class="font-bold text-indigo-600 dark:text-indigo-400">${stats.avg}%</span>
                <span class="ml-2 px-2 py-0.5 rounded text-[10px] font-extrabold ${stats.pass ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'}">${stats.status}</span>
              </td>
              <td class="p-3.5 text-right">
                <div class="flex justify-end gap-2" onclick="event.stopPropagation()">
                  <button onclick="viewStudentFromAdmin('${s._id}')" class="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-semibold hover:bg-indigo-100">Edit / View</button>
                  <button onclick="deleteStudent('${s._id}')" class="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100">Delete</button>
                </div>
              </td>
            </tr>
          `;
        });
      }

      async function deleteStudent(studentId) {
        if (!confirm("Are you sure you want to permanently delete this student record?")) return;
        try {
          await fetch(`${API_BASE_URL}/students/${studentId}`, { method: 'DELETE' });
          studentsCache = studentsCache.filter(s => s._id !== studentId);
          buildFilterBars(studentsCache);
          renderFilteredStudentsDirectory();
        } catch (err) { alert("Failed to delete student."); }
      }

      /* ADMIN STUDENT EDITOR VIEW */
      function viewStudentFromAdmin(studentId) {
        selectedStudent = studentsCache.find(s => s._id === studentId);
        if (!selectedStudent) return;

        document.getElementById("teacherDashboardCard").classList.add("hidden");
        document.getElementById("studentDashboardCard").classList.remove("hidden");
        document.getElementById("teacherBackBtn").classList.remove("hidden");
        document.getElementById("teacherDashboardGradeSection").classList.remove("hidden");

        renderStudentDashboard(selectedStudent);
        renderAdminGradeEditor();
      }

      function backToTeacherPortal() {
        selectedStudent = null;
        document.getElementById("studentDashboardCard").classList.add("hidden");
        document.getElementById("teacherDashboardCard").classList.remove("hidden");
        document.getElementById("teacherBackBtn").classList.add("hidden");
        document.getElementById("teacherDashboardGradeSection").classList.add("hidden");
        renderFilteredStudentsDirectory();
      }

      function renderAdminGradeEditor() {
        if (!selectedStudent) return;

        document.getElementById("dashEditPhoneInput").value = selectedStudent.phone || "";
        document.getElementById("dashEditPhotoUrlInput").value = selectedStudent.photo || "";
        document.getElementById("teacherEditorStreamBadge").textContent = getStudentStream(selectedStudent.grade, selectedStudent.section);

        const tbody = document.getElementById("dashAdminGradesBody");
        tbody.innerHTML = "";

        const results = selectedStudent.results || selectedStudent.grades || [];
        if (results.length === 0) {
          tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">No subjects assigned yet. Use the field below to add custom subjects.</td></tr>`;
          return;
        }

        results.forEach((r, idx) => {
          tbody.innerHTML += `
            <tr>
              <td class="p-3 font-semibold">${r.subject}</td>
              <td class="p-3">
                <input type="number" id="dash_score_${idx}" min="0" max="100" value="${r.score}" class="w-28 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm font-bold focus:ring-2 focus:ring-indigo-600 focus:outline-none">
              </td>
              <td class="p-3">
                <span class="px-2 py-0.5 rounded text-xs font-bold ${r.score >= 50 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'}">
                  ${r.score >= 50 ? 'PASS' : 'FAIL'}
                </span>
              </td>
              <td class="p-3 text-right">
                <div class="flex justify-end gap-2">
                  <button type="button" onclick="saveAdminSubjectScore('${r.subject}', ${idx})" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs">Save</button>
                  <button type="button" onclick="deleteAdminSubject('${r.subject}')" class="px-2.5 py-1 bg-red-50 text-red-600 dark:bg-red-950/40 rounded-lg text-xs font-semibold hover:bg-red-100">Delete</button>
                </div>
              </td>
            </tr>
          `;
        });
      }

      async function saveAdminSubjectScore(subjectName, idx) {
        if (!selectedStudent) return;
        const scoreInput = document.getElementById(`dash_score_${idx}`);
        const score = parseInt(scoreInput.value);
        if (isNaN(score) || score < 0 || score > 100) {
          alert("Score must be between 0 and 100.");
          return;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/students/${selectedStudent._id}/grades`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject: subjectName, score })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message);

          selectedStudent.results = data.results || data.grades || [];
          const cachedIdx = studentsCache.findIndex(s => s._id === selectedStudent._id);
          if (cachedIdx !== -1) studentsCache[cachedIdx].results = selectedStudent.results;

          renderStudentDashboard(selectedStudent);
          renderAdminGradeEditor();
        } catch (err) { alert("Failed to save score: " + err.message); }
      }

      async function deleteAdminSubject(subjectName) {
        if (!selectedStudent || !confirm(`Delete ${subjectName} score for this student?`)) return;
        try {
          const response = await fetch(`${API_BASE_URL}/students/${selectedStudent._id}/grades/${encodeURIComponent(subjectName)}`, {
            method: 'DELETE'
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message);

          selectedStudent.results = data.results || data.grades || [];
          const cachedIdx = studentsCache.findIndex(s => s._id === selectedStudent._id);
          if (cachedIdx !== -1) studentsCache[cachedIdx].results = selectedStudent.results;

          renderStudentDashboard(selectedStudent);
          renderAdminGradeEditor();
        } catch (err) { alert("Failed to delete subject: " + err.message); }
      }

      async function addCustomSubject() {
        if (!selectedStudent) return;
        const name = document.getElementById("dashCustomSubjectName").value.trim();
        const scoreVal = document.getElementById("dashCustomSubjectScore").value;

        if (!name || scoreVal === '' || isNaN(scoreVal)) {
          alert("Please enter a valid subject name and score (0-100).");
          return;
        }
        const score = parseInt(scoreVal);
        if (score < 0 || score > 100) {
          alert("Score must be between 0 and 100.");
          return;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/students/${selectedStudent._id}/grades`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject: name, score })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message);

          selectedStudent.results = data.results || data.grades || [];
          const cachedIdx = studentsCache.findIndex(s => s._id === selectedStudent._id);
          if (cachedIdx !== -1) studentsCache[cachedIdx].results = selectedStudent.results;

          document.getElementById("dashCustomSubjectName").value = "";
          document.getElementById("dashCustomSubjectScore").value = "";

          renderStudentDashboard(selectedStudent);
          renderAdminGradeEditor();
        } catch (err) { alert("Failed to add subject: " + err.message); }
      }

      async function handleDashUpdateStudentDetails() {
        if (!selectedStudent) return;
        const phone = document.getElementById("dashEditPhoneInput").value.trim();
        const photo = document.getElementById("dashEditPhotoUrlInput").value.trim();

        try {
          const response = await fetch(`${API_BASE_URL}/students/${selectedStudent._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, photo })
          });
          if (!response.ok) throw new Error("Failed to update student details");

          selectedStudent.phone = phone;
          selectedStudent.photo = photo;
          const cachedIdx = studentsCache.findIndex(s => s._id === selectedStudent._id);
          if (cachedIdx !== -1) {
            studentsCache[cachedIdx].phone = phone;
            studentsCache[cachedIdx].photo = photo;
          }

          renderStudentDashboard(selectedStudent);
          alert("Student contact info & photograph updated successfully!");
        } catch (err) { alert("Failed to update details: " + err.message); }
      }

      /* STUDENT DASHBOARD RENDERING */
      function renderStudentDashboard(student) {
        document.getElementById("loginCard").classList.add("hidden");
        document.getElementById("studentDashboardCard").classList.remove("hidden");
        document.getElementById("logoutBtn").classList.remove("hidden");

        const stream = getStudentStream(student.grade, student.section);
        document.getElementById("studentNameDisplay").textContent = student.fullName;
        document.getElementById("studentMeta").textContent = `Grade ${student.grade || '9'} | Section ${student.section || 'A'} | ${stream}`;
        document.getElementById("studentSerialDisplay").textContent = `Serial No: HSS-TR-2026-${(student._id || '0000').slice(-6).toUpperCase()}`;
        document.getElementById("studentAvatarContainer").innerHTML = getAvatarHTML(student, "w-16 h-16 sm:w-20 sm:h-20");

        const results = student.results || student.grades || [];
        const stats = calculateStats(results);

        document.getElementById("studentTotalDisplay").textContent = `${stats.total} / ${stats.maxTotal}`;
        document.getElementById("studentAvgDisplay").textContent = `${stats.avg}%`;

        const statusBadge = document.getElementById("studentStatusBadge");
        if (results.length === 0) {
          statusBadge.innerHTML = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">No Data</span>`;
        } else if (stats.pass) {
          statusBadge.innerHTML = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">PASSED</span>`;
        } else {
          statusBadge.innerHTML = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">FAILED</span>`;
        }

        const ranks = computeStudentRanks(studentsCache, student);
        document.getElementById("studentSectionRankDisplay").textContent = ranks.sectionRankStr;
        document.getElementById("studentGradeRankDisplay").textContent = ranks.gradeRankStr;

        const tbody = document.getElementById("studentResultsBody");
        tbody.innerHTML = "";
        if (results.length === 0) {
          tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400">No grades registered yet.</td></tr>`;
        } else {
          results.forEach(r => {
            const score = Number(r.score) || 0;
            let letterGrade = 'F';
            if (score >= 90) letterGrade = 'A+';
            else if (score >= 80) letterGrade = 'A';
            else if (score >= 70) letterGrade = 'B';
            else if (score >= 60) letterGrade = 'C';
            else if (score >= 50) letterGrade = 'D';

            const isPass = score >= 50;

            tbody.innerHTML += `
              <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td class="p-3 sm:p-4 font-semibold text-slate-900 dark:text-white">${r.subject}</td>
                <td class="p-3 sm:p-4 font-mono font-bold">${score} / 100</td>
                <td class="p-3 sm:p-4 font-bold text-indigo-600 dark:text-indigo-400">${letterGrade}</td>
                <td class="p-3 sm:p-4">
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${isPass ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'}">
                    ${isPass ? 'PASS' : 'FAIL'}
                  </span>
                </td>
              </tr>
            `;
          });
        }

        const qrContainer = document.getElementById("qrcodeContainer");
        const qrImg = document.getElementById("certQrCode");
        if (qrContainer && qrImg) {
          const verifyData = encodeURIComponent(`HARBU SEC SCHOOL VERIFIED | Name: ${student.fullName} | ID: ${student._id} | Avg: ${stats.avg}%`);
          qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${verifyData}`;
          qrContainer.classList.remove("hidden");
        }
      }

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
            document.getElementById("studentEditPhotoUrl").value = activeStudent.photo || "";
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
          const response = await fetch(`${API_BASE_URL}/students/${activeStudent._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error("Failed to update profile");

          activeStudent.fullName = fullName;
          activeStudent.phone = phone;
          activeStudent.photo = photo;
          if (password) activeStudent.password = password;

          const cachedIdx = studentsCache.findIndex(s => s._id === activeStudent._id);
          if (cachedIdx !== -1) {
            studentsCache[cachedIdx].fullName = fullName;
            studentsCache[cachedIdx].phone = phone;
            studentsCache[cachedIdx].photo = photo;
          }

          renderStudentDashboard(activeStudent);
          msgDiv.className = "text-emerald-500 font-semibold";
          msgDiv.textContent = "Profile updated successfully!";
          setTimeout(() => toggleStudentSettings(), 1200);
        } catch (err) {
          msgDiv.className = "text-red-500 font-semibold";
          msgDiv.textContent = "Error: " + err.message;
        }
      }

      /* LOGOUT */
      function logout() {
        currentAuthToken = null;
        loggedInStudent = null;
        loggedInPortalTeacher = null;
        selectedStudent = null;

        document.getElementById("studentDashboardCard").classList.add("hidden");
        document.getElementById("portalTeacherDashboardCard").classList.add("hidden");
        document.getElementById("teacherDashboardCard").classList.add("hidden");
        document.getElementById("logoutBtn").classList.add("hidden");
        document.getElementById("loginCard").classList.remove("hidden");

        document.getElementById("studentFirstName").value = "";
        document.getElementById("studentPassword").value = "";
        document.getElementById("portalTeacherUsername").value = "";
        document.getElementById("portalTeacherPassword").value = "";
        document.getElementById("adminUsername").value = "";
        document.getElementById("adminPassword").value = "";

        switchRole('student');
      }
  </script>
</body>
</html>
