import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
  getFirestore, collection, getDocs, query, where, doc, getDoc, addDoc, setDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// --- 1) Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyAznHzrOLmLvI98_0P649Tx5TZEwXaNNBs",
  authDomain: "rosec-57d1d.firebaseapp.com",
  projectId: "rosec-57d1d",
  storageBucket: "rosec-57d1d.appspot.com",
  messagingSenderId: "994663054798",
  appId: "1:994663054798:web:6214585d90b6fcc583bf9f",
  measurementId: "G-LM6RHY4WTZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- 2) Helpers ---
const $ = (id) => document.getElementById(id);
const setStatus = (msg) => $('status').textContent = msg;
const setCount = (n) => $('count').textContent = `${n} student${n===1?'':'s'}`;
const qs = new URLSearchParams(location.search);

// Preload URL params into fields
['classId','subjectId'].forEach(k=>{
  if (qs.get(k)) $(k).value = qs.get(k);
});

// DOM Elements for user dropdown
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userRoleEl = document.getElementById('user-role');
const userIconBtn = document.getElementById('userIconBtn');
const userDropdown = document.getElementById('userDropdown');

// User dropdown toggle - with null checks
if (userIconBtn && userDropdown) {
  userIconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('show');
  });
  document.addEventListener('click', () => userDropdown.classList.remove('show'));
}

// Logout - with null check
const signOutBtn = document.getElementById('signOutBtn');
if (signOutBtn) {
  signOutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
      window.location.href = 'index.html';
    }).catch(error => {
      console.error('Log out error:', error);
      alert('Failed to log out. Please try again.');
    });
  });
}

// Auth state - with null checks
onAuthStateChanged(auth, async (user) => {
  const el = $('authStatus');
  if (user) {
    if (el) {
      el.textContent = 'Authenticated'; 
      el.classList.add('ok','badge');
    }
    
    if (userNameEl) userNameEl.textContent = user.displayName || 'User Name:';
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userRoleEl) userRoleEl.textContent = 'Role: Teacher';
  } else {
    if (el) {
      el.textContent = 'Not signed in'; 
      el.classList.add('warn');
    }
    
    if (userNameEl) userNameEl.textContent = 'User Name';
    if (userEmailEl) userEmailEl.textContent = 'user@example.com';
    if (userRoleEl) userRoleEl.textContent = 'Role: N/A';
  }
});

// --- 3) Data loaders ---
async function getClassMembers(classId, subjectId) {
  const cmRef = collection(db, 'classMembers');
  const qy = query(cmRef, where('classId','==', classId), where('subjectId','==', subjectId));
  const snap = await getDocs(qy);
  return snap.docs.map(d=>({ id: d.id, ...d.data() }));
}

async function getStudentName(studentId) {
  const studentsRef = collection(db, 'students');
  const q = query(studentsRef, where('studentId','==', studentId));
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].data().name || studentId;
  return studentId;
}

async function getAcademicIdFromClass(classId) {
  let classRef = doc(db, 'classes', classId);
  let classSnap = await getDoc(classRef);
  if (classSnap.exists()) return classSnap.data().academicId || null;

  const q = query(collection(db, 'classes'), where('classId','==',classId));
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].data().academicId || null;
  console.warn('Class not found:', classId);
  return null;
}

// --- 4) Get teacher name ---
async function getTeacherName(email) {
  if (!email) return 'Unknown';
  const q = query(collection(db, 'teachers'), where('email', '==', email));
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].data().name || email;
  return email;
}

// --- 5) Academic period names ---
async function getAcademicPeriod(academicId) {
  const base = { term: '', semester: '', schoolYear: '' };
  if (!academicId) return base;

  const snap = await getDoc(doc(db, 'academicyear', academicId));
  if (!snap.exists()) return base;
  const data = snap.data();

  const termSelect = $('term');
  const semesterSelect = $('semester');

  let termId = termSelect?.value;
  let semId = semesterSelect?.value;

  let semesterName = '';
  let selectedSemester = null;
  if (data.semesters && Array.isArray(data.semesters) && data.semesters.length) {
    selectedSemester = data.semesters.find(s => s.semId === semId);
    if (!selectedSemester) selectedSemester = data.semesters[0];
    semesterName = selectedSemester.semLabel;
  }

  let termName = '';
  if (selectedSemester && selectedSemester.terms && Array.isArray(selectedSemester.terms) && selectedSemester.terms.length) {
    let t = selectedSemester.terms.find(t => t.termId === termId);
    if (!t) t = selectedSemester.terms[0];
    termName = t.termName;
  }

  const schoolYear = data.schoolYear || data.schoolYearId || '';

  return { term: termName, semester: semesterName, schoolYear };
}

