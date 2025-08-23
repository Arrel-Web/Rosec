import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, addDoc, onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// ===== Real-time teacher loader =====
function loadTeachers() {
  const teachersCol = collection(db, 'teachers');
  onSnapshot(teachersCol, (snapshot) => {
    if (snapshot.empty) {
      teachersTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#666;">No teachers found.</td></tr>`;
      return;
    }
    teachersTableBody.innerHTML = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${data.name || '-'}</td>
        <td>${data.email || '-'}</td>
      `;
      teachersTableBody.appendChild(tr);
    });
  });
}

// start listening immediately
loadTeachers();

// ===== Modal + Add Teacher (single & bulk) =====
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModal');
const openAddTeacherBtn = document.getElementById('openAddTeacherBtn');

function closeModal() {
  if (!modalOverlay || !modalContent) return;
  modalOverlay.classList.add('hidden');
  modalOverlay.setAttribute("aria-hidden", "true");
  modalOverlay.setAttribute("inert", "");
  modalContent.innerHTML = '';
  if (openAddTeacherBtn) openAddTeacherBtn.focus();
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if (modalOverlay) {
  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeModal();
  });
}

function showAddTeacherForm() {
  if (!modalOverlay || !modalContent) {
    console.warn('Modal elements not found (modalOverlay/modalContent).');
    return;
  }
  renderSingleTeacherForm();
  modalOverlay.classList.remove('hidden');
  modalOverlay.removeAttribute("inert");
  modalOverlay.setAttribute("aria-hidden", "false");
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
      setTimeout(closeModal, 1200);
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
      setTimeout(closeModal, 1200);
    } catch (error) {
      console.error('Error adding teachers:', error);
      bulkFormMessage.style.color = 'red';
      bulkFormMessage.textContent = 'Failed to add teachers. Please try again.';
    }
  });
}

// Wire the open button
if (openAddTeacherBtn) {
  openAddTeacherBtn.addEventListener('click', showAddTeacherForm);
}
