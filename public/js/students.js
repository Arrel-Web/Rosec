import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, getDocs, query, where, doc, setDoc, updateDoc, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
  getAuth, onAuthStateChanged, signOut 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

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

  // ===== USER DROPDOWN =====
  if (userIconBtn && userDropdown) {
    userIconBtn.addEventListener('click', e => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => userDropdown.classList.remove('show'));
  }

  // ===== AUTH LISTENER =====
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

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (userNameEl) userNameEl.textContent = user.displayName || 'User Name:';
      if (userEmailEl) userEmailEl.textContent = user.email;
      const role = await getUserRole(user.email);
      if (userRoleEl) userRoleEl.textContent = `Role: ${role || 'N/A'}`;
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
    studentsTableBody.innerHTML = '';

    try {
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      if (studentsSnapshot.empty) {
        studentsTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#666;">No students found.</td></tr>`;
        return;
      }

      studentsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const row = document.createElement('tr');

        const idCell = document.createElement('td');
        idCell.textContent = data.studentId || 'N/A';
        const nameCell = document.createElement('td');
        nameCell.textContent = data.name || 'Unnamed';
        row.appendChild(idCell);
        row.appendChild(nameCell);

        const actionCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.addEventListener('click', async () => {
          if (confirm(`Are you sure you want to delete student ${data.name}?`)) {
            try {
              await deleteDoc(doc(db, 'students', docSnap.id));
              row.remove();
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
    } catch (error) {
      console.error('Error loading students:', error);
      studentsTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">Failed to load students.</td></tr>`;
    }
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
    modalContent.innerHTML = `
      <div style="display:flex; gap:8px; margin-bottom:15px;">
        <button id="switchToSingleBtn">Add Single Student</button>
        <button id="switchToCsvBtn">Upload CSV</button>
      </div>
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

  // ===== WIRE OPEN BUTTON =====
  const openAddStudentBtn = document.getElementById('openAddStudentBtn');
  if (openAddStudentBtn) openAddStudentBtn.addEventListener('click', showAddStudentForm);

  // ===== LOAD STUDENTS =====
  loadStudents();
});