// --- 6) Dropdowns ---
async function populateTermDropdown(academicId, selectedTermId = null) {
  const termSelect = $('term'); termSelect.innerHTML = '';
  if (!academicId) return;

  const snap = await getDoc(doc(db, 'academicyear', academicId));
  if (!snap.exists()) return;
  const data = snap.data();
  
  const semesterSelect = $('semester');
  const selectedSemId = semesterSelect?.value;
  if (!data.semesters || !Array.isArray(data.semesters)) return;

  let selectedSemester = data.semesters.find(s => s.semId === selectedSemId);
  if (!selectedSemester && data.semesters.length > 0) selectedSemester = data.semesters[0];
  if (!selectedSemester || !selectedSemester.terms || !Array.isArray(selectedSemester.terms)) return;

  if (!selectedTermId && selectedSemester.terms.length > 0) selectedTermId = selectedSemester.terms[0].termId;

  for (const term of selectedSemester.terms) {
    const option = document.createElement('option');
    option.value = term.termId;
    option.textContent = term.termName || term.termId;
    if (term.termId === selectedTermId) option.selected = true;
    termSelect.appendChild(option);
  }
  return selectedTermId;
}

async function populateSemesterDropdown(academicId, selectedSemesterId = null) {
  const semSelect = $('semester'); semSelect.innerHTML = '';
  if (!academicId) return;

  const snap = await getDoc(doc(db, 'academicyear', academicId));
  if (!snap.exists()) return;
  const data = snap.data();
  if (!data.semesters || !Array.isArray(data.semesters)) return;

  if (!selectedSemesterId && data.semesters.length > 0) selectedSemesterId = data.semesters[0].semId;

  for (const sem of data.semesters) {
    const option = document.createElement('option');
    option.value = sem.semId;
    option.textContent = sem.semLabel || sem.semId;
    if (sem.semId === selectedSemesterId) option.selected = true;
    semSelect.appendChild(option);
  }
  return selectedSemesterId;
}

// --- 7) Render rows ---
function renderRows(rows) {
  const tbody = $('tbody');
  tbody.innerHTML = '';
  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td'); 
    td.colSpan = 3; 
    td.className = 'empty';
    td.textContent = 'No students found for the selected filters.';
    tr.appendChild(td);
    tbody.appendChild(tr); 
    setCount(0); 
    return;
  }

  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.studentId}</td>
      <td>${r.studentName || ''}</td>
      <td>
        <span class="grade-display" style="cursor: pointer; padding: 4px; border-radius: 3px; display: inline-block; min-width: 30px; text-align: center; background: #f8f9fa;" 
              onclick="editGrade(this, '${r.studentId}', '${r.classId}', '${$('subjectId').value}')" 
              title="Click to edit grade">
          ${r.grade === '' ? '—' : r.grade}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  }
  setCount(rows.length);
}

// --- 8) Add Existing Student ---
async function addExistingStudent(classId, subjectId, studentId) {
  if (!classId || !subjectId || !studentId) return;

  const cmRef = collection(db, 'classMembers');
  const existing = await getDocs(query(cmRef,
    where('classId','==',classId),
    where('subjectId','==',subjectId),
    where('studentId','==',studentId)
  ));
  if (!existing.empty) {
    alert('Student already added to this class/subject.');
    return;
  }
  await addDoc(cmRef, { 
    classId, 
    subjectId, 
    studentId,
    gradeId: `${classId}_${subjectId}_${studentId}` // Add gradeId for classmembers collection
  });
}

