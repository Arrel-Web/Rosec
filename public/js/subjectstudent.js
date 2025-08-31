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
      <td>${r.grade === '' ? '—' : r.grade}</td>
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
  await addDoc(cmRef, { classId, subjectId, studentId });
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

// --- 13) Auto-load ---
window.addEventListener('DOMContentLoaded', async () => {
  await loadStudentOptions();
  if ($('classId').value && $('subjectId').value) loadData();
});
