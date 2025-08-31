import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, getDocs, query, where, orderBy, doc, getDoc, deleteDoc
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
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userRoleEl = document.getElementById('user-role');
const userIconBtn = document.getElementById('userIconBtn');
const userDropdown = document.getElementById('userDropdown');
const examsTableBody = document.getElementById('examsTableBody');
const createExamBtn = document.getElementById('createExamBtn');
const selectAllCheckbox = document.getElementById('selectAll');

// Toggle user dropdown
userIconBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  userDropdown.classList.toggle('show');
});
document.addEventListener('click', () => userDropdown.classList.remove('show'));

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

// Format timestamp
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Get subject name by ID
async function getSubjectName(subjectId) {
  if (!subjectId) return 'N/A';
  try {
    const docRef = doc(db, 'subjects', subjectId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return 'N/A';
    return docSnap.data().name || 'N/A';
  } catch (err) {
    console.error('Error fetching subject name:', err);
    return 'N/A';
  }
}

// Create exam row (clickable)
function createExamRow(exam, index, subjectName = 'N/A') {
  const row = document.createElement('tr');
  row.className = 'exam-row';
  row.dataset.examId = exam.id;

  row.innerHTML = `
    <td class="checkbox-col">
      <input type="checkbox" class="exam-checkbox" data-exam-id="${exam.id}">
    </td>
    <td class="exam-title">${exam.examTitle || exam.questionSetId || 'Untitled Exam'}</td>
    <td class="subject-name">${subjectName}</td>
    <td class="class-name">${exam.classId || 'N/A'}</td>
    <td class="total-questions">${exam.items ? exam.items.length : 0}</td>
    <td class="created-at">${formatDate(exam.createdAt)}</td>
    <td class="actions-col">
      <button class="delete-btn"><i class="fa-solid fa-trash"></i></button>
    </td>
  `;

  // Row click navigates to exam details
  row.addEventListener('click', (e) => {
  if (e.target.closest('.checkbox-col') || e.target.closest('.actions-col')) return;
  window.location.href = `exam-details.html?examId=${exam.examId}`;
});

  // Delete button
  row.querySelector('.delete-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this exam?')) return;
    try {
await deleteDoc(doc(db, 'exams', exam.id));
      row.remove();
      alert('Exam deleted successfully');
    } catch (err) {
      console.error('Error deleting exam:', err);
      alert('Failed to delete exam.');
    }
  });

  return row;
}

// Load exams data
async function loadExams(userEmail, role) {
  examsTableBody.innerHTML = `
    <tr class="loading-row">
      <td colspan="8" class="loading-cell">
        <div class="loading-spinner"></div>
        Loading exams...
      </td>
    </tr>
  `;
  try {
const examsQuery = query(collection(db, 'exams'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(examsQuery);

    examsTableBody.innerHTML = ''; // Clear existing rows

    if (querySnapshot.empty) {
      examsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <div>
              <i class="fa-solid fa-clipboard-list"></i>
              <h3>No exams found</h3>
              <p>Create your first exam to get started.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    for (const docItem of querySnapshot.docs) {
      const examData = { id: docItem.id, ...docItem.data() };
      const subjectName = await getSubjectName(examData.subjectId);
      const rowEl = createExamRow(examData, 0, subjectName);
      examsTableBody.appendChild(rowEl);
    }

    setupSelectAll();
  } catch (error) {
    console.error('Error loading exams:', error);
    examsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div>
            <i class="fa-solid fa-exclamation-triangle"></i>
            <h3>Error loading exams</h3>
            <p>Please try refreshing the page.</p>
          </div>
        </td>
      </tr>
    `;
  }
}

// Select all functionality
function setupSelectAll() {
  const examCheckboxes = document.querySelectorAll('.exam-checkbox');
  selectAllCheckbox.addEventListener('change', (e) => {
    examCheckboxes.forEach(checkbox => checkbox.checked = e.target.checked);
  });
  examCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const checkedCount = document.querySelectorAll('.exam-checkbox:checked').length;
      const totalCount = examCheckboxes.length;
      selectAllCheckbox.checked = checkedCount === totalCount;
      selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < totalCount;
    });
  });
}

// Create Exam button
createExamBtn.addEventListener('click', () => {
  window.location.href = 'answer-sheet-maker.html';
});

// Auth listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userNameEl.textContent = user.displayName || 'User Name:';
    userEmailEl.textContent = user.email;
    const role = await getUserRole(user.email);
    userRoleEl.textContent = `Role: ${role || 'N/A'}`;
    await loadExams(user.email, role);
  } else {
    userNameEl.textContent = 'User Name';
    userEmailEl.textContent = 'user@example.com';
    userRoleEl.textContent = 'Role: N/A';
    examsTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div>
            <i class="fa-solid fa-sign-in-alt"></i>
            <h3>Please sign in</h3>
            <p>Sign in to view and manage your exams.</p>
          </div>
        </td>
      </tr>
    `;
  }
});

// Logout
document.getElementById('signOutBtn').addEventListener('click', () => {
  signOut(auth).then(() => window.location.href = 'index.html')
  .catch(error => { console.error('Log out error:', error); alert('Failed to log out.'); });
});