// --- 9) Add New Student ---
async function addNewStudent(classId, subjectId, studentId, studentName) {
  if (!studentId || !studentName) { alert('Enter both Student ID and Name'); return; }

  // 1) Add to students collection (if not exists)
  const studentsRef = collection(db, 'students');
  const existingStudent = await getDocs(query(studentsRef, where('studentId','==',studentId)));
  if (existingStudent.empty) {
    await setDoc(doc(db,'students',studentId), { studentId, name: studentName });
  }

  // 2) Add to classMembers
  await addExistingStudent(classId, subjectId, studentId);
}

// --- 10) Populate existing student dropdown ---
async function loadStudentOptions() {
  const select = $('selectStudent');
  if (!select) return;
  select.innerHTML = '<option value="">--Select Existing Student--</option>';

  const studentsRef = collection(db, 'students');
  const snap = await getDocs(studentsRef);

  snap.forEach(docSnap => {
    const student = docSnap.data();
    const option = document.createElement('option');
    option.value = student.studentId;
    option.textContent = student.name || student.studentId;
    select.appendChild(option);
  });
}

// --- 10.1) Bulk add functionality ---
function showBulkAddModal() {
  const modal = $('bulkAddModal');
  if (modal) {
    modal.style.display = 'flex';
    // Focus on first input
    const firstInput = modal.querySelector('.studentIdInput');
    if (firstInput) firstInput.focus();
    
    // Initialize event listeners
    initializeBulkAddHandlers();
  }
}

