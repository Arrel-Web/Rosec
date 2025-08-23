import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, getDocs, query, where, addDoc, doc, getDoc, setDoc 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
  getAuth, onAuthStateChanged, signOut 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// Firebase Config
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

// DOM Elements
const suggestedList = document.getElementById('suggestedList') || document.getElementById('classesContainer');
const suggestedCount = document.getElementById('suggested-count');
const subjectsGrid = document.getElementById('subjectsGrid');
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userRoleEl = document.getElementById('user-role');
const userIconBtn = document.getElementById('userIconBtn');
const userDropdown = document.getElementById('userDropdown');

const addSubjectFormSection = document.getElementById('addSubjectFormSection');
const selectedClassNameSpan = document.getElementById('selectedClassName');
const selectedClassIdInput = document.getElementById('selectedClassId');
const addSubjectForm = document.getElementById('addSubjectForm');
const subjectIdInput = document.getElementById('subjectIdInput');
const subjectNameInput = document.getElementById('subjectNameInput');

// Teacher form inputs
const teacherEmailInput = document.getElementById('teacherSelect');
const newTeacherNameInput = document.getElementById('newTeacherName');
const newTeacherEmailInput = document.getElementById('newTeacherEmail');

// Create Class form inputs
const createClassForm = document.getElementById('createClassForm');
const classIdInput = document.getElementById('classIdInput');

// Academic Year form inputs
const academicYearSelect = document.getElementById('academicYearSelect');
const newAcademicYearIdInput = document.getElementById('newAcademicYearId');
const newAcademicYearNameInput = document.getElementById('newAcademicYearName');

// User dropdown toggle
userIconBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  userDropdown.classList.toggle('show');
});
document.addEventListener('click', () => userDropdown.classList.remove('show'));

// Logout
document.getElementById('signOutBtn').addEventListener('click', () => {
  signOut(auth).then(() => {
    window.location.href = 'index.html';
  }).catch(error => {
    console.error('Log out error:', error);
    alert('Failed to log out. Please try again.');
  });
});

