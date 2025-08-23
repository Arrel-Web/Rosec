import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Your Firebase config
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

const teachersTableBody = document.querySelector('#teachersTable tbody');

async function loadTeachers() {
  try {
    const teachersCol = collection(db, 'teachers');
    const teachersSnapshot = await getDocs(teachersCol);

    if (teachersSnapshot.empty) {
      teachersTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#666;">No teachers found.</td></tr>`;
      return;
    }

    teachersTableBody.innerHTML = '';
    teachersSnapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${data.name || '-'}</td>
        <td>${data.email || '-'}</td>
      `;
      teachersTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error loading teachers:', error);
    teachersTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:red;">Failed to load teachers.</td></tr>`;
  }
}

// Load teachers on page load
loadTeachers();

// ===== Modal + Add Teacher (single & bulk) =====
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModal');
const addTeacherBtn = document.getElementById('addTeacherBtn');

function closeModal() {
  if (!modalOverlay || !modalContent) return;
  modalOverlay.classList.add('hidden');
  modalContent.innerHTML = '';
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if (modalOverlay) {
  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
  });
}

function showAddTeacherForm() {
  if (!modalOverlay || !modalContent) return;
  renderSingleTeacherForm();
  modalOverlay.classList.remove('hidden');
}

if (addTeacherBtn) {
  addTeacherBtn.addEventListener('click', showAddTeacherForm);
}

function renderSingleTeacherForm() {
  modalContent.innerHTML = `
    <div class="form-actions" style="display:flex; justify-content:flex-end; margin-bottom: 10px;">
      <button id="switchToBulkTeacherBtn" class="btn btn-secondary"><i class="fa-solid fa-users"></i> Add Multiple</button>
    </div>
    <form id="addTeacherForm" class="form-grid" novalidate>
      <div class="field">
        <label for="teacherName">Teacher Name</label>
        <input type="text" id="teacherName" name="teacherName" class="text-input" placeholder="e.g. Jane Doe" required />
      </div>
      <div class="field">
        <label for="teacherEmail">Teacher Email</label>
        <input type="email" id="teacherEmail" name="teacherEmail" class="text-input" placeholder="e.g. jane@school.edu" required />
      </div>
      <div class="form-row">
        <button type="submit" class="btn btn-primary"><i class="fa-solid fa-user-plus"></i> Add Teacher</button>
      </div>
    </form>
    <div id="teacherFormMessage" class="form-message" aria-live="polite"></div>
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
      formMessage.className = 'form-message error';
      return;
    }

    formMessage.textContent = 'Adding teacher...';
    formMessage.className = 'form-message info';

    try {
      await addDoc(collection(db, 'teachers'), { name: teacherName, email: teacherEmail });
      formMessage.textContent = 'Teacher added successfully!';
      formMessage.className = 'form-message success';
      form.reset();
      await loadTeachers();
      setTimeout(closeModal, 1200);
    } catch (error) {
      console.error('Error adding teacher:', error);
      formMessage.textContent = 'Failed to add teacher. Please try again.';
      formMessage.className = 'form-message error';
    }
  });
}

function renderBulkTeacherForm() {
  modalContent.innerHTML = `
    <div class="form-actions" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
      <button id="switchToSingleTeacherBtn" class="btn btn-ghost"><i class="fa-solid fa-user"></i> Add Single</button>
      <button id="addTeacherRowBtn" class="btn btn-secondary" type="button"><i class="fa-solid fa-plus"></i> Add Row</button>
    </div>

    <div class="table-card" style="margin-bottom:12px;">
      <table id="bulkTeacherTable" class="table-compact" aria-label="Bulk add teachers">
        <thead>
          <tr>
            <th>Teacher Name</th>
            <th>Teacher Email</th>
            <th style="width: 80px;">Remove</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><input type="text" class="text-input teacherNameInput" placeholder="e.g. John Smith" required></td>
            <td><input type="email" class="text-input teacherEmailInput" placeholder="e.g. john@school.edu" required></td>
            <td style="text-align:center;"><button type="button" class="btn btn-danger removeRowBtn" title="Remove"><i class="fa-solid fa-trash"></i></button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div style="display:flex; gap:8px; justify-content:flex-end;">
      <button id="saveAllTeachersBtn" class="btn btn-primary" type="button"><i class="fa-solid fa-floppy-disk"></i> Save All</button>
    </div>

    <div id="bulkTeacherFormMessage" class="form-message" aria-live="polite"></div>
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
      <td><input type="text" class="text-input teacherNameInput" placeholder="e.g. Sam Lee" required></td>
      <td><input type="email" class="text-input teacherEmailInput" placeholder="e.g. sam@school.edu" required></td>
      <td style="text-align:center;"><button type="button" class="btn btn-danger removeRowBtn" title="Remove"><i class="fa-solid fa-trash"></i></button></td>
    `;
    tbody.appendChild(newRow);
    attachRemoveHandlers();
  });

  document.getElementById('saveAllTeachersBtn').addEventListener('click', async () => {
    bulkFormMessage.textContent = 'Saving teachers...';
    bulkFormMessage.className = 'form-message info';

    const teacherNameInputs = modalContent.querySelectorAll('.teacherNameInput');
    const teacherEmailInputs = modalContent.querySelectorAll('.teacherEmailInput');

    const teachersToAdd = [];
    for (let i = 0; i < teacherNameInputs.length; i++) {
      const nameVal = teacherNameInputs[i].value.trim();
      const emailVal = teacherEmailInputs[i].value.trim();
      if (!nameVal || !emailVal) {
        bulkFormMessage.textContent = `Please fill all fields in row ${i + 1}.`;
        bulkFormMessage.className = 'form-message error';
        return;
      }
      teachersToAdd.push({ name: nameVal, email: emailVal });
    }

    try {
      for (const teacher of teachersToAdd) {
        await addDoc(collection(db, 'teachers'), teacher);
      }
      bulkFormMessage.textContent = `Added ${teachersToAdd.length} teachers successfully!`;
      bulkFormMessage.className = 'form-message success';
      await loadTeachers();
      setTimeout(closeModal, 1200);
    } catch (error) {
      console.error('Error adding teachers:', error);
      bulkFormMessage.textContent = 'Failed to add teachers. Please try again.';
      bulkFormMessage.className = 'form-message error';
    }
  });
}
