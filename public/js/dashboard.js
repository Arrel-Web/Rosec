import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, getDocs, query, where, orderBy, doc, getDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
  getAuth, onAuthStateChanged, signOut 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getUserRole, applySidebarRestrictions, applyPageRestrictions, clearRoleCache } from './role-manager.js';

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
const sortBtn = document.getElementById('sortBtn');
const sortMenu = document.getElementById('sortMenu');
const bulkActionsBar = document.getElementById('bulkActionsBar');
const selectedCount = document.getElementById('selectedCount');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
const cancelSelectionBtn = document.getElementById('cancelSelectionBtn');

// Toggle user dropdown
userIconBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  userDropdown.classList.toggle('show');
});

// Toggle sort dropdown
sortBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  sortMenu.classList.toggle('show');
});

// Close dropdowns when clicking outside
document.addEventListener('click', () => {
  userDropdown.classList.remove('show');
  sortMenu.classList.remove('show');
});

// This function is now imported from role-manager.js

// Format timestamp
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Update exam count indicator
function updateExamCount(count) {
  const examCountDisplay = document.getElementById('examCountDisplay');
  if (examCountDisplay) {
    examCountDisplay.textContent = `${count} Exam${count === 1 ? '' : 's'}`;
  }
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

  // Determine total questions and answer key status
  const totalQuestions = exam.totalQuestions || 0;
  const hasAnswerKey = exam.items && exam.items.length > 0;
  const questionsDisplay = hasAnswerKey 
    ? `${totalQuestions} <span class="answer-key-status has-key" title="Answer key available">✓</span>`
    : `${totalQuestions} <span class="answer-key-status no-key" title="No answer key yet">⚠️</span>`;

  row.innerHTML = `
    <td class="checkbox-col">
      <input type="checkbox" class="exam-checkbox" data-exam-id="${exam.id}">
    </td>
    <td class="exam-title">${exam.examTitle || exam.questionSetId || 'Untitled Exam'}</td>
    <td class="subject-name">${subjectName}</td>
    <td class="class-name">${exam.classId || 'N/A'}</td>
    <td class="total-questions">${questionsDisplay}</td>
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
    let examsQuery;
    let filteredExams = [];

    if (role === 'admin') {
      // Admins can see all exams
      examsQuery = query(collection(db, 'exams'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(examsQuery);
      filteredExams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else if (role === 'teacher') {
      // Teachers can only see exams from their assigned classes
      // First, get all classes assigned to this teacher
      const teacherClassesQuery = query(collection(db, 'classes'), where('teacherEmail', '==', userEmail));
      const teacherClassesSnapshot = await getDocs(teacherClassesQuery);
      
      if (teacherClassesSnapshot.empty) {
        examsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <div>
              <i class="fa-solid fa-clipboard-list"></i>
              <h3>No exams found</h3>
              <p>You don't have any classes assigned yet, or no exams have been created for your classes.</p>
            </div>
          </td>
        </tr>
      `;
      updateExamCount(0);
      return;
      }

      // Get unique class IDs assigned to this teacher
      const assignedClassIds = new Set();
      teacherClassesSnapshot.forEach(doc => {
        const classData = doc.data();
        if (classData.classId) {
          assignedClassIds.add(classData.classId);
        }
      });

      // Get all exams and filter by assigned classes
      const allExamsQuery = query(collection(db, 'exams'), orderBy('createdAt', 'desc'));
      const allExamsSnapshot = await getDocs(allExamsQuery);
      
      filteredExams = allExamsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(exam => assignedClassIds.has(exam.classId));
    } else {
      // Other roles have no access to exams
      examsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <div>
              <i class="fa-solid fa-exclamation-triangle"></i>
              <h3>Access Denied</h3>
              <p>You don't have permission to view exams.</p>
            </div>
          </td>
        </tr>
      `;
      updateExamCount(0);
      return;
    }

    examsTableBody.innerHTML = ''; // Clear existing rows

    if (filteredExams.length === 0) {
      const message = role === 'teacher' 
        ? 'No exams found for your assigned classes. Create your first exam to get started.'
        : 'No exams found. Create your first exam to get started.';
      
      examsTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <div>
              <i class="fa-solid fa-clipboard-list"></i>
              <h3>No exams found</h3>
              <p>${message}</p>
            </div>
          </td>
        </tr>
      `;
      updateExamCount(0);
      return;
    }

    // Store exam data with subject names for sorting
    allExamsData = [];
    for (const examData of filteredExams) {
      const subjectName = await getSubjectName(examData.subjectId);
      const examWithSubject = { ...examData, subjectName };
      allExamsData.push(examWithSubject);
      
      const rowEl = createExamRow(examData, 0, subjectName);
      examsTableBody.appendChild(rowEl);
    }

    // Update exam count indicator
    updateExamCount(filteredExams.length);

    setupSelectAll();
    setupSorting();
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
  
  // Remove existing event listeners to prevent duplicates
  selectAllCheckbox.replaceWith(selectAllCheckbox.cloneNode(true));
  const newSelectAllCheckbox = document.getElementById('selectAll');
  
  newSelectAllCheckbox.addEventListener('change', (e) => {
    examCheckboxes.forEach(checkbox => checkbox.checked = e.target.checked);
    updateBulkActionsBar();
  });
  
  examCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const checkedCount = document.querySelectorAll('.exam-checkbox:checked').length;
      const totalCount = examCheckboxes.length;
      newSelectAllCheckbox.checked = checkedCount === totalCount;
      newSelectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < totalCount;
      updateBulkActionsBar();
    });
  });
}

