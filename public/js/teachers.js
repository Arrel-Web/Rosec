import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, addDoc, getDocs, doc, deleteDoc
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
  const teachersTableBody = document.querySelector('#teachersTable tbody');
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

  // Store all teachers data for filtering
  let allTeachersData = [];

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
      applyPageRestrictions(role, 'teachers');
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

  // ===== TEACHERS LOGIC =====
  async function loadTeachers() {
    if (!teachersTableBody) return;
    teachersTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#666;">Loading teachers...</td></tr>';

    try {
      const teachersSnapshot = await getDocs(collection(db, 'teachers'));
      
      // Store all teachers data for searching
      allTeachersData = [];
      teachersSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        allTeachersData.push({
          id: docSnap.id,
          name: data.name || 'Unnamed',
          email: data.email || 'No email'
        });
      });

      if (allTeachersData.length === 0) {
        teachersTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#666;">No teachers found.</td></tr>`;
        return;
      }

      // Render all teachers initially
      renderTeachers(allTeachersData);
    } catch (error) {
      console.error('Error loading teachers:', error);
      teachersTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Failed to load teachers.</td></tr>`;
    }
  }

  function renderTeachers(teachersToRender) {
    if (!teachersTableBody) return;
    teachersTableBody.innerHTML = '';

    if (teachersToRender.length === 0) {
      teachersTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#666;">No teachers match your search.</td></tr>`;
      return;
    }

    teachersToRender.forEach(teacherData => {
      const row = document.createElement('tr');

      // Checkbox cell
      const checkboxCell = document.createElement('td');
      checkboxCell.style.textAlign = 'center';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'teacher-checkbox';
      checkbox.dataset.teacherId = teacherData.id;
      checkbox.addEventListener('change', updateBulkActionsBar);
      checkboxCell.appendChild(checkbox);
      row.appendChild(checkboxCell);

      // Name cell
      const nameCell = document.createElement('td');
      nameCell.textContent = teacherData.name;
      row.appendChild(nameCell);

      // Email cell
      const emailCell = document.createElement('td');
      emailCell.textContent = teacherData.email;
      row.appendChild(emailCell);

      // Actions cell
      const actionCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.classList.add('delete-btn');
      deleteBtn.style.cssText = 'background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;';
      deleteBtn.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete teacher ${teacherData.name}?`)) {
          try {
            await deleteDoc(doc(db, 'teachers', teacherData.id));
            // Remove from allTeachersData and re-render
            allTeachersData = allTeachersData.filter(t => t.id !== teacherData.id);
            performSearch(); // Re-apply current search
            updateBulkActionsBar(); // Update bulk actions bar
          } catch (err) {
            console.error('Error deleting teacher:', err);
            alert('Failed to delete teacher.');
          }
        }
      });
      actionCell.appendChild(deleteBtn);
      row.appendChild(actionCell);

      teachersTableBody.appendChild(row);
    });

    setupSelectAll();
  }

  // ===== SEARCH FUNCTIONALITY =====
  function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
      renderTeachers(allTeachersData);
      clearSearchBtn.style.display = 'none';
      return;
    }

    clearSearchBtn.style.display = 'block';

    const filteredTeachers = allTeachersData.filter(teacher => {
      const name = teacher.name.toLowerCase();
      const email = teacher.email.toLowerCase();
      return name.includes(searchTerm) || email.includes(searchTerm);
    });

    renderTeachers(filteredTeachers);
  }

  function clearSearch() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderTeachers(allTeachersData);
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

  // ===== BULK ACTIONS FUNCTIONALITY =====
  
  // Setup select all functionality
  function setupSelectAll() {
    const teacherCheckboxes = document.querySelectorAll('.teacher-checkbox');
    
    // Only add event listener if it doesn't already exist
    if (selectAllCheckbox && !selectAllCheckbox.hasAttribute('data-listener-added')) {
      selectAllCheckbox.setAttribute('data-listener-added', 'true');
      selectAllCheckbox.addEventListener('change', (e) => {
        const currentTeacherCheckboxes = document.querySelectorAll('.teacher-checkbox');
        currentTeacherCheckboxes.forEach(checkbox => checkbox.checked = e.target.checked);
        updateBulkActionsBar();
      });
    }
  }

  // Update bulk actions bar visibility and count
  function updateBulkActionsBar() {
    const checkedBoxes = document.querySelectorAll('.teacher-checkbox:checked');
    const count = checkedBoxes.length;
    
    if (count > 0) {
      bulkActionsBar.classList.add('show');
      selectedCount.textContent = `${count} teacher${count === 1 ? '' : 's'} selected`;
    } else {
      bulkActionsBar.classList.remove('show');
    }

    // Update select all checkbox state
    const allCheckboxes = document.querySelectorAll('.teacher-checkbox');
    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox && allCheckboxes.length > 0) {
      selectAllCheckbox.checked = count === allCheckboxes.length;
      selectAllCheckbox.indeterminate = count > 0 && count < allCheckboxes.length;
    }
  }

  // Bulk delete functionality
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', async () => {
      const checkedBoxes = document.querySelectorAll('.teacher-checkbox:checked');
      const teacherIds = Array.from(checkedBoxes).map(checkbox => checkbox.dataset.teacherId);
      
      if (teacherIds.length === 0) {
        alert('No teachers selected for deletion.');
        return;
      }
      
      const confirmMessage = `Are you sure you want to delete ${teacherIds.length} teacher${teacherIds.length === 1 ? '' : 's'}? This action cannot be undone.`;
      if (!confirm(confirmMessage)) return;
      
      // Show loading state
      bulkDeleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
      bulkDeleteBtn.disabled = true;
      
      try {
        // Delete all selected teachers
        const deletePromises = teacherIds.map(teacherId => deleteDoc(doc(db, 'teachers', teacherId)));
        await Promise.all(deletePromises);
        
        // Update the allTeachersData array
        allTeachersData = allTeachersData.filter(teacher => !teacherIds.includes(teacher.id));
        
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
        
        alert(`Successfully deleted ${teacherIds.length} teacher${teacherIds.length === 1 ? '' : 's'}.`);
        
      } catch (error) {
        console.error('Error deleting teachers:', error);
        alert('Failed to delete some teachers. Please try again.');
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
      const allCheckboxes = document.querySelectorAll('.teacher-checkbox, #selectAll');
      allCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.indeterminate = false;
      });
      
      // Hide bulk actions bar
      bulkActionsBar.classList.remove('show');
    });
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

  function showAddTeacherForm() { renderSingleTeacherForm(); modalOverlay.classList.remove('hidden'); }

  // ---- SINGLE TEACHER FORM ----
  function renderSingleTeacherForm() {
    if (!modalContent) return;
    // Remove auto-sizing class for single operations
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('modal-auto-size');
    
    modalContent.innerHTML = `
      <div style="display:flex; gap:8px; margin-bottom:15px;">
        <button id="switchToBulkBtn">Add Multiple Teachers</button>
      </div>
      <form id="addTeacherForm" style="display: flex; flex-direction: column; gap: 10px;">
        <label for="teacherName">Teacher Name</label>
        <input type="text" id="teacherName" name="teacherName" required />
        <label for="teacherEmail">Teacher Email</label>
        <input type="email" id="teacherEmail" name="teacherEmail" required />
        <button type="submit" style="align-self: flex-start;">Add Teacher</button>
      </form>
      <div id="formMessage" style="margin-top:10px;color:red;"></div>
    `;
    document.getElementById('switchToBulkBtn').addEventListener('click', renderBulkTeacherForm);

    const form = document.getElementById('addTeacherForm');
    const formMessage = document.getElementById('formMessage');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const teacherName = form.teacherName.value.trim();
      const teacherEmail = form.teacherEmail.value.trim();
      if (!teacherName || !teacherEmail) {
        formMessage.textContent = 'Please fill in all fields.';
        return;
      }
      formMessage.style.color = 'black';
      formMessage.textContent = 'Saving...';
      try {
        await addDoc(collection(db, 'teachers'), { name: teacherName, email: teacherEmail });
        formMessage.style.color = 'green';
        formMessage.textContent = 'Saved!';
        form.reset();
        loadTeachers();
        setTimeout(closeModal, 1000);
      } catch (error) {
        console.error('Error saving teacher:', error);
        formMessage.style.color = 'red';
        formMessage.textContent = 'Failed to save teacher. Please try again.';
      }
    });
  }

  // ---- BULK TEACHER FORM ----
  function renderBulkTeacherForm() {
    if (!modalContent) return;
    // Add auto-sizing class for bulk operations
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('modal-auto-size');
    
    modalContent.innerHTML = `
      <div style="display:flex; gap:8px; margin-bottom:15px;">
        <button id="switchToSingleBtn">Add Single Teacher</button>
      </div>
      <div class="bulk-table-container">
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
      </div>
      <button id="addRowBtn" type="button" style="margin-top:10px;">Add Row</button>
      <br />
      <button id="saveAllBtn" type="button" style="margin-top:10px;">Save All</button>
      <div id="bulkFormMessage" style="margin-top:10px;color:red"></div>
    `;

    document.getElementById('switchToSingleBtn').addEventListener('click', renderSingleTeacherForm);

    const addRowBtn = document.getElementById('addRowBtn');
    const tbody = modalContent.querySelector('#bulkTeacherTable tbody');
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
        <td><input type="text" class="teacherNameInput" required></td>
        <td><input type="email" class="teacherEmailInput" required></td>
        <td><button type="button" class="removeRowBtn">✕</button></td>
      `;
      tbody.appendChild(newRow);
      attachRemoveHandlers();
    });

    document.getElementById('saveAllBtn').addEventListener('click', async () => {
      bulkFormMessage.style.color = 'black';
      bulkFormMessage.textContent = 'Saving teachers...';
      const teacherNameInputs = modalContent.querySelectorAll('.teacherNameInput');
      const teacherEmailInputs = modalContent.querySelectorAll('.teacherEmailInput');

      const teachersToSave = [];
      for (let i = 0; i < teacherNameInputs.length; i++) {
        const nameVal = teacherNameInputs[i].value.trim();
        const emailVal = teacherEmailInputs[i].value.trim();
        if (!nameVal || !emailVal) {
          bulkFormMessage.style.color = 'red';
          bulkFormMessage.textContent = `Please fill all fields in row ${i + 1}.`;
          return;
        }
        teachersToSave.push({ name: nameVal, email: emailVal });
      }

      try {
        for (const teacher of teachersToSave) {
          await addDoc(collection(db, 'teachers'), teacher);
        }
        bulkFormMessage.style.color = 'green';
        bulkFormMessage.textContent = `Saved ${teachersToSave.length} teachers!`;
        loadTeachers();
        setTimeout(closeModal, 1200);
      } catch (error) {
        console.error('Error saving teachers:', error);
        bulkFormMessage.style.color = 'red';
        bulkFormMessage.textContent = 'Failed to save teachers. Please try again.';
      }
    });
  }

  // ===== WIRE OPEN BUTTON =====
  const openAddTeacherBtn = document.getElementById('openAddTeacherBtn');
  if (openAddTeacherBtn) openAddTeacherBtn.addEventListener('click', showAddTeacherForm);

  // ===== WIRE NEW ACTION CARDS =====
  const quickAddTeacherCard = document.getElementById('quickAddTeacherCard');
  const bulkAddTeachersCard = document.getElementById('bulkAddTeachersCard');
  const teacherStatsCard = document.getElementById('teacherStatsCard');

  if (quickAddTeacherCard) {
    quickAddTeacherCard.addEventListener('click', showAddTeacherForm);
  }

  if (bulkAddTeachersCard) {
    bulkAddTeachersCard.addEventListener('click', () => {
      renderBulkTeacherForm();
      modalOverlay.classList.remove('hidden');
    });
  }

  if (teacherStatsCard) {
    teacherStatsCard.addEventListener('click', () => {
      // Show teacher statistics or analytics page
      window.location.href = 'analytics.html';
    });
  }

  // ===== UPDATE TEACHER COUNT =====
  function updateTeacherCount() {
    const totalTeachersCountEl = document.getElementById('totalTeachersCount');
    if (totalTeachersCountEl && allTeachersData) {
      totalTeachersCountEl.textContent = allTeachersData.length;
    }
  }

  // Update teacher count when teachers are loaded
  const originalLoadTeachers = loadTeachers;
  loadTeachers = async function() {
    await originalLoadTeachers();
    updateTeacherCount();
  };

  // ===== LOAD TEACHERS =====
  loadTeachers();
});