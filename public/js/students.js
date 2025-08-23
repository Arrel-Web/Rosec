import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

const studentsTableBody = document.querySelector('#studentsTable tbody');

async function loadStudents() {
  studentsTableBody.innerHTML = ''; // clear old rows

  try {
    const studentsSnapshot = await getDocs(collection(db, 'students'));

    if (studentsSnapshot.empty) {
      studentsTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#666;">No students found.</td></tr>`;
      return;
    }

    studentsSnapshot.forEach(doc => {
      const data = doc.data();
      const row = document.createElement('tr');

      // Student ID
      const idCell = document.createElement('td');
      idCell.textContent = data.studentId || 'N/A';

      // Student Name
      const nameCell = document.createElement('td');
      nameCell.textContent = data.name || 'Unnamed';

      row.appendChild(idCell);
      row.appendChild(nameCell);

      studentsTableBody.appendChild(row);
    });

  } catch (error) {
    console.error('Error loading students:', error);
    studentsTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:red;">Failed to load students.</td></tr>`;
  }
}

// ------- Modal scaffolding (creates if missing) -------
let modalOverlay = document.getElementById('modalOverlay');
let modalContent = document.getElementById('modalContent');
let closeModalBtn = document.getElementById('closeModal');

if (!modalOverlay || !modalContent || !closeModalBtn) {
  modalOverlay = document.createElement('div');
  modalOverlay.id = 'modalOverlay';
  modalOverlay.style.position = 'fixed';
  modalOverlay.style.inset = '0';
  modalOverlay.style.background = 'rgba(0,0,0,0.5)';
  modalOverlay.style.display = 'flex';
  modalOverlay.style.alignItems = 'center';
  modalOverlay.style.justifyContent = 'center';
  modalOverlay.style.zIndex = '1000';
  modalOverlay.classList = 'hidden';

  const modalBox = document.createElement('div');
  modalBox.style.background = 'white';
  modalBox.style.borderRadius = '8px';
  modalBox.style.padding = '16px';
  modalBox.style.minWidth = '320px';
  modalBox.style.maxWidth = '90%';
  modalBox.style.position = 'relative';

  closeModalBtn = document.createElement('button');
  closeModalBtn.id = 'closeModal';
  closeModalBtn.textContent = '✕';
  closeModalBtn.style.position = 'absolute';
  closeModalBtn.style.top = '8px';
  closeModalBtn.style.right = '8px';

  modalContent = document.createElement('div');
  modalContent.id = 'modalContent';

  modalBox.appendChild(closeModalBtn);
  modalBox.appendChild(modalContent);
  modalOverlay.appendChild(modalBox);
  document.body.appendChild(modalOverlay);
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalContent.innerHTML = '';
}
closeModalBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
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
      loadStudents();
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
      loadStudents();
      setTimeout(closeModal, 1500);
    } catch (error) {
      console.error('Error adding students:', error);
      bulkFormMessage.style.color = 'red';
      bulkFormMessage.textContent = 'Failed to add students. Please try again.';
    }
  });
}

// Wire header button
const openAddStudentBtn = document.getElementById('openAddStudentBtn');
if (openAddStudentBtn) openAddStudentBtn.addEventListener('click', showAddStudentForm);

// Load students on page load
loadStudents();
  