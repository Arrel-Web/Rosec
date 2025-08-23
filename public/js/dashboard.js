import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, getDocs, query, where, addDoc
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

const suggestedList = document.getElementById('suggestedList');
const suggestedCount = document.getElementById('suggested-count');
const subjectsGrid = document.getElementById('subjectsGrid');
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userRoleEl = document.getElementById('user-role');

const userIconBtn = document.getElementById('userIconBtn');
const userDropdown = document.getElementById('userDropdown');

// Toggle user dropdown
userIconBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  userDropdown.classList.toggle('show');
});
document.addEventListener('click', () => {
  userDropdown.classList.remove('show');
});

// 🔹 Get teacher name by email
async function getTeacherNameByEmail(email) {
  if (!email) return 'No teacher assigned';
  try {
    const teachersCol = collection(db, 'teachers');
    const q = query(teachersCol, where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return email; // fallback to email if no name found
    return snap.docs[0].data().name || email;
  } catch (err) {
    console.error('Error fetching teacher name:', err);
    return email;
  }
}

// 🔹 Subject card (async)
async function createSubjectCard(subject) {
  const teacherName = await getTeacherNameByEmail(subject.assignedTeacherEmail);

  const card = document.createElement('div');
  card.className = 'grid-item';
  card.innerHTML = `
    <div class="subject-card">
      <h4>${subject.name}</h4>
      <p class="muted" style="font-size: 0.9em; margin-top: 4px;">
        ${teacherName}
      </p>
    </div>
  `;
  return card;
}

// Get user role
async function getUserRole(email) {
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return querySnapshot.docs[0].data().role || null;
  } catch (err) {
    console.error('Error getting user role:', err);
    return null;
  }
}

// ✅ Load all subjects for a given classId
async function loadSubjectsForClass(classId) {
  try {
    subjectsGrid.innerHTML = '';

    if (!classId) {
      subjectsGrid.innerHTML = `<p class="muted">No class ID provided.</p>`;
      return;
    }

    const classesQuery = query(collection(db, 'classes'), where('classId', '==', classId));
    const classesSnap = await getDocs(classesQuery);

    if (classesSnap.empty) {
      subjectsGrid.innerHTML = `<p class="muted">No subjects linked to this class.</p>`;
      return;
    }

    const subjectIds = [];
    classesSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.subjectId) subjectIds.push(data.subjectId.toLowerCase());
    });

    if (subjectIds.length === 0) {
      subjectsGrid.innerHTML = `<p class="muted">No subject IDs found for this class.</p>`;
      return;
    }

    const allSubjectsSnap = await getDocs(collection(db, 'subjects'));
    let matchedSubjects = [];
    allSubjectsSnap.forEach(docSnap => {
      const subjectData = docSnap.data();
      if (subjectIds.includes((subjectData.subjectId || '').toLowerCase())) {
        matchedSubjects.push(subjectData);
      }
    });

    if (matchedSubjects.length === 0) {
      subjectsGrid.innerHTML = `<p class="muted">No matching subjects found for this class.</p>`;
      return;
    }

    for (const subject of matchedSubjects) {
      const card = await createSubjectCard(subject);
      subjectsGrid.appendChild(card);
    }

  } catch (err) {
    console.error('Error loading subjects for class:', err);
    subjectsGrid.innerHTML = `<p class="muted">Error loading subjects.</p>`;
  }
}