function hideBulkAddModal() {
  const modal = $('bulkAddModal');
  if (modal) {
    modal.style.display = 'none';
    // Clear form
    const tbody = modal.querySelector('#bulkStudentTable tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td style="padding: 8px; border: 1px solid #dadce0;"><input type="text" class="studentIdInput" style="width: 100%; padding: 6px; border: 1px solid #dadce0; border-radius: 3px; font-size: 12px;" required></td>
          <td style="padding: 8px; border: 1px solid #dadce0;"><input type="text" class="nameInput" style="width: 100%; padding: 6px; border: 1px solid #dadce0; border-radius: 3px; font-size: 12px;" required></td>
          <td style="padding: 8px; border: 1px solid #dadce0; text-align: center;"><button type="button" class="removeRowBtn" style="background: #ea4335; color: white; border: none; border-radius: 3px; padding: 4px 8px; cursor: pointer; font-size: 11px;">✕</button></td>
        </tr>
      `;
    }
    // Clear message
    const message = $('bulkFormMessage');
    if (message) message.textContent = '';
  }
}

function initializeBulkAddHandlers() {
  const modal = $('bulkAddModal');
  if (!modal) return;
  
  const addRowBtn = $('addRowBtn');
  const saveAllBtn = $('saveAllStudentsBtn');
  const tbody = modal.querySelector('#bulkStudentTable tbody');
  const bulkFormMessage = $('bulkFormMessage');
  
  // Remove existing listeners to prevent duplicates
  if (addRowBtn) {
    addRowBtn.replaceWith(addRowBtn.cloneNode(true));
  }
  if (saveAllBtn) {
    saveAllBtn.replaceWith(saveAllBtn.cloneNode(true));
  }
  
  // Re-get elements after cloning
  const newAddRowBtn = $('addRowBtn');
  const newSaveAllBtn = $('saveAllStudentsBtn');
  
  function attachRemoveHandlers() {
    const removeBtns = modal.querySelectorAll('.removeRowBtn');
    removeBtns.forEach(btn => {
      btn.onclick = () => {
        if (tbody.rows.length > 1) {
          btn.closest('tr').remove();
        } else {
          alert('At least one row is required.');
        }
      };
    });
  }
  
  attachRemoveHandlers();
  
  if (newAddRowBtn) {
    newAddRowBtn.addEventListener('click', () => {
      const newRow = document.createElement('tr');
      newRow.innerHTML = `
        <td style="padding: 8px; border: 1px solid #dadce0;"><input type="text" class="studentIdInput" style="width: 100%; padding: 6px; border: 1px solid #dadce0; border-radius: 3px; font-size: 12px;" required></td>
        <td style="padding: 8px; border: 1px solid #dadce0;"><input type="text" class="nameInput" style="width: 100%; padding: 6px; border: 1px solid #dadce0; border-radius: 3px; font-size: 12px;" required></td>
        <td style="padding: 8px; border: 1px solid #dadce0; text-align: center;"><button type="button" class="removeRowBtn" style="background: #ea4335; color: white; border: none; border-radius: 3px; padding: 4px 8px; cursor: pointer; font-size: 11px;">✕</button></td>
      `;
      tbody.appendChild(newRow);
      attachRemoveHandlers();
    });
  }
  
  if (newSaveAllBtn) {
    newSaveAllBtn.addEventListener('click', async () => {
      if (bulkFormMessage) {
        bulkFormMessage.style.color = 'black';
        bulkFormMessage.textContent = 'Saving students...';
      }
      
      const studentIdInputs = modal.querySelectorAll('.studentIdInput');
      const nameInputs = modal.querySelectorAll('.nameInput');
      const classId = $('classId').value.trim();
      const subjectId = $('subjectId').value.trim();
      
      if (!classId || !subjectId) {
        if (bulkFormMessage) {
          bulkFormMessage.style.color = 'red';
          bulkFormMessage.textContent = 'Class ID and Subject ID are required.';
        }
        return;
      }
      
      const studentsToSave = [];
      for (let i = 0; i < studentIdInputs.length; i++) {
        const idVal = studentIdInputs[i].value.trim();
        const nameVal = nameInputs[i].value.trim();
        if (!idVal || !nameVal) {
          if (bulkFormMessage) {
            bulkFormMessage.style.color = 'red';
            bulkFormMessage.textContent = `Please fill all fields in row ${i + 1}.`;
          }
          return;
        }
        studentsToSave.push({ studentId: idVal, name: nameVal });
      }
      
      try {
        let successCount = 0;
        for (const student of studentsToSave) {
          await addNewStudent(classId, subjectId, student.studentId, student.name);
          successCount++;
        }
        
        if (bulkFormMessage) {
          bulkFormMessage.style.color = 'green';
          bulkFormMessage.textContent = `Successfully added ${successCount} students!`;
        }
        
        loadData();
        setTimeout(() => {
          hideBulkAddModal();
        }, 1200);
      } catch (error) {
        console.error('Error saving students:', error);
        if (bulkFormMessage) {
          bulkFormMessage.style.color = 'red';
          bulkFormMessage.textContent = 'Failed to save students. Please try again.';
        }
      }
    });
  }
}

// --- 11) Load data ---
let lastRows = [];
async function loadData() {
  const classId = $('classId').value.trim();
  const subjectId = $('subjectId').value.trim();
  if (!classId || !subjectId) { setStatus('Missing Class ID or Subject ID.'); return; }

  const academicId = await getAcademicIdFromClass(classId);
  $('academicId').value = academicId || '';

  await populateSemesterDropdown(academicId);
  await populateTermDropdown(academicId);

  setStatus('Loading class members…');
  const members = await getClassMembers(classId, subjectId);
  $('hint').textContent = members.length ? '' : 'No class members found.';

  setStatus('Fetching student info…');
  const rows = [];
  for (const m of members) {
    const studentName = m.studentName || await getStudentName(m.studentId);
    const grade = m.grade ?? '';
    rows.push({ studentId: m.studentId, studentName, classId: m.classId, grade });
  }
  lastRows = rows;
  renderRows(rows);

  // Update schoolYear input
  const period = await getAcademicPeriod(academicId);
  $('schoolYear').value = period.schoolYear;

  // --- Display assigned teacher ---
  const subjectRef = doc(db, 'subjects', subjectId);
  const subjectSnap = await getDoc(subjectRef);
  if (subjectSnap.exists()) {
    const subject = subjectSnap.data();
    const teacherName = subject.assignedTeacherEmail
      ? await getTeacherName(subject.assignedTeacherEmail)
      : 'Not assigned';
    if ($('assignedTeacher')) $('assignedTeacher').textContent = teacherName;
  }

  setStatus(`Loaded ${rows.length} student record(s).`);
}

// --- 12) Button event listeners ---
$('addExistingStudentBtn')?.addEventListener('click', async () => {
  const studentId = $('selectStudent').value;
  const classId = $('classId').value.trim();
  const subjectId = $('subjectId').value.trim();

  if (!studentId) { alert('Select a student'); return; }

  await addExistingStudent(classId, subjectId, studentId);
  $('selectStudent').value = '';
  loadData();
});

$('addNewStudentBtn')?.addEventListener('click', async () => {
  const studentId = $('newStudentId').value.trim();
  const studentName = $('newStudentName').value.trim();
  const classId = $('classId').value.trim();
  const subjectId = $('subjectId').value.trim();

  if (!studentId || !studentName) { alert('Enter both Student ID and Name'); return; }

  await addNewStudent(classId, subjectId, studentId, studentName);

  $('newStudentId').value = '';
  $('newStudentName').value = '';
  loadData();
});

// --- 13) Export CSV functionality ---
function exportToCSV() {
  if (!lastRows.length) {
    alert('No data to export');
    return;
  }

  const classId = $('classId').value.trim();
  const subjectId = $('subjectId').value.trim();
  const academicId = $('academicId').value.trim();
  const term = $('term').value;
  const semester = $('semester').value;
  const schoolYear = $('schoolYear').value;

  // Create CSV content
  const headers = ['Student ID', 'Student Name', 'Grade'];
  const csvContent = [
    headers.join(','),
    ...lastRows.map(row => [
      `"${row.studentId}"`,
      `"${row.studentName || ''}"`,
      `"${row.grade === '' ? '' : row.grade}"`
    ].join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  
  // Generate filename with current date and filters
  const date = new Date().toISOString().split('T')[0];
  const filename = `student_grades_${classId}_${subjectId}_${date}.csv`;
  link.setAttribute('download', filename);
  
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- 14) Import CSV functionality ---
function createImportModal() {
  // Remove existing modal if any
  const existingModal = document.getElementById('importModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'importModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 12px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;

  modalContent.innerHTML = `
    <h3 style="margin: 0 0 20px 0; color: #202124; font-size: 18px; font-weight: 600;">Import Student Grades</h3>
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500;">Select CSV File:</label>
      <input type="file" id="csvFileInput" accept=".csv" style="width: 100%; padding: 8px; border: 1px solid #dadce0; border-radius: 4px;" />
    </div>
    <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 14px;">
      <strong>CSV Format Requirements:</strong><br>
      • Headers: <code>studentId,name</code> (Grade header is optional)<br>
      • Example: <code>STU001,John Doe</code> or <code>STU001,John Doe,85</code><br>
      • Grades can be empty or omitted entirely<br>
      • Students not in the system will be added automatically
    </div>
    <div id="importMessage" style="margin-bottom: 20px; padding: 10px; border-radius: 4px; display: none;"></div>
    <div style="display: flex; gap: 10px; justify-content: flex-end;">
      <button id="cancelImportBtn" style="padding: 10px 20px; border: 1px solid #dadce0; background: white; border-radius: 6px; cursor: pointer;">Cancel</button>
      <button id="importCsvBtn" style="padding: 10px 20px; background: #1a73e8; color: white; border: none; border-radius: 6px; cursor: pointer;">Import</button>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Event listeners
  document.getElementById('cancelImportBtn').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  document.getElementById('importCsvBtn').addEventListener('click', () => {
    importFromCSV();
  });
}

async function importFromCSV() {
  const fileInput = document.getElementById('csvFileInput');
  const file = fileInput.files[0];
  const messageDiv = document.getElementById('importMessage');

  if (!file) {
    showImportMessage('Please select a CSV file first.', 'error');
    return;
  }

  const classId = $('classId').value.trim();
  const subjectId = $('subjectId').value.trim();

  if (!classId || !subjectId) {
    showImportMessage('Class ID and Subject ID are required.', 'error');
    return;
  }

  showImportMessage('Processing CSV file...', 'info');

  try {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      showImportMessage('CSV file must contain at least a header row and one data row.', 'error');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const requiredHeaders = ['studentId', 'name'];
    
    // Check if required headers exist (case insensitive)
    const hasRequiredHeaders = requiredHeaders.every(required => 
      headers.some(header => header.toLowerCase() === required.toLowerCase())
    );

    if (!hasRequiredHeaders) {
      showImportMessage(`Invalid CSV format. Required headers: ${requiredHeaders.join(', ')} (Grade header is optional)`, 'error');
      return;
    }

    // Find column indices
    const studentIdIndex = headers.findIndex(h => h.toLowerCase() === 'studentid');
    const studentNameIndex = headers.findIndex(h => h.toLowerCase() === 'name');
    const gradeIndex = headers.findIndex(h => h.toLowerCase() === 'grade'); // Optional

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const studentId = values[studentIdIndex]?.trim();
        const studentName = values[studentNameIndex]?.trim();
        const grade = gradeIndex >= 0 ? values[gradeIndex]?.trim() : ''; // Handle optional grade column

        if (!studentId) {
          errors.push(`Row ${i + 1}: Missing Student ID`);
          errorCount++;
          continue;
        }

        // Use the same logic as addNewStudent
        if (studentName) {
          // 1) Add to students collection (if not exists) - ONLY basic student info
          const studentsRef = collection(db, 'students');
          const existingStudent = await getDocs(query(studentsRef, where('studentId','==',studentId)));
          if (existingStudent.empty) {
            // Only add studentId and name to students collection - NO gradeId here
            await setDoc(doc(db,'students',studentId), { studentId, name: studentName });
          }
        }

        // 2) Add to classMembers with gradeId - grades and gradeId ONLY in classMembers
        const cmRef = collection(db, 'classMembers');
        const existing = await getDocs(query(cmRef,
          where('classId','==',classId),
          where('subjectId','==',subjectId),
          where('studentId','==',studentId)
        ));
        
        if (existing.empty) {
          // Add new class member with grade and gradeId - specific to this class/subject
          await addDoc(cmRef, { 
            classId, 
            subjectId, 
            studentId,
            studentName: studentName || studentId,
            grade: grade || '',
            gradeId: `${classId}_${subjectId}_${studentId}` // gradeId ONLY in classMembers collection
          });
        } else {
          // Update existing member with grade - keep gradeId in classMembers only
          const docId = existing.docs[0].id;
          const existingData = existing.docs[0].data();
          await setDoc(doc(db, 'classMembers', docId), {
            ...existingData,
            studentName: studentName || existingData.studentName || studentId,
            grade: grade || existingData.grade || '',
            gradeId: existingData.gradeId || `${classId}_${subjectId}_${studentId}` // Ensure gradeId exists in classMembers
          });
        }

        successCount++;
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        errors.push(`Row ${i + 1}: ${error.message}`);
        errorCount++;
      }
    }

    let message = `Import completed. Successfully processed: ${successCount} records.`;
    if (errorCount > 0) {
      message += ` Errors: ${errorCount}.`;
      if (errors.length > 0) {
        message += `\n\nFirst few errors:\n${errors.slice(0, 3).join('\n')}`;
      }
    }

    showImportMessage(message, errorCount > 0 ? 'warning' : 'success');

    // Reload data after import
    setTimeout(() => {
      loadData();
      document.getElementById('importModal').remove();
    }, 2000);

  } catch (error) {
    console.error('Import error:', error);
    showImportMessage(`Error reading CSV file: ${error.message}`, 'error');
  }
}