// Fetch teacher name by email
async function getTeacherNameByEmail(email) {
  if (!email) return 'No teacher assigned';
  try {
    const teachersCol = collection(db, 'teachers');
    const q = query(teachersCol, where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return email;
    return snap.docs[0].data().name || email;
  } catch (err) {
    console.error('Error fetching teacher name:', err);
    return email;
  }
}

// Load teachers dropdown
export async function loadTeachersIntoDropdown() {
  if (!teacherEmailInput) return;
  teacherEmailInput.innerHTML = `<option value="">Select Teacher</option>`;
  try {
    const teachersCol = collection(db, 'teachers');
    const teachersSnap = await getDocs(teachersCol);
    teachersSnap.forEach(doc => {
      const t = doc.data();
      const option = document.createElement('option');
      option.value = t.email;
      option.textContent = t.name || t.email;
      teacherEmailInput.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load teachers:', error);
  }
}

// Load academic years dropdown
export async function loadAcademicYearsIntoDropdown(selectedValue = '') {
  if (!academicYearSelect) return;
  academicYearSelect.innerHTML = `<option value="">Select Academic Year</option>`;
  try {
    const acadCol = collection(db, 'academicyear'); // make sure this matches your collection name
    const acadSnap = await getDocs(acadCol);

    if (acadSnap.empty) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No academic years found';
      academicYearSelect.appendChild(option);
      return;
    }

    acadSnap.forEach(doc => {
      const value = doc.id; // use the document ID as academic ID
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value; // show only the academic ID
      if (value === selectedValue) option.selected = true;
      academicYearSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load academic years:', error);
    academicYearSelect.innerHTML = `<option value="">Error loading academic years</option>`;
  }
}

// Create subject card
async function createSubjectCard(subject, classId) {
  const teacherName = await getTeacherNameByEmail(subject.assignedTeacherEmail);
  const link = document.createElement('a');
  link.className = 'grid-item subject-card-link';
  link.href = `subject-details.html?subjectId=${encodeURIComponent(subject.subjectId)}&classId=${encodeURIComponent(classId)}`;
  link.style.display = 'block';
  link.style.textDecoration = 'none';
  link.style.color = 'inherit';
  link.innerHTML = `
    <div class="subject-card" style="padding: 10px;">
      <h4>${subject.name}</h4>
      <p class="muted" style="font-size: 0.9em; margin-top: 4px;">${teacherName}</p>
    </div>
  `;
  return link;
}

// Get user role
async function getUserRole(email) {
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data().role || null;
  } catch (err) {
    console.error('Error getting user role:', err);
    return null;
  }
}

// Load subjects for a class
async function loadSubjectsForClass(classId) {
  if (!subjectsGrid) return;
  subjectsGrid.innerHTML = '';
  if (!classId) {
    subjectsGrid.innerHTML = `<p class="muted">No class ID provided.</p>`;
    return;
  }
  try {
    const classesQuery = query(collection(db, 'classes'), where('classId', '==', classId));
    const classesSnap = await getDocs(classesQuery);
    if (classesSnap.empty) {
      subjectsGrid.innerHTML = `<p class="muted">No subjects linked to this class.</p>`;
      return;
    }

    const subjectIds = [];
    classesSnap.forEach(doc => {
      const data = doc.data();
      if (data.subjectId) subjectIds.push(data.subjectId.toLowerCase());
    });

    if (subjectIds.length === 0) {
      subjectsGrid.innerHTML = `<p class="muted">No subject IDs found for this class.</p>`;
      return;
    }

    const allSubjectsSnap = await getDocs(collection(db, 'subjects'));
    let matchedSubjects = [];
    allSubjectsSnap.forEach(doc => {
      const subjectData = doc.data();
      if (subjectIds.includes((subjectData.subjectId || '').toLowerCase())) {
        matchedSubjects.push(subjectData);
      }
    });

    if (matchedSubjects.length === 0) {
      subjectsGrid.innerHTML = `<p class="muted">No matching subjects found for this class.</p>`;
      return;
    }

    for (const subject of matchedSubjects) {
      const card = await createSubjectCard(subject, classId);
      subjectsGrid.appendChild(card);
    }
  } catch (err) {
    console.error('Error loading subjects:', err);
    subjectsGrid.innerHTML = `<p class="muted">Error loading subjects.</p>`;
  }
}

// Load classes
async function loadClasses(userEmail, role) {
  if (!suggestedList) return;
  suggestedList.innerHTML = '';
  if (suggestedCount) suggestedCount.textContent = '';
  if (!role) {
    suggestedList.innerHTML = `<p class="muted">Role not found.</p>`;
    if (userRoleEl) userRoleEl.textContent = 'Role: N/A';
    return;
  }
  if (userRoleEl) userRoleEl.textContent = `Role: ${role}`;

  let classesQuery;
  if (role === 'admin') {
    classesQuery = query(collection(db, 'classes'));
  } else if (role === 'teacher') {
    classesQuery = query(collection(db, 'classes'), where('teacherEmail', '==', userEmail));
  } else {
    suggestedList.innerHTML = `<p class="muted">No classes available for your role.</p>`;
    return;
  }

  try {
    const classesSnapshot = await getDocs(classesQuery);
    if (classesSnapshot.empty) {
      suggestedList.innerHTML = `<p class="muted">No classes found.</p>`;
      return;
    }

    const uniqueClasses = new Map();
    classesSnapshot.forEach(doc => {
      const data = doc.data();
      const cId = data.classId || doc.id;
      if (!uniqueClasses.has(cId)) uniqueClasses.set(cId, data);
    });

    uniqueClasses.forEach(classData => {
      const div = document.createElement('div');
      div.className = 'suggested-item clickable';
      div.setAttribute('data-class-id', classData.classId);
      div.innerHTML = `
        <div class="suggested-info">
          <strong>${classData.classId}</strong><br />
          <span class="muted">Academic Year: ${classData.academicId || 'N/A'}</span>
        </div>
      `;
      div.addEventListener('click', () => {
        if (addSubjectFormSection) addSubjectFormSection.style.display = 'block';
        if (selectedClassIdInput) selectedClassIdInput.value = classData.classId;
        if (selectedClassNameSpan) selectedClassNameSpan.textContent = classData.classId;
        loadSubjectsForClass(classData.classId);
      });
      suggestedList.appendChild(div);
    });

    if (suggestedCount) suggestedCount.textContent = uniqueClasses.size;
  } catch (err) {
    console.error('Error loading classes:', err);
    suggestedList.innerHTML = `<p class="muted">Error loading classes.</p>`;
  }
}

// Add subject form submission
if (addSubjectForm) {
  addSubjectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subjectId = subjectIdInput.value.trim();
    const subjectName = subjectNameInput.value.trim();
    const classId = selectedClassIdInput.value;
    const selectedTeacherEmail = teacherEmailInput ? teacherEmailInput.value : '';
    const newTeacherName = newTeacherNameInput ? newTeacherNameInput.value.trim() : '';
    const newTeacherEmail = newTeacherEmailInput ? newTeacherEmailInput.value.trim() : '';

    if (!classId || !subjectId || !subjectName) {
      alert('Please fill out all required fields.');
      return;
    }
    if (!selectedTeacherEmail && (!newTeacherName || !newTeacherEmail)) {
      alert('Please select an existing teacher or add a new one.');
      return;
    }

    try {
      let teacherEmailToAssign = '';
      if (selectedTeacherEmail) {
        teacherEmailToAssign = selectedTeacherEmail;
      } else {
        const teacherDocRef = doc(db, 'teachers', newTeacherEmail);
        const teacherDocSnap = await getDoc(teacherDocRef);
        if (!teacherDocSnap.exists()) {
          await setDoc(teacherDocRef, { email: newTeacherEmail, name: newTeacherName });
          await loadTeachersIntoDropdown();
        }
        teacherEmailToAssign = newTeacherEmail;
      }

      const subjectDocRef = doc(db, 'subjects', subjectId);
      const subjectDocSnap = await getDoc(subjectDocRef);
      if (!subjectDocSnap.exists()) {
        await setDoc(subjectDocRef, { subjectId, name: subjectName, assignedTeacherEmail: teacherEmailToAssign });
      } else {
        await setDoc(subjectDocRef, { assignedTeacherEmail: teacherEmailToAssign, name: subjectName }, { merge: true });
      }

      let classAcademicId = '';
      const classQuery = query(collection(db, 'classes'), where('classId', '==', classId));
      const classSnap = await getDocs(classQuery);
      if (!classSnap.empty) {
        classAcademicId = classSnap.docs[0].data().academicId || '';
      }

      const duplicateQuery = query(collection(db, 'classes'), where('classId', '==', classId), where('subjectId', '==', subjectId));
      const duplicateSnap = await getDocs(duplicateQuery);
      if (duplicateSnap.empty) {
        await addDoc(collection(db, 'classes'), { 
          classId, 
          subjectId, 
          academicId: classAcademicId, 
          teacherEmail: teacherEmailToAssign 
        });
      }

      alert(`Subject "${subjectName}" added to class ${classId}`);
      addSubjectForm.reset();
      loadSubjectsForClass(classId);
    } catch (err) {
      console.error(err);
      alert('Failed to add subject.');
    }
  });
}

// Create Class form submission
if (createClassForm) {
  createClassForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const classId = classIdInput.value.trim();
    const selectedAcademicId = academicYearSelect ? academicYearSelect.value : '';
    const newAcademicYearId = newAcademicYearIdInput ? newAcademicYearIdInput.value.trim() : '';
    const newAcademicYearName = newAcademicYearNameInput ? newAcademicYearNameInput.value.trim() : '';

    if (!classId) {
      alert('Please enter a Class ID.');
      return;
    }
    if (!selectedAcademicId && (!newAcademicYearId || !newAcademicYearName)) {
      alert('Please select an existing academic year or create a new one.');
      return;
    }

    try {
      let academicIdToAssign = '';
      if (selectedAcademicId) {
        academicIdToAssign = selectedAcademicId;
      } else {
        const acadDocRef = doc(db, 'academicYears', newAcademicYearId);
        const acadDocSnap = await getDoc(acadDocRef);
        if (!acadDocSnap.exists()) {
          await setDoc(acadDocRef, { 
            schoolYearId: newAcademicYearName, 
            termId: 'TBD', 
            semesterId: 'TBD' 
          });
        }
        academicIdToAssign = newAcademicYearId;
      }

      const classesCol = collection(db, 'classes');
      const q = query(classesCol, where('classId', '==', classId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        alert(`Class with ID "${classId}" already exists.`);
        return;
      }

      await addDoc(classesCol, { classId, academicId: academicIdToAssign });
      alert(`Class ${classId} created successfully!`);
      createClassForm.reset();

      // Reload academic years dropdown and auto-select the newly created
      await loadAcademicYearsIntoDropdown(academicIdToAssign);

      const user = auth.currentUser;
      if (user) {
        const role = await getUserRole(user.email);
        await loadClasses(user.email, role);
      }
    } catch (error) {
      console.error('Error creating class:', error);
      alert('Failed to create class.');
    }
  });
}

// Auth state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userNameEl.textContent = user.displayName || 'User Name:';
    userEmailEl.textContent = user.email;
    const role = await getUserRole(user.email);
    await loadClasses(user.email, role);
    if (addSubjectFormSection) addSubjectFormSection.style.display = 'none';
    if (subjectsGrid) subjectsGrid.innerHTML = `<p class="muted">Select a class to view its subjects.</p>`;
    await loadTeachersIntoDropdown();
    await loadAcademicYearsIntoDropdown();
  } else {
    userNameEl.textContent = 'User Name';
    userEmailEl.textContent = 'user@example.com';
    userRoleEl.textContent = 'Role: N/A';
    if (suggestedList) suggestedList.innerHTML = `<p class="muted">Please sign in to see your classes.</p>`;
    if (subjectsGrid) subjectsGrid.innerHTML = '';
    if (addSubjectFormSection) addSubjectFormSection.style.display = 'none';
  }
});