// Update bulk actions bar visibility and count
function updateBulkActionsBar() {
  const checkedBoxes = document.querySelectorAll('.exam-checkbox:checked');
  const count = checkedBoxes.length;
  
  if (count > 0) {
    bulkActionsBar.classList.add('show');
    selectedCount.textContent = `${count} item${count === 1 ? '' : 's'} selected`;
  } else {
    bulkActionsBar.classList.remove('show');
  }
}

// Bulk delete functionality
bulkDeleteBtn.addEventListener('click', async () => {
  const checkedBoxes = document.querySelectorAll('.exam-checkbox:checked');
  const examIds = Array.from(checkedBoxes).map(checkbox => checkbox.dataset.examId);
  
  if (examIds.length === 0) {
    alert('No exams selected for deletion.');
    return;
  }
  
  const confirmMessage = `Are you sure you want to delete ${examIds.length} exam${examIds.length === 1 ? '' : 's'}? This action cannot be undone.`;
  if (!confirm(confirmMessage)) return;
  
  // Show loading state
  bulkDeleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
  bulkDeleteBtn.disabled = true;
  
  try {
    // Delete all selected exams
    const deletePromises = examIds.map(examId => deleteDoc(doc(db, 'exams', examId)));
    await Promise.all(deletePromises);
    
    // Remove rows from table
    checkedBoxes.forEach(checkbox => {
      const row = checkbox.closest('tr');
      if (row) row.remove();
    });
    
    // Update the allExamsData array
    allExamsData = allExamsData.filter(exam => !examIds.includes(exam.id));
    
    // Hide bulk actions bar
    bulkActionsBar.classList.remove('show');
    
    // Reset select all checkbox
    const selectAllCheckbox = document.getElementById('selectAll');
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
    
    alert(`Successfully deleted ${examIds.length} exam${examIds.length === 1 ? '' : 's'}.`);
    
  } catch (error) {
    console.error('Error deleting exams:', error);
    alert('Failed to delete some exams. Please try again.');
  } finally {
    // Reset button state
    bulkDeleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete Selected';
    bulkDeleteBtn.disabled = false;
  }
});

// Cancel selection functionality
cancelSelectionBtn.addEventListener('click', () => {
  // Uncheck all checkboxes
  const allCheckboxes = document.querySelectorAll('.exam-checkbox, #selectAll');
  allCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
    checkbox.indeterminate = false;
  });
  
  // Hide bulk actions bar
  bulkActionsBar.classList.remove('show');
});

