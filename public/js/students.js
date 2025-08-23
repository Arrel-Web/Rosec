import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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
const openAddStudentBtn = document.getElementById('openAddStudentBtn');
const modalOverlay = document.getElementById('modalOverlay');
const closeModalBtn = document.getElementById('closeModal');
const modalContent = document.getElementById('modalContent');

async function loadStudents() {
  studentsTableBody.innerHTML = ''; // clear old rows

  try {
    const studentsSnapshot = await getDocs(collection(db, 'students'));

    if (studentsSnapshot.empty) {
      studentsTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#666;">No students found.</td></tr>`;
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
      studentsTableBody.appendChild(row);
    });

  } catch (error) {
    console.error('Error loading students:', error);
    studentsTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:red;">Failed to load students.</td></tr>`;
  }
}

function openModal(html) {
  if (!modalOverlay || !modalContent) return;
  modalContent.innerHTML = html;
  modalOverlay.classList.remove('hidden');
}

function closeModal() {
  if (!modalOverlay || !modalContent) return;
  modalOverlay.classList.add('hidden');
  modalContent.innerHTML = '';
}

function renderAddStudentModal() {
  const content = `
    <h2 style="margin-bottom: 10px;">Add Student</h2>
    <div class="muted" style="margin-bottom: 12px;">Add a single student or upload a CSV.</div>

    <form id="addStudentForm" style="margin-bottom: 16px;">
      <div class="form-row">
        <label for="studentIdInput">Student ID</label>
        <input id="studentIdInput" class="input" type="text" placeholder="e.g. 2024-0001" required />
      </div>
      <div class="form-row">
        <label for="studentNameInput">Full Name</label>
        <input id="studentNameInput" class="input" type="text" placeholder="e.g. Jane D. Doe" required />
      </div>
      <button type="submit" style="background:#2d3e50; color:white; padding:8px 12px; border:none; border-radius:6px; cursor:pointer;">Add Student</button>
    </form>

    <div style="border-top:1px solid #eee; padding-top:12px; margin-top:8px;"></div>

    <div>
      <h3 style="margin: 8px 0;">Bulk upload via CSV</h3>
      <input id="csvFileInput" type="file" accept=".csv" />
      <p class="muted" style="margin-top:6px;">Expected columns: <code>studentId</code>, <code>name</code></p>
      <div id="csvStatus" class="muted" style="margin-top:6px;"></div>
    </div>
  `;

  openModal(content);

  const addStudentForm = document.getElementById('addStudentForm');
  const csvFileInput = document.getElementById('csvFileInput');
  const csvStatus = document.getElementById('csvStatus');

  if (addStudentForm) {
    addStudentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const studentId = (document.getElementById('studentIdInput').value || '').trim();
      const name = (document.getElementById('studentNameInput').value || '').trim();
      if (!studentId || !name) return;
      try {
        await setDoc(doc(db, 'students', studentId), { studentId, name });
        await loadStudents();
        closeModal();
      } catch (err) {
        console.error('Failed to add student:', err);
        alert('Failed to add student. Please try again.');
      }
    });
  }

  if (csvFileInput) {
    csvFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (typeof Papa === 'undefined') {
        alert('CSV parser not loaded.');
        return;
      }
      csvStatus.textContent = 'Parsing CSV...';
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = results.data || [];
          let successCount = 0;
          let failCount = 0;
          for (const row of rows) {
            const sid = (row.studentId || '').toString().trim();
            const nm = (row.name || '').toString().trim();
            if (!sid || !nm) { failCount++; continue; }
            try {
              await setDoc(doc(db, 'students', sid), { studentId: sid, name: nm });
              successCount++;
            } catch (e) {
              console.error('Row failed:', row, e);
              failCount++;
            }
          }
          csvStatus.textContent = `Uploaded ${successCount} students. ${failCount} failed.`;
          await loadStudents();
        },
        error: (err) => {
          console.error('CSV parse error:', err);
          csvStatus.textContent = 'Failed to parse CSV.';
        }
      });
    });
  }
}

if (openAddStudentBtn) {
  openAddStudentBtn.addEventListener('click', renderAddStudentModal);
}
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', closeModal);
}
if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

// Load students on page load
loadStudents();
  