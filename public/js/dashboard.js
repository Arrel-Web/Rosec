import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc,
    query, where, setDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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
const auth = getAuth(app);
const db = getFirestore(app);

// User icon toggle
document.getElementById('userIconBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const userDropdown = document.getElementById('userDropdown');
    userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
});
document.addEventListener('click', (event) => {
    const userIconBtn = document.getElementById('userIconBtn');
    const userDropdown = document.getElementById('userDropdown');
    if (!userIconBtn.contains(event.target) && !userDropdown.contains(event.target)) {
        userDropdown.style.display = 'none';
    }
});

// Logout
window.logout = async function () {
    try {
        await signOut(auth);
        sessionStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        console.error('❌ Error during logout:', error.message);
    }
};

// Max Student ID config
async function checkAndSetMaxStudentIDLength() {
    const settingsDoc = await getDoc(doc(db, "settings", "studentIDConfig"));
    if (!settingsDoc.exists()) {
        const maxLength = prompt("Set the maximum number of digits for Student ID:");
        if (!maxLength || isNaN(maxLength) || parseInt(maxLength) <= 0) {
            alert("Invalid input. Please enter a positive number.");
            return;
        }
        await setDoc(doc(db, "settings", "studentIDConfig"), {
            maxStudentIDLength: parseInt(maxLength)
        });
        alert(`Max Student ID length set to ${maxLength} digits.`);
    }
}

// Load subjects for management only
async function loadSubjects() {
    try {
        const snapshot = await getDocs(collection(db, "subjects"));
        console.log(`Subjects loaded (${snapshot.size})`);
    } catch (error) {
        console.error("❌ Error loading subjects:", error);
    }
}

async function loadAssignedSubjects(teacherEmail) {
    try {
        const q = query(collection(db, "subjects"), where("assignedTeacherEmail", "==", teacherEmail));
        const snapshot = await getDocs(q);
        console.log(`Assigned subjects loaded (${snapshot.size})`);
    } catch (error) {
        console.error("❌ Error loading assigned subjects:", error);
    }
}

// Redirect to student dashboard
window.loadStudentsForSubject = async function (subjectId) {
    try {
        window.location.href = `student-dashboard.html?subjectId=${subjectId}`;
    } catch (error) {
        console.error("❌ Error loading students:", error);
    }
};

// Add subject with optional teacher assignment
window.addSubject = async function () {
    const newSubjectInput = document.getElementById('newSubject');
    const newSubject = newSubjectInput ? newSubjectInput.value.trim() : '';
    if (!newSubject) {
        alert('Please enter a subject name.');
        return;
    }

    try {
        const subjectRef = await addDoc(collection(db, 'subjects'), {
            name: newSubject,
            assignedTeacherEmail: ""
        });

        const teacherEmail = prompt("Enter the teacher's email to assign this subject to (leave blank if none):");
        if (teacherEmail) {
            await updateDoc(doc(db, 'subjects', subjectRef.id), {
                assignedTeacherEmail: teacherEmail.trim()
            });
        }

        newSubjectInput.value = '';
        alert('Subject added successfully.');
    } catch (error) {
        console.error('❌ Error adding subject:', error.message);
        alert('Failed to add subject.');
    }
};

// Excel-style student table prompt
window.showExcelTableForStudents = async function () {
    try {
        const subjectSnapshot = await getDocs(collection(db, "subjects"));
        const subjects = [];
        subjectSnapshot.forEach(doc => {
            const data = doc.data();
            subjects.push({ id: doc.id, name: data.name });
        });

        if (subjects.length === 0) {
            alert("No subjects available. Please add a subject first.");
            return;
        }

        const subjectName = prompt(`Select a subject:\n${subjects.map(s => s.name).join("\n")}`);
        const selected = subjects.find(s => s.name.toLowerCase() === subjectName?.trim().toLowerCase());
        if (!selected) {
            alert("Invalid subject name.");
            return;
        }

        const container = document.getElementById('studentEntryTable');
        container.innerHTML = `
            <table border="1" style="border-collapse: collapse; width: 100%">
                <thead>
                    <tr><th>Student ID</th><th>Student Name</th></tr>
                </thead>
                <tbody contenteditable="true" id="editableStudentTable">
                    <tr><td></td><td></td></tr>
                </tbody>
            </table>
            <button onclick="submitExcelTable('${selected.id}')">Submit Students</button>
        `;
    } catch (error) {
        console.error("❌ Error loading subjects:", error);
        alert("Error preparing Excel table.");
    }
};

// Submit students from Excel-style table
window.submitExcelTable = async function (subjectId) {
    const table = document.getElementById('editableStudentTable');
    const settingsDoc = await getDoc(doc(db, "settings", "studentIDConfig"));
    const maxStudentIDLength = settingsDoc.exists() ? settingsDoc.data().maxStudentIDLength : 10;

    const rows = table.querySelectorAll('tr');
    let added = 0;

    for (let row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) continue;

        const studentID = cells[0].innerText.trim();
        const name = cells[1].innerText.trim();

        if (!studentID || !name) continue;
        if (!/^\d+$/.test(studentID) || studentID.length > maxStudentIDLength) {
            alert(`Invalid Student ID "${studentID}" – must be numeric and ≤ ${maxStudentIDLength} digits.`);
            continue;
        }

        try {
            const subjectRef = doc(db, "subjects", subjectId);
            await addDoc(collection(subjectRef, "students"), { name, studentID });
            added++;
        } catch (error) {
            console.error(`❌ Failed to add ${name}:`, error.message);
        }
    }

    alert(`${added} student(s) added successfully.`);
    window.loadStudentsForSubject(subjectId);
};

// Display dashboard based on role
function displayDashboard(userRole, userEmail) {
    document.getElementById('user-role').innerText = `Logged in as: ${userRole}`;
    document.getElementById('user-email').innerText = `Email: ${userEmail}`;

    if (userRole === 'admin') {
        document.getElementById('admin-dashboard').style.display = 'block';
        document.getElementById('teacher-dashboard').style.display = 'none';
        checkAndSetMaxStudentIDLength();
        loadSubjects(); // still loads in background for Excel prompt
    } else if (userRole === 'teacher') {
        document.getElementById('teacher-dashboard').style.display = 'block';
        document.getElementById('admin-dashboard').style.display = 'none';
        loadAssignedSubjects(userEmail); // still loads in background for Excel prompt
    }
}

// Auth handler
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role) {
            displayDashboard(userDoc.data().role, user.email);
        }
    } else {
        window.location.href = "index.html";
    }
});

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addSubjectBtn')?.addEventListener('click', window.addSubject);
    document.getElementById('addStudentsExcelBtn')?.addEventListener('click', window.showExcelTableForStudents);
});