// ✅ Load suggested classes without duplicates
async function loadSuggestedClasses(userEmail, role) {
  suggestedList.innerHTML = '';
  suggestedCount.textContent = '';

  if (!role) {
    suggestedList.innerHTML = `<p class="muted">Role not found.</p>`;
    userRoleEl.textContent = 'Role: N/A';
    return;
  }

  userRoleEl.textContent = `Role: ${role}`;
  let classesQuery;

  if (role === 'admin') {
    classesQuery = query(collection(db, 'classes'));
  } else if (role === 'teacher') {
    classesQuery = query(collection(db, 'classes'), where('teacherEmail', '==', userEmail));
  } else {
    suggestedList.innerHTML = `<p class="muted">No suggested classes available for your role.</p>`;
    return;
  }

  try {
    const classesSnapshot = await getDocs(classesQuery);

    if (classesSnapshot.empty) {
      suggestedList.innerHTML = `<p class="muted">No suggested classes found.</p>`;
      return;
    }

    const uniqueClasses = new Map();

    classesSnapshot.forEach(docSnap => {
      const classData = docSnap.data();
      const cId = classData.classId || docSnap.id;
      if (!uniqueClasses.has(cId)) {
        uniqueClasses.set(cId, {...classData});
      }
    });

    uniqueClasses.forEach(classData => {
      const div = document.createElement('div');
      div.className = 'suggested-item';
      div.innerHTML = `
        <div class="suggested-info">
          <strong>${classData.classId}</strong><br />
          <span class="muted">Academic Year: ${classData.academicId || 'N/A'}</span>
        </div>
      `;
      div.addEventListener('click', () => {
        loadSubjectsForClass(classData.classId);
      });
      suggestedList.appendChild(div);
    });

    suggestedCount.textContent = uniqueClasses.size;

  } catch (err) {
    console.error('Error loading suggested classes:', err);
    suggestedList.innerHTML = `<p class="muted">Error loading suggested classes.</p>`;
  }
}

// Auth listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userNameEl.textContent = user.displayName || 'User Name:';
    userEmailEl.textContent = user.email;

    const role = await getUserRole(user.email);
    await loadSuggestedClasses(user.email, role);

    subjectsGrid.innerHTML = `<p class="muted">Select a class to view its subjects.</p>`;
  } else {
    userNameEl.textContent = 'User Name';
    userEmailEl.textContent = 'user@example.com';
    userRoleEl.textContent = 'Role: N/A';
    suggestedList.innerHTML = `<p class="muted">Please sign in to see your classes.</p>`;
    suggestedCount.textContent = '';
    subjectsGrid.innerHTML = '';
  }
});

// FAB menu toggle
const fabBtn = document.getElementById('fabBtn');
const fabMenu = document.getElementById('fabMenu');
fabBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fabMenu.classList.toggle('show');
});
document.addEventListener('click', () => {
  fabMenu.classList.remove('show');
});

// Logout
document.getElementById('signOutBtn').textContent = 'Log out';
document.getElementById('signOutBtn').addEventListener('click', () => {
  signOut(auth).then(() => {
    window.location.href = 'index.html';
  }).catch((error) => {
    console.error('Log out error:', error);
    alert('Failed to log out. Please try again.');
  });
});

// Modal logic
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModal');

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalContent.innerHTML = '';
}
closeModalBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

fabMenu.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('fab-item')) return;
  const action = e.target.dataset.action;
  fabMenu.classList.remove('show');
  if (action === 'add-student') showAddStudentForm();
  else if (action === 'add-teacher') showAddTeacherForm();
});

// ================= ADD STUDENT LOGIC =================
function showAddStudentForm() {
  renderSingleStudentForm();
  modalOverlay.classList.remove('hidden');
}

function renderSingleStudentForm() {
  modalContent.innerHTML = `
    <button id="switchToBulkBtn" style="margin-bottom: 15px;">Add Multiple Students</button>
    <form id="addStudentForm" style="display: flex; flex-direction: column; gap: 10px;">
      <label for="studentId">Student ID</label>
      <input type="text" id="studentId" name="studentId" required />
      <label for="name">Student Name</label>
      <input type="text" id="name" name="name" required />
      <button type="submit" style="align-self: flex-start;">Add Student</button>
    </form>
    <div id="formMessage" style="margin-top:10px;color:red;"></div>
  `;
  document.getElementById('switchToBulkBtn').addEventListener('click', renderBulkStudentForm);

  const form = document.getElementById('addStudentForm');
  const formMessage = document.getElementById('formMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = form.studentId.value.trim();
    const name = form.name.value.trim();
    if (!studentId || !name) {
      formMessage.textContent = 'Please fill in all fields.';
      return;
    }
    formMessage.style.color = 'black';
    formMessage.textContent = 'Adding student...';
    try {
      await addDoc(collection(db, 'students'), { studentId, name });
      formMessage.style.color = 'green';
      formMessage.textContent = 'Student added successfully!';
      form.reset();
      setTimeout(closeModal, 1500);
    } catch (error) {
      console.error('Error adding student:', error);
      formMessage.style.color = 'red';
      formMessage.textContent = 'Failed to add student. Please try again.';
    }
  });
}