function showImportMessage(message, type) {
  const messageDiv = document.getElementById('importMessage');
  messageDiv.style.display = 'block';
  messageDiv.textContent = message;
  
  // Reset classes
  messageDiv.className = '';
  
  switch (type) {
    case 'error':
      messageDiv.style.cssText += 'background: #fce8e6; color: #d93025; border: 1px solid #f28b82;';
      break;
    case 'success':
      messageDiv.style.cssText += 'background: #e6f4ea; color: #137333; border: 1px solid #81c995;';
      break;
    case 'warning':
      messageDiv.style.cssText += 'background: #fef7e0; color: #b06000; border: 1px solid #fdd663;';
      break;
    case 'info':
      messageDiv.style.cssText += 'background: #e8f0fe; color: #1967d2; border: 1px solid #aecbfa;';
      break;
  }
}

// --- 15) Grade editing functionality ---
async function editGrade(element, studentId, classId, subjectId) {
  const currentGrade = element.textContent.trim() === '—' ? '' : element.textContent.trim();
  
  // Create input element
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentGrade;
  input.style.cssText = 'width: 60px; padding: 2px 4px; border: 1px solid #ccc; border-radius: 3px; text-align: center;';
  
  // Replace the span with input
  element.style.display = 'none';
  element.parentNode.insertBefore(input, element);
  input.focus();
  input.select();
  
  // Save on Enter or blur
  const saveGrade = async () => {
    const newGrade = input.value.trim();
    
    try {
      // Update in database
      const cmRef = collection(db, 'classMembers');
      const existingMember = await getDocs(query(cmRef,
        where('classId', '==', classId),
        where('subjectId', '==', subjectId),
        where('studentId', '==', studentId)
      ));
      
      if (!existingMember.empty) {
        const docId = existingMember.docs[0].id;
        const memberData = existingMember.docs[0].data();
        await setDoc(doc(db, 'classMembers', docId), {
          ...memberData,
          grade: newGrade
        });
        
        // Update display
        element.textContent = newGrade === '' ? '—' : newGrade;
        element.style.display = 'inline-block';
        input.remove();
        
        // Update lastRows for export
        const rowIndex = lastRows.findIndex(r => r.studentId === studentId);
        if (rowIndex !== -1) {
          lastRows[rowIndex].grade = newGrade;
        }
        
        setStatus('Grade updated successfully');
      } else {
        throw new Error('Student not found in class members');
      }
    } catch (error) {
      console.error('Error updating grade:', error);
      alert('Failed to update grade. Please try again.');
      
      // Restore original display
      element.style.display = 'inline-block';
      input.remove();
    }
  };
  
  // Cancel editing
  const cancelEdit = () => {
    element.style.display = 'inline-block';
    input.remove();
  };
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveGrade();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  });
  
  input.addEventListener('blur', saveGrade);
}

