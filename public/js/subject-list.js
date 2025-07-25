import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    getFirestore, doc, getDoc, getDocs, query, where, collection, updateDoc, addDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAznHzrOLmLvI98_0P649Tx5TZEwXaNNBs",
    authDomain: "rosec-57d1d.firebaseapp.com",
    projectId: "rosec-57d1d",
    storageBucket: "rosec-57d1d.appspot.com",
    messagingSenderId: "994663054798",
    appId: "1:994663054798:web:6214585d90b6fcc583bf9f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentSubjectId = null;

// Logout function
window.logout = async function () {
    try {
        await signOut(auth);
        sessionStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        console.error("Logout Error:", error.message);
    }
};

// Navigate to student dashboard
window.loadStudentsForSubject = async function (subjectId) {
    window.location.href = `student-dashboard.html?subjectId=${subjectId}`;
};

// Handle edit teacher icon
window.handleEditTeacher = async function (e) {
    currentSubjectId = e.target.dataset.subjectId;
    const dropdown = document.getElementById('teacherDropdown');
    dropdown.innerHTML = '';
    const snap = await getDocs(collection(db, 'teachers'));
    snap.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.data().email;
        option.textContent = doc.data().email; // Show email directly
        dropdown.appendChild(option);
    });
    document.getElementById('editTeacherModal').classList.remove('hidden');
};

// Save teacher change
window.saveTeacherChange = async function () {
    const selectedEmail = document.getElementById('teacherDropdown').value;
    if (currentSubjectId) {
        await updateDoc(doc(db, 'subjects', currentSubjectId), {
            assignedTeacherEmail: selectedEmail
        });
        document.getElementById('editTeacherModal').classList.add('hidden');
        location.reload();
    }
};

// Add new teacher
window.handleAddTeacher = function () {
    document.getElementById('addTeacherModal').classList.remove('hidden');
};

window.addNewTeacher = async function () {
    const name = document.getElementById('newTeacherName').value;
    const email = document.getElementById('newTeacherEmail').value;
    if (name && email) {
        await addDoc(collection(db, 'teachers'), { name, email });
        document.getElementById('addTeacherModal').classList.add('hidden');
        location.reload();
    }
};

// Remove assigned teacher
window.handleRemoveTeacher = async function (e) {
    const subjectId = e.target.dataset.subjectId;
    if (confirm('Remove assigned teacher?')) {
        await updateDoc(doc(db, 'subjects', subjectId), {
            assignedTeacherEmail: ''
        });
        location.reload();
    }
};

// Utility modal closers
window.closeEditModal = () => document.getElementById('editTeacherModal').classList.add('hidden');
window.closeAddModal = () => document.getElementById('addTeacherModal').classList.add('hidden');

// Load subject list
async function loadSubjectList(role, userEmail) {
    const tableBody = document.getElementById('subjectTableBody');
    const teacherHeader = document.getElementById('teacherHeader');

    try {
        const colRef = collection(db, 'subjects');

        let q = colRef;
        if (role === 'teacher') {
            q = query(colRef, where('assignedTeacherEmail', '==', userEmail));
            if (teacherHeader) teacherHeader.style.display = 'none';
        }

        const snapshot = await getDocs(q);
        snapshot.forEach(docSnap => {
            const subjectData = docSnap.data();
            const subjectId = docSnap.id;

            const row = document.createElement('tr');

            // Subject Cell
            const subjectCell = document.createElement('td');
            subjectCell.textContent = subjectData.name;
            subjectCell.classList.add('clickable-cell');
            subjectCell.onclick = () => loadStudentsForSubject(subjectId);
            row.appendChild(subjectCell);

            // Teacher Cell
            const teacherEmail = subjectData.assignedTeacherEmail || 'Unassigned';

            if (role === 'admin') {
                const teacherCell = document.createElement('td');
                teacherCell.innerHTML = `
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span>${teacherEmail}</span>
                    <span class="icon edit-icon" title="Edit Teacher" onclick="handleEditTeacher(event)" data-subject-id="${subjectId}">🖉</span>
                    <span class="icon add-icon" title="Add Teacher" onclick="handleAddTeacher(event)" data-subject-id="${subjectId}">➕</span>
                    <span class="icon delete-icon" title="Remove Teacher" onclick="handleRemoveTeacher(event)" data-subject-id="${subjectId}">🗑️</span>
                  </div>
                `;
                row.appendChild(teacherCell);
            } else {
                const teacherCell = document.createElement('td');
                teacherCell.textContent = teacherEmail;
                row.appendChild(teacherCell);
            }

            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Failed to load subjects:", error);
    }
}

// Handle auth state and load subjects
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const role = userDoc.data().role;
            document.getElementById("user-role").innerText = `Logged in as: ${role}`;
            document.getElementById("user-email").innerText = `Email: ${user.email}`;
            loadSubjectList(role, user.email);
        }
    } else {
        window.location.href = "index.html";
    }
});

// Dropdown toggle for user icon
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('userIconBtn');
    const dropdown = document.getElementById('userDropdown');

    if (btn && dropdown) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });

        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
    }
});
