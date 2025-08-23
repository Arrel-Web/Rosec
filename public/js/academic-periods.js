// js/academic-periods.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } 
  from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Form Elements ---
const userNameEl = document.getElementById("user-name");
const userEmailEl = document.getElementById("user-email");
const userRoleEl = document.getElementById("user-role");
const signOutBtn = document.getElementById("signOutBtn");

const academicYearIdInput = document.getElementById('academicYearId');
const schoolYearIdInput = document.getElementById('schoolYearId');
const schoolYearStartInput = document.getElementById('schoolYearStart');
const schoolYearEndInput = document.getElementById('schoolYearEnd');
const createBtn = document.getElementById('createAcademicYearBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const semestersContainer = document.getElementById('semestersContainer');
const addSemesterBtn = document.getElementById('addSemesterBtn');

const academicYearsGrid = document.getElementById('academicYearsGrid');
let editModeId = null;

// --- Clear Form ---
function clearForm() {
  academicYearIdInput.value = '';
  schoolYearIdInput.value = '';
  schoolYearStartInput.value = '';
  schoolYearEndInput.value = '';
  semestersContainer.innerHTML = '';
  academicYearIdInput.disabled = false;
  createBtn.textContent = 'Create Academic Year';
  editModeId = null;
  cancelEditBtn.style.display = 'none';
}

// --- Enter Edit Mode ---
function enterEditMode() {
  createBtn.textContent = 'Update Academic Year';
  cancelEditBtn.style.display = 'inline-block';
}

// --- Cancel Edit ---
cancelEditBtn.addEventListener('click', clearForm);

// --- Dynamic Semester / Term Handlers ---
function createTermBlock() {
  const termDiv = document.createElement('div');
  termDiv.className = 'term-block';
  termDiv.innerHTML = `
    <label>Term ID: <input type="text" class="term-id" placeholder="e.g., term1"></label>
    <label>Term Name: <input type="text" class="term-name" placeholder="Prelim"></label>
    <button type="button" class="remove-btn">Remove Term</button>
  `;
  termDiv.querySelector('.remove-btn').addEventListener('click', () => termDiv.remove());
  return termDiv;
}

function createSemesterBlock() {
  const semesterDiv = document.createElement('div');
  semesterDiv.className = 'semester-block';

  semesterDiv.innerHTML = `
    <div class="semester-header">
      <h5>Semester</h5>
      <button type="button" class="remove-btn">Remove Semester</button>
    </div>
    <label>Semester ID: <input type="text" class="semester-id" placeholder="e.g., sem1"></label>
    <label>Label: <input type="text" class="semester-label" placeholder="1st Semester"></label>
    <label>Start Date: <input type="date" class="semester-start"></label>
    <label>End Date: <input type="date" class="semester-end"></label>
    <div class="terms-container"></div>
    <button type="button" class="add-btn add-term-btn">+ Add Term</button>
  `;

  semesterDiv.querySelector('.remove-btn').addEventListener('click', () => semesterDiv.remove());

  const addTermBtn = semesterDiv.querySelector('.add-term-btn');
  const termsContainer = semesterDiv.querySelector('.terms-container');

  addTermBtn.addEventListener('click', () => {
    const termBlock = createTermBlock();
    termsContainer.appendChild(termBlock);
  });

  return semesterDiv;
}

// Add initial semester
addSemesterBtn.addEventListener('click', () => {
  const semesterBlock = createSemesterBlock();
  semestersContainer.appendChild(semesterBlock);
});

// --- Create / Update Academic Year ---
createBtn.addEventListener('click', async () => {
  const academicYearId = editModeId || academicYearIdInput.value.trim();
  const schoolYearId = schoolYearIdInput.value.trim();
  const schoolYearStart = schoolYearStartInput.value ? Timestamp.fromDate(new Date(schoolYearStartInput.value)) : null;
  const schoolYearEnd = schoolYearEndInput.value ? Timestamp.fromDate(new Date(schoolYearEndInput.value)) : null;

  if (!academicYearId || !schoolYearId) {
    alert('Please fill Academic Year ID and School Year ID.');
    return;
  }

  // Collect semesters & terms
  const semesterBlocks = semestersContainer.querySelectorAll('.semester-block');
  const semesters = [];

  for (const semDiv of semesterBlocks) {
    const semId = semDiv.querySelector('.semester-id').value.trim();
    const semLabel = semDiv.querySelector('.semester-label').value.trim();
    const semStart = semDiv.querySelector('.semester-start').value ? Timestamp.fromDate(new Date(semDiv.querySelector('.semester-start').value)) : null;
    const semEnd = semDiv.querySelector('.semester-end').value ? Timestamp.fromDate(new Date(semDiv.querySelector('.semester-end').value)) : null;

    if (!semId || !semLabel) {
      alert('Please fill Semester ID and Label.');
      return;
    }

    const termDivs = semDiv.querySelectorAll('.term-block');
    const terms = [];
    for (const termDiv of termDivs) {
      const termId = termDiv.querySelector('.term-id').value.trim();
      const termName = termDiv.querySelector('.term-name').value.trim();
      if (!termId || !termName) {
        alert('Please fill all Term IDs and Names.');
        return;
      }
      terms.push({ termId, termName });
    }

    semesters.push({ semId, semLabel, semStart, semEnd, terms });
  }

  try {
    // Save school year
    await setDoc(doc(db, 'schoolyear', schoolYearId), {
      startDate: schoolYearStart,
      endDate: schoolYearEnd,
      isActive: true,
      createdAt: Timestamp.fromDate(new Date())
    });

    // Save semesters & terms separately
    for (const sem of semesters) {
      await setDoc(doc(db, 'semester', sem.semId), {
        name: sem.semLabel,
        startDate: sem.semStart,
        endDate: sem.semEnd,
        createdAt: Timestamp.fromDate(new Date())
      });
      for (const term of sem.terms) {
        await setDoc(doc(db, 'term', term.termId), {
          name: term.termName,
          createdAt: Timestamp.fromDate(new Date())
        });
      }
    }

    // Save academic year with nested semesters
    await setDoc(doc(db, 'academicyear', academicYearId), {
      academicYearId,
      schoolYearId,
      semesters,
      createdAt: Timestamp.fromDate(new Date())
    });

    alert(editModeId ? 'Academic Year updated!' : 'Academic Year created!');
    clearForm();
    loadAcademicYears();

  } catch (error) {
    console.error(error);
    alert('Error saving academic year. Check console.');
  }
});

// --- Load Academic Years (show only names) ---
async function loadAcademicYears() {
  academicYearsGrid.innerHTML = '<p class="muted">Loading...</p>';
  try {
    const snapshot = await getDocs(collection(db, 'academicyear'));
    academicYearsGrid.innerHTML = '';

    if (snapshot.empty) {
      academicYearsGrid.innerHTML = '<p class="muted">No academic years yet.</p>';
      return;
    }

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const card = document.createElement('div');
      card.className = 'academic-year-card';

      // Correct field names
      const academicYearDisplay = data.academicYearId || 'N/A';
      const schoolYearDisplay = data.schoolYearId || 'N/A';

      // Semesters & Terms
      let semestersHtml = '';
      if (data.semesters && data.semesters.length) {
        data.semesters.forEach(sem => {
          let termsHtml = '';
          if (sem.terms && sem.terms.length) {
            sem.terms.forEach(term => {
              termsHtml += `<div><span class="label">Term:</span> <span class="value">${term.termName || 'N/A'}</span></div>`;
            });
          }
          semestersHtml += `
            <div><span class="label">Semester:</span> <span class="value">${sem.semLabel || 'N/A'}</span></div>
            ${termsHtml}
          `;
        });
      }

      // Build card
      card.innerHTML = `
        <h5>Academic Year: ${academicYearDisplay}</h5>
        <div><span class="label">School Year:</span> <span class="value">${schoolYearDisplay}</span></div>
        ${semestersHtml || '<div class="muted">No semesters yet</div>'}
      `;

      // Edit on click
      card.addEventListener('click', () => {
        editModeId = docSnap.id; 
        academicYearIdInput.value = data.academicYearId || '';
        academicYearIdInput.disabled = false;

        schoolYearIdInput.value = data.schoolYearId || '';

        // Load semesters & terms into form
        semestersContainer.innerHTML = '';
        if (data.semesters && data.semesters.length) {
          for (const sem of data.semesters) {
            const semBlock = createSemesterBlock();
            semBlock.querySelector('.semester-id').value = sem.semId || '';
            semBlock.querySelector('.semester-label').value = sem.semLabel || '';
            semBlock.querySelector('.semester-start').value = sem.semStart
              ? new Date(sem.semStart.toDate ? sem.semStart.toDate() : sem.semStart).toISOString().split('T')[0]
              : '';
            semBlock.querySelector('.semester-end').value = sem.semEnd
              ? new Date(sem.semEnd.toDate ? sem.semEnd.toDate() : sem.semEnd).toISOString().split('T')[0]
              : '';

            const termsContainer = semBlock.querySelector('.terms-container');
            if (sem.terms && sem.terms.length) {
              for (const term of sem.terms) {
                const termBlock = createTermBlock();
                termBlock.querySelector('.term-id').value = term.termId || '';
                termBlock.querySelector('.term-name').value = term.termName || '';
                termsContainer.appendChild(termBlock);
              }
            }
            semestersContainer.appendChild(semBlock);
          }
        }

        enterEditMode();
      });

      academicYearsGrid.appendChild(card);
    }
  } catch (error) {
    console.error(error);
    academicYearsGrid.innerHTML = '<p class="muted">Failed to load academic years.</p>';
  }
}

// --- Initial Load ---
loadAcademicYears();

// Track user
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userNameEl.textContent = user.displayName || "No Name";
    userEmailEl.textContent = user.email || "";

    // 🔎 Get role from Firestore (assuming you save roles in "users" collection)
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        userRoleEl.textContent = `Role: ${data.role || "N/A"}`;
      } else {
        userRoleEl.textContent = "Role: Not assigned";
      }
    } catch (err) {
      console.error("Error fetching role:", err);
      userRoleEl.textContent = "Role: Error";
    }
  } else {
    // Not logged in
    userNameEl.textContent = "Guest";
    userEmailEl.textContent = "";
    userRoleEl.textContent = "Role: None";
  }
});

// Handle logout
if (signOutBtn) {
  signOutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html"; // redirect to login
    } catch (err) {
      console.error("Error signing out:", err);
    }
  });
}
//user icon
if (userIconBtn && userDropdown) {
  userIconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('show');
  });
  document.addEventListener('click', () => userDropdown.classList.remove('show'));
}