import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, getDocs, query, where, doc, setDoc, updateDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
  getAuth, onAuthStateChanged, signOut 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getUserRole, applySidebarRestrictions, applyPageRestrictions } from './role-manager.js';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAznHzrOLmLvI98_0P649Tx5TZEwXaNNBs",
  authDomain: "rosec-57d1d.firebaseapp.com",
  projectId: "rosec-57d1d",
  storageBucket: "rosec-57d1d.appspot.com",
  messagingSenderId: "994663054798",
  appId: "1:994663054798:web:6214585d90b6fcc583bf9f",
  measurementId: "G-LM6RHY4WTZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
  // DOM references
  const studentsTableBody = document.querySelector('#studentsTable tbody');
  const userNameEl = document.getElementById('user-name');
  const userEmailEl = document.getElementById('user-email');
  const userRoleEl = document.getElementById('user-role');
  const userIconBtn = document.getElementById('userIconBtn');
  const userDropdown = document.getElementById('userDropdown');
  const signOutBtn = document.getElementById('signOutBtn');

  const modalOverlay = document.getElementById('modalOverlay');
  const modalContent = document.getElementById('modalContent');
  const closeModalBtn = document.getElementById('closeModal');

  // Search elements
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  // Bulk actions elements
  const selectAllCheckbox = document.getElementById('selectAll');
  const bulkActionsBar = document.getElementById('bulkActionsBar');
  const selectedCount = document.getElementById('selectedCount');
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  const cancelSelectionBtn = document.getElementById('cancelSelectionBtn');

  // Store all students data for filtering
  let allStudentsData = [];

  // ===== USER DROPDOWN =====
  if (userIconBtn && userDropdown) {
    userIconBtn.addEventListener('click', e => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => userDropdown.classList.remove('show'));
  }

  // ===== AUTH LISTENER =====
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (userNameEl) userNameEl.textContent = user.displayName || 'User Name:';
      if (userEmailEl) userEmailEl.textContent = user.email;
      const role = await getUserRole(user.email, db);
      if (userRoleEl) userRoleEl.textContent = `Role: ${role || 'N/A'}`;
      
      // Apply role-based restrictions
      applySidebarRestrictions(role);
      applyPageRestrictions(role, 'students');
    } else {
      if (userNameEl) userNameEl.textContent = 'User Name';
      if (userEmailEl) userEmailEl.textContent = 'user@example.com';
      if (userRoleEl) userRoleEl.textContent = 'Role: N/A';
    }
  });

  // ===== SIGN OUT =====
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      signOut(auth)
        .then(() => window.location.href = 'index.html')
        .catch(error => {
          console.error('Log out error:', error);
          alert('Failed to log out. Please try again.');
        });
    });
  }

  // ===== STUDENTS LOGIC =====
  async function loadStudents() {
    if (!studentsTableBody) return;
    studentsTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#666;">Loading students...</td></tr>';

    try {
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      
      // Store all students data for searching
      allStudentsData = [];
      studentsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        allStudentsData.push({
          id: docSnap.id,
          studentId: data.studentId || 'N/A',
          name: data.name || 'Unnamed'
        });
      });

      if (allStudentsData.length === 0) {
        studentsTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#666;">No students found.</td></tr>`;
        return;
      }

      // Render all students initially
      renderStudents(allStudentsData);
    } catch (error) {
      console.error('Error loading students:', error);
      studentsTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">Failed to load students.</td></tr>`;
    }
  }

  function renderStudents(studentsToRender) {
    if (!studentsTableBody) return;
    studentsTableBody.innerHTML = '';

    if (studentsToRender.length === 0) {
      studentsTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#666;">No students match your search.</td></tr>`;
      return;
    }

    studentsToRender.forEach(studentData => {
      const row = document.createElement('tr');

      // Checkbox cell
      const checkboxCell = document.createElement('td');
      checkboxCell.style.textAlign = 'center';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'student-checkbox';
      checkbox.dataset.studentId = studentData.id;
      checkbox.addEventListener('change', updateBulkActionsBar);
      checkboxCell.appendChild(checkbox);
      row.appendChild(checkboxCell);

      // Student ID cell
      const idCell = document.createElement('td');
      idCell.textContent = studentData.studentId;
      row.appendChild(idCell);

      // Name cell
      const nameCell = document.createElement('td');
      nameCell.textContent = studentData.name;
      row.appendChild(nameCell);

      // Actions cell
      const actionCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.classList.add('delete-btn');
      deleteBtn.style.cssText = 'background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;';
      deleteBtn.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete student ${studentData.name}?`)) {
          try {
            await deleteDoc(doc(db, 'students', studentData.id));
            // Remove from allStudentsData and re-render
            allStudentsData = allStudentsData.filter(s => s.id !== studentData.id);
            performSearch(); // Re-apply current search
            updateBulkActionsBar(); // Update bulk actions bar
          } catch (err) {
            console.error('Error deleting student:', err);
            alert('Failed to delete student.');
          }
        }
      });
      actionCell.appendChild(deleteBtn);
      row.appendChild(actionCell);

      studentsTableBody.appendChild(row);
    });

    setupSelectAll();
  }

  // ===== SEARCH FUNCTIONALITY =====
  function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
      renderStudents(allStudentsData);
      clearSearchBtn.style.display = 'none';
      return;
    }

    clearSearchBtn.style.display = 'block';

    const filteredStudents = allStudentsData.filter(student => {
      const studentId = student.studentId.toLowerCase();
      const name = student.name.toLowerCase();
      return studentId.includes(searchTerm) || name.includes(searchTerm);
    });

    renderStudents(filteredStudents);
  }

  function clearSearch() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderStudents(allStudentsData);
    searchInput.focus();
  }

  // ===== SEARCH EVENT LISTENERS =====
  if (searchInput) {
    searchInput.addEventListener('input', performSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        clearSearch();
      }
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', clearSearch);
  }

  async function upsertStudent({ studentId, name }) {
    const cleanId = (studentId || '').trim();
    const cleanName = (name || '').trim();
    if (!cleanId || !cleanName) throw new Error('Missing studentId or name');

    const colRef = collection(db, 'students');
    const q = query(colRef, where('studentId', '==', cleanId));
    const snap = await getDocs(q);

    if (!snap.empty) {
      await Promise.all(snap.docs.map(d => updateDoc(d.ref, { studentId: cleanId, name: cleanName })));
    } else {
      await setDoc(doc(db, 'students', cleanId), { studentId: cleanId, name: cleanName });
    }
  }

  // ===== MODAL LOGIC =====
  function closeModal() {
    if (modalOverlay && modalContent) {
      modalOverlay.classList.add('hidden');
      modalContent.innerHTML = '';
    }
  }
  if (closeModalBtn && modalOverlay) {
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
  }

  function showAddStudentForm() { renderSingleStudentForm(); modalOverlay.classList.remove('hidden'); }

  // ---- SINGLE STUDENT FORM ----
  function renderSingleStudentForm() {
    if (!modalContent) return;
    // Remove auto-sizing class for single operations
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('modal-auto-size');
    
    modalContent.innerHTML = `
      <div style="display:flex; gap:8px; margin-bottom:15px;">
        <button id="switchToBulkBtn">Add Multiple Students</button>
        <button id="switchToCsvBtn">Upload CSV</button>
      </div>
      <form id="addStudentForm" style="display: flex; flex-direction: column; gap: 10px;">
        <label for="studentId">Student ID</label>
        <input type="text" id="studentId" name="studentId" required />
        <label for="name">Student Name</label>
        <input type="text" id="name" name="name" required />
        <button type="submit" style="align-self: flex-start;">Add / Update Student</button>
      </form>
      <div id="formMessage" style="margin-top:10px;color:red;"></div>
    `;
    document.getElementById('switchToBulkBtn').addEventListener('click', renderBulkStudentForm);
    document.getElementById('switchToCsvBtn').addEventListener('click', renderCsvUploadForm);

    const form = document.getElementById('addStudentForm');
    const formMessage = document.getElementById('formMessage');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const studentId = form.studentId.value.trim();
      const name = form.name.value.trim();
      if (!studentId || !name) {
        formMessage.textContent = 'Please fill in all fields.';
        return;
      }
      formMessage.style.color = 'black';
      formMessage.textContent = 'Saving...';
      try {
        await upsertStudent({ studentId, name });
        formMessage.style.color = 'green';
        formMessage.textContent = 'Saved!';
        form.reset();
        loadStudents();
        setTimeout(closeModal, 1000);
      } catch (error) {
        console.error('Error saving student:', error);
        formMessage.style.color = 'red';
        formMessage.textContent = 'Failed to save student. Please try again.';
      }
    });
  }

  // ---- BULK STUDENT FORM ----
  function renderBulkStudentForm() {
    if (!modalContent) return;
    // Add auto-sizing class for bulk operations
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('modal-auto-size');
    
    modalContent.innerHTML = `
      <div style="display:flex; gap:8px; margin-bottom:15px;">
        <button id="switchToSingleBtn">Add Single Student</button>
        <button id="switchToCsvBtn">Upload CSV</button>
      </div>
      <div class="bulk-table-container">
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
      </div>
      <button id="addRowBtn" type="button" style="margin-top:10px;">Add Row</button>
      <br />
      <button id="saveAllBtn" type="button" style="margin-top:10px;">Save All</button>
      <div id="bulkFormMessage" style="margin-top:10px;color:red"></div>
    `;

    document.getElementById('switchToSingleBtn').addEventListener('click', renderSingleStudentForm);
    document.getElementById('switchToCsvBtn').addEventListener('click', renderCsvUploadForm);

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

      const studentsToSave = [];
      for (let i = 0; i < studentIdInputs.length; i++) {
        const idVal = studentIdInputs[i].value.trim();
        const nameVal = nameInputs[i].value.trim();
        if (!idVal || !nameVal) {
          bulkFormMessage.style.color = 'red';
          bulkFormMessage.textContent = `Please fill all fields in row ${i + 1}.`;
          return;
        }
        studentsToSave.push({ studentId: idVal, name: nameVal });
      }

      try {
        for (const student of studentsToSave) {
          await upsertStudent(student);
        }
        bulkFormMessage.style.color = 'green';
        bulkFormMessage.textContent = `Saved ${studentsToSave.length} students!`;
        loadStudents();
        setTimeout(closeModal, 1200);
      } catch (error) {
        console.error('Error saving students:', error);
        bulkFormMessage.style.color = 'red';
        bulkFormMessage.textContent = 'Failed to save students. Please try again.';
      }
    });
  }

  // ---- CSV UPLOAD FORM ----
  function renderCsvUploadForm() {
    if (!modalContent) return;
    // Add auto-sizing class for CSV operations
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('modal-auto-size');
    
    modalContent.innerHTML = `
      <div style="display:flex; gap:8px; margin-bottom:15px;">
        <button id="switchToSingleBtn">Add Single Student</button>
        <button id="switchToBulkBtn">Add Multiple Students</button>
      </div>
      <h3>Upload Students via CSV</h3>
      <input type="file" id="csvFileInput" accept=".csv" />
      <button id="uploadCsvBtn" style="margin-top:10px;">Upload</button>
      <div id="csvMessage" style="margin-top:10px;color:red;"></div>
      <p style="margin-top:10px; font-size:0.9em; color:#555;">
        CSV headers: <code>studentId,name</code><br>
        Example rows:<br>
        <code>S001,Juan Dela Cruz</code><br>
        <code>S002,Maria Santos</code>
      </p>
    `;

    document.getElementById('switchToSingleBtn').addEventListener('click', renderSingleStudentForm);
    document.getElementById('switchToBulkBtn').addEventListener('click', renderBulkStudentForm);

    document.getElementById('uploadCsvBtn').addEventListener('click', () => {
      const fileInput = document.getElementById('csvFileInput');
      const file = fileInput.files[0];
      const csvMessage = document.getElementById('csvMessage');

      if (!file) {
        csvMessage.textContent = "Please select a CSV file first.";
        return;
      }

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function(results) {
          csvMessage.style.color = "black";
          csvMessage.textContent = "Uploading...";
          let success = 0, failed = 0;

          for (let row of results.data) {
            try {
              const studentId = (row.studentId || '').trim();
              const name = (row.name || '').trim();
              if (!studentId || !name) {
                failed++;
                continue;
              }
              await upsertStudent({ studentId, name });
              success++;
            } catch (err) {
              console.error('Row error:', err);
              failed++;
            }
          }

          csvMessage.style.color = failed ? "orange" : "green";
          csvMessage.textContent = `Done. Saved: ${success}${failed ? `, Skipped/Failed: ${failed}` : ''}.`;
          loadStudents();
          setTimeout(closeModal, 1500);
        }
      });
    });
  }

  // ===== BULK ACTIONS FUNCTIONALITY =====
  
  // Setup select all functionality
  function setupSelectAll() {
    const studentCheckboxes = document.querySelectorAll('.student-checkbox');
    
    // Only add event listener if it doesn't already exist
    if (selectAllCheckbox && !selectAllCheckbox.hasAttribute('data-listener-added')) {
      selectAllCheckbox.setAttribute('data-listener-added', 'true');
      selectAllCheckbox.addEventListener('change', (e) => {
        const currentStudentCheckboxes = document.querySelectorAll('.student-checkbox');
        currentStudentCheckboxes.forEach(checkbox => checkbox.checked = e.target.checked);
        updateBulkActionsBar();
      });
    }
  }

  // Update bulk actions bar visibility and count
  function updateBulkActionsBar() {
    const checkedBoxes = document.querySelectorAll('.student-checkbox:checked');
    const count = checkedBoxes.length;
    
    if (count > 0) {
      bulkActionsBar.classList.add('show');
      selectedCount.textContent = `${count} student${count === 1 ? '' : 's'} selected`;
    } else {
      bulkActionsBar.classList.remove('show');
    }

    // Update select all checkbox state
    const allCheckboxes = document.querySelectorAll('.student-checkbox');
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox && allCheckboxes.length > 0) {
      selectAllCheckbox.checked = count === allCheckboxes.length;
      selectAllCheckbox.indeterminate = count > 0 && count < allCheckboxes.length;
    }
  }

  // Bulk delete functionality
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', async () => {
      const checkedBoxes = document.querySelectorAll('.student-checkbox:checked');
      const studentIds = Array.from(checkedBoxes).map(checkbox => checkbox.dataset.studentId);
      
      if (studentIds.length === 0) {
        alert('No students selected for deletion.');
        return;
      }
      
      const confirmMessage = `Are you sure you want to delete ${studentIds.length} student${studentIds.length === 1 ? '' : 's'}? This action cannot be undone.`;
      if (!confirm(confirmMessage)) return;
      
      // Show loading state
      bulkDeleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
      bulkDeleteBtn.disabled = true;
      
      try {
        // Delete all selected students
        const deletePromises = studentIds.map(studentId => deleteDoc(doc(db, 'students', studentId)));
        await Promise.all(deletePromises);
        
        // Update the allStudentsData array
        allStudentsData = allStudentsData.filter(student => !studentIds.includes(student.id));
        
        // Re-render the table
        performSearch();
        
        // Hide bulk actions bar
        bulkActionsBar.classList.remove('show');
        
        // Reset select all checkbox
        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = false;
          selectAllCheckbox.indeterminate = false;
        }
        
        alert(`Successfully deleted ${studentIds.length} student${studentIds.length === 1 ? '' : 's'}.`);
        
      } catch (error) {
        console.error('Error deleting students:', error);
        alert('Failed to delete some students. Please try again.');
      } finally {
        // Reset button state
        bulkDeleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete Selected';
        bulkDeleteBtn.disabled = false;
      }
    });
  }

  // Cancel selection functionality
  if (cancelSelectionBtn) {
    cancelSelectionBtn.addEventListener('click', () => {
      // Uncheck all checkboxes
      const allCheckboxes = document.querySelectorAll('.student-checkbox, #selectAll');
      allCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.indeterminate = false;
      });
      
      // Hide bulk actions bar
      bulkActionsBar.classList.remove('show');
    });
  }

  // ===== WIRE OPEN BUTTON =====
  const openAddStudentBtn = document.getElementById('openAddStudentBtn');
  if (openAddStudentBtn) openAddStudentBtn.addEventListener('click', showAddStudentForm);

  // ===== WIRE NEW ACTION CARDS =====
  const quickAddStudentCard = document.getElementById('quickAddStudentCard');
  const bulkAddStudentsCard = document.getElementById('bulkAddStudentsCard');
  const csvImportCard = document.getElementById('csvImportCard');

  if (quickAddStudentCard) {
    quickAddStudentCard.addEventListener('click', showAddStudentForm);
  }

  if (bulkAddStudentsCard) {
    bulkAddStudentsCard.addEventListener('click', () => {
      renderBulkStudentForm();
      modalOverlay.classList.remove('hidden');
    });
  }

  if (csvImportCard) {
    csvImportCard.addEventListener('click', () => {
      renderCsvUploadForm();
      modalOverlay.classList.remove('hidden');
    });
  }

  // ===== LOAD STUDENTS =====
  loadStudents();
});