// Make editGrade globally available
window.editGrade = editGrade;

// --- 16) Event listeners for bulk add functionality ---
$('showMultiSelectBtn')?.addEventListener('click', showBulkAddModal);
$('closeBulkModal')?.addEventListener('click', hideBulkAddModal);

// --- 16.1) New compact design event listeners ---
// Show/hide new student form
function showNewStudentForm() {
  const form = $('newStudentForm');
  if (form) {
    form.style.display = 'block';
    const idInput = $('newStudentId');
    if (idInput) idInput.focus();
  }
}

function hideNewStudentForm() {
  const form = $('newStudentForm');
  if (form) {
    form.style.display = 'none';
    // Clear form
    if ($('newStudentId')) $('newStudentId').value = '';
    if ($('newStudentName')) $('newStudentName').value = '';
  }
}

// Event listener for the "New" button (show form only)
$('showNewStudentBtn')?.addEventListener('click', showNewStudentForm);

// Event listener for the "Add" button in the new student form
$('addNewStudentBtn')?.addEventListener('click', async () => {
  const studentId = $('newStudentId').value.trim();
  const studentName = $('newStudentName').value.trim();
  const classId = $('classId').value.trim();
  const subjectId = $('subjectId').value.trim();

  if (!studentId || !studentName) { alert('Enter both Student ID and Name'); return; }

  await addNewStudent(classId, subjectId, studentId, studentName);
  hideNewStudentForm();
  loadData();
});

// Event listener for cancel button
$('cancelNewStudentBtn')?.addEventListener('click', hideNewStudentForm);

// Close modal when clicking outside
$('bulkAddModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'bulkAddModal') {
    hideBulkAddModal();
  }
});

// --- 17) Event listeners for export and import ---
$('exportBtn')?.addEventListener('click', exportToCSV);
$('importBtn')?.addEventListener('click', createImportModal);

// --- 18) Auto-load ---
window.addEventListener('DOMContentLoaded', async () => {
  await loadStudentOptions();
  if ($('classId').value && $('subjectId').value) loadData();
});