function renderBulkStudentForm() {
  modalContent.innerHTML = `
    <button id="switchToSingleBtn" style="margin-bottom: 15px;">Add Single Student</button>
    <table id="bulkStudentTable" border="1" style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th>Student ID</th>
          <th>Student Name</th>
          <th>Remove</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><input type="text" class="studentIdInput" required></td>
          <td><input type="text" class="nameInput" required></td>
          <td><button type="button" class="removeRowBtn">✕</button></td>
        </tr>
      </tbody>
    </table>
    <button id="addRowBtn" type="button" style="margin-top:10px;">Add Row</button>
    <br />
    <button id="saveAllBtn" type="button" style="margin-top:10px;">Save All Students</button>
    <div id="bulkFormMessage" style="margin-top:10px;color:red;"></div>
  `;
  document.getElementById('switchToSingleBtn').addEventListener('click', renderSingleStudentForm);

  const addRowBtn = document.getElementById('addRowBtn');
  const tbody = modalContent.querySelector('#bulkStudentTable tbody');
  const bulkFormMessage = document.getElementById('bulkFormMessage');

  function attachRemoveHandlers() {
    const removeBtns = modalContent.querySelectorAll('.removeRowBtn');
    removeBtns.forEach(btn => {
      btn.onclick = () => {
        if (tbody.rows.length > 1) btn.closest('tr').remove();
        else alert('At least one row is required.');
      };
    });
  }
  attachRemoveHandlers();

  addRowBtn.addEventListener('click', () => {
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
      <td><input type="text" class="studentIdInput" required></td>
      <td><input type="text" class="nameInput" required></td>
      <td><button type="button" class="removeRowBtn">✕</button></td>
    `;
    tbody.appendChild(newRow);
    attachRemoveHandlers();
  });

  document.getElementById('saveAllBtn').addEventListener('click', async () => {
    bulkFormMessage.style.color = 'black';
    bulkFormMessage.textContent = 'Saving students...';
    const studentIdInputs = modalContent.querySelectorAll('.studentIdInput');
    const nameInputs = modalContent.querySelectorAll('.nameInput');

    const studentsToAdd = [];
    for (let i = 0; i < studentIdInputs.length; i++) {
      const idVal = studentIdInputs[i].value.trim();
      const nameVal = nameInputs[i].value.trim();
      if (!idVal || !nameVal) {
        bulkFormMessage.style.color = 'red';
        bulkFormMessage.textContent = `Please fill all fields in row ${i + 1}.`;
        return;
      }
      studentsToAdd.push({ studentId: idVal, name: nameVal });
    }

    try {
      for (const student of studentsToAdd) {
        await addDoc(collection(db, 'students'), student);
      }
      bulkFormMessage.style.color = 'green';
      bulkFormMessage.textContent = `Added ${studentsToAdd.length} students successfully!`;
      setTimeout(closeModal, 1500);
    } catch (error) {
      console.error('Error adding students:', error);
      bulkFormMessage.style.color = 'red';
      bulkFormMessage.textContent = 'Failed to add students. Please try again.';
    }
  });
}

// ================= ADD TEACHER LOGIC =================
function showAddTeacherForm() {
  renderSingleTeacherForm();
  modalOverlay.classList.remove('hidden');
}

function renderSingleTeacherForm() {
  modalContent.innerHTML = `
    <button id="switchToBulkTeacherBtn" style="margin-bottom: 15px;">Add Multiple Teachers</button>
    <form id="addTeacherForm" style="display: flex; flex-direction: column; gap: 10px;">
      <label for="teacherName">Teacher Name</label>
      <input type="text" id="teacherName" name="teacherName" required />
      <label for="teacherEmail">Teacher Email</label>
      <input type="email" id="teacherEmail" name="teacherEmail" required />
      <button type="submit" style="align-self: flex-start;">Add Teacher</button>
    </form>
    <div id="teacherFormMessage" style="margin-top:10px;color:red;"></div>
  `;
  document.getElementById('switchToBulkTeacherBtn').addEventListener('click', renderBulkTeacherForm);

  const form = document.getElementById('addTeacherForm');
  const formMessage = document.getElementById('teacherFormMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const teacherName = form.teacherName.value.trim();
    const teacherEmail = form.teacherEmail.value.trim();
    if (!teacherName || !teacherEmail) {
      formMessage.textContent = 'Please fill in all fields.';
      return;
    }
    formMessage.style.color = 'black';
    formMessage.textContent = 'Adding teacher...';
    try {
      await addDoc(collection(db, 'teachers'), { name: teacherName, email: teacherEmail });
      formMessage.style.color = 'green';
      formMessage.textContent = 'Teacher added successfully!';
      form.reset();
      setTimeout(closeModal, 1500);
    } catch (error) {
      console.error('Error adding teacher:', error);
      formMessage.style.color = 'red';
      formMessage.textContent = 'Failed to add teacher. Please try again.';
    }
  });
}

function renderBulkTeacherForm() {
  modalContent.innerHTML = `
    <button id="switchToSingleTeacherBtn" style="margin-bottom: 15px;">Add Single Teacher</button>
    <table id="bulkTeacherTable" border="1" style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th>Teacher Name</th>
          <th>Teacher Email</th>
          <th>Remove</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><input type="text" class="teacherNameInput" required></td>
          <td><input type="email" class="teacherEmailInput" required></td>
          <td><button type="button" class="removeRowBtn">✕</button></td>
        </tr>
      </tbody>
    </table>
    <button id="addTeacherRowBtn" type="button" style="margin-top:10px;">Add Row</button>
    <br />
    <button id="saveAllTeachersBtn" type="button" style="margin-top:10px;">Save All Teachers</button>
    <div id="bulkTeacherFormMessage" style="margin-top:10px;color:red;"></div>
  `;
  document.getElementById('switchToSingleTeacherBtn').addEventListener('click', renderSingleTeacherForm);

  const addRowBtn = document.getElementById('addTeacherRowBtn');
  const tbody = modalContent.querySelector('#bulkTeacherTable tbody');
  const bulkFormMessage = document.getElementById('bulkTeacherFormMessage');

  function attachRemoveHandlers() {
    const removeBtns = modalContent.querySelectorAll('.removeRowBtn');
    removeBtns.forEach(btn => {
      btn.onclick = () => {
        if (tbody.rows.length > 1) btn.closest('tr').remove();
        else alert('At least one row is required.');
      };
    });
  }
  attachRemoveHandlers();

  addRowBtn.addEventListener('click', () => {
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
      <td><input type="text" class="teacherNameInput" required></td>
      <td><input type="email" class="teacherEmailInput" required></td>
      <td><button type="button" class="removeRowBtn">✕</button></td>
    `;
    tbody.appendChild(newRow);
    attachRemoveHandlers();
  });

  document.getElementById('saveAllTeachersBtn').addEventListener('click', async () => {
    bulkFormMessage.style.color = 'black';
    bulkFormMessage.textContent = 'Saving teachers...';
    const teacherNameInputs = modalContent.querySelectorAll('.teacherNameInput');
    const teacherEmailInputs = modalContent.querySelectorAll('.teacherEmailInput');

    const teachersToAdd = [];
    for (let i = 0; i < teacherNameInputs.length; i++) {
      const nameVal = teacherNameInputs[i].value.trim();
      const emailVal = teacherEmailInputs[i].value.trim();
      if (!nameVal || !emailVal) {
        bulkFormMessage.style.color = 'red';
        bulkFormMessage.textContent = `Please fill all fields in row ${i + 1}.`;
        return;
      }
      teachersToAdd.push({ name: nameVal, email: emailVal });
    }

    try {
      for (const teacher of teachersToAdd) {
        await addDoc(collection(db, 'teachers'), teacher);
      }
      bulkFormMessage.style.color = 'green';
      bulkFormMessage.textContent = `Added ${teachersToAdd.length} teachers successfully!`;
      setTimeout(closeModal, 1500);
    } catch (error) {
      console.error('Error adding teachers:', error);
      bulkFormMessage.style.color = 'red';
      bulkFormMessage.textContent = 'Failed to add teachers. Please try again.';
    }
  });
}