// Sorting functionality
let currentSort = { column: null, direction: 'asc' };
let allExamsData = []; // Store all exam data for sorting

function setupSorting() {
  // Setup sort dropdown options
  const sortOptions = document.querySelectorAll('.sort-option');
  
  sortOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      const sortType = option.dataset.sort;
      
      // Update current sort
      if (currentSort.column === sortType) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = sortType;
        currentSort.direction = 'asc';
      }
      
      // Update button text to show current sort
      const sortText = option.textContent;
      const directionText = currentSort.direction === 'asc' ? '' : ' (Z-A)';
      sortBtn.innerHTML = `<i class="fa-solid fa-sort"></i> ${sortText}${directionText}`;
      
      // Close dropdown
      sortMenu.classList.remove('show');
      
      // Sort and re-render table
      sortAndRenderExams();
    });
  });
}

function sortAndRenderExams() {
  if (!allExamsData.length) return;
  
  const sortedExams = [...allExamsData].sort((a, b) => {
    let aValue, bValue;
    
    switch (currentSort.column) {
      case 'examTitle':
        aValue = (a.examTitle || a.questionSetId || 'Untitled Exam').toLowerCase();
        bValue = (b.examTitle || b.questionSetId || 'Untitled Exam').toLowerCase();
        break;
      case 'subjectName':
        aValue = (a.subjectName || 'N/A').toLowerCase();
        bValue = (b.subjectName || 'N/A').toLowerCase();
        break;
      case 'classId':
        aValue = (a.classId || 'N/A').toLowerCase();
        bValue = (b.classId || 'N/A').toLowerCase();
        break;
      case 'totalQuestions':
        aValue = a.totalQuestions || 0;
        bValue = b.totalQuestions || 0;
        break;
      case 'createdAt':
        aValue = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
        bValue = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
        break;
      default:
        return 0;
    }
    
    let comparison = 0;
    if (aValue < bValue) {
      comparison = -1;
    } else if (aValue > bValue) {
      comparison = 1;
    }
    
    return currentSort.direction === 'desc' ? comparison * -1 : comparison;
  });
  
  // Re-render table with sorted data
  renderSortedExams(sortedExams);
}

function renderSortedExams(sortedExams) {
  examsTableBody.innerHTML = '';
  
  if (sortedExams.length === 0) {
    examsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
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
  
  sortedExams.forEach((examData, index) => {
    const rowEl = createExamRow(examData, index, examData.subjectName);
    examsTableBody.appendChild(rowEl);
  });
  
  setupSelectAll();
}

// Create Exam card click handler
const createExamCard = document.getElementById('createExamCard');
if (createExamCard) {
  createExamCard.addEventListener('click', () => {
    window.location.href = 'answer-sheet-maker.html';
  });
}

// Exam Stats card click handler - redirect to analytics
const examStatsCard = document.getElementById('examStatsCard');
if (examStatsCard) {
  examStatsCard.addEventListener('click', () => {
    window.location.href = 'analytics.html';
  });
}

// Auth listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userNameEl.textContent = user.displayName || 'User Name:';
    userEmailEl.textContent = user.email;
    const role = await getUserRole(user.email, db);
    userRoleEl.textContent = `Role: ${role || 'N/A'}`;
    
    // Store user info in localStorage for immediate restrictions
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userRole', role || '');
    
    // Remove immediate restrictions if user is admin
    if (role !== 'teacher') {
      const immediateStyle = document.getElementById('immediate-teacher-restrictions');
      if (immediateStyle) {
        immediateStyle.remove();
      }
    }
    
    // Apply role-based restrictions
    applySidebarRestrictions(role);
    applyPageRestrictions(role, 'dashboard');
    
    await loadExams(user.email, role);
  } else {
    // Clear localStorage on logout
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    clearRoleCache();
    
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
