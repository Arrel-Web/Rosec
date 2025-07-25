// Firebase Initialization (Ensures Firebase is initialized only once)
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, doc, getDocs, collection, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// Initialize Firebase only if not already initialized
let app;
if (!getApps().length) {
    const firebaseConfig = {
        apiKey: "AIzaSyAznHzrOLmLvI98_0P649Tx5TZEwXaNNBs",
        authDomain: "rosec-57d1d.firebaseapp.com",
        projectId: "rosec-57d1d",
        storageBucket: "rosec-57d1d.appspot.com",
        messagingSenderId: "994663054798",
        appId: "1:994663054798:web:6214585d90b6fcc583bf9f",
        measurementId: "G-LM6RHY4WTZ"
    };
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app);

// Fetch subjectId from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const subjectId = urlParams.get('subjectId');

// Back Button Click - Go back to previous page
document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }

    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', () => {
            document.getElementById('student-info-panel').style.display = 'none';

            const adminDashboard = document.getElementById('admin-dashboard');
            if (adminDashboard) {
                adminDashboard.style.display = 'block'; // adjust for teacher if needed
            } else {
                console.warn('Element with id "admin-dashboard" not found.');
            }
        });
    }

    // User Icon Toggle
    const userIconBtn = document.getElementById('userIconBtn');
    if (userIconBtn) {
        userIconBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const userDropdown = document.getElementById('userDropdown');
            if (userDropdown) {
                userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
            }
        });
    }

    // Close dropdown on outside click
    document.addEventListener('click', (event) => {
        const userIconBtn = document.getElementById('userIconBtn');
        const userDropdown = document.getElementById('userDropdown');
        if (userIconBtn && userDropdown) {
            if (!userIconBtn.contains(event.target) && !userDropdown.contains(event.target)) {
                userDropdown.style.display = 'none';
            }
        }
    });
});

// Logout
window.logout = async function() {
    try {
        await signOut(auth);
        sessionStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        console.error('❌ Error during logout:', error.message);
    }
};

async function loadStudentsForSubject() {
    try {
        const studentList = document.getElementById('studentList');
        const studentInfoPanel = document.getElementById('student-info-panel');
        const subjectNameHeading = document.getElementById('subjectNameHeading');

        if (!studentList || !subjectNameHeading) {
            console.error("❌ Required elements not found in HTML.");
            return;
        }

        if (!subjectId) {
            studentInfoPanel.style.display = "none";
            return;
        }

        // Fetch the subject name
        const subjectDoc = await getDoc(doc(db, "subjects", subjectId));
        if (subjectDoc.exists()) {
            const subjectData = subjectDoc.data();
            subjectNameHeading.textContent = subjectData.name || "Unnamed Subject";
        } else {
            subjectNameHeading.textContent = "Subject Not Found";
        }

        // Load student list
        const subjectRef = doc(db, "subjects", subjectId);
        const studentsSnapshot = await getDocs(collection(subjectRef, "students"));
        studentList.innerHTML = "";

        if (studentsSnapshot.empty) {
            studentList.innerHTML = "<tr><td colspan='2'>No students found for this subject.</td></tr>";
            studentInfoPanel.style.display = "block";
            return;
        }

        studentsSnapshot.forEach(doc => {
            const studentData = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `<td>${studentData.studentID}</td><td>${studentData.name}</td>`;
            studentList.appendChild(row);
        });

        studentInfoPanel.style.display = "block";

    } catch (error) {
        console.error("❌ Error loading students:", error);
    }
}

// Auth State Listener with dynamic role and email display
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const role = userData.role || "Unknown";

            document.getElementById('user-role').textContent = `Role: ${role}`;
            document.getElementById('user-email').textContent = `Email: ${user.email}`;

            // Load student list if subjectId present
            if (subjectId) {
                await loadStudentsForSubject();
            }

        } else {
            console.warn("No user data found!");
            document.getElementById('user-role').textContent = "Role: Unknown";
            document.getElementById('user-email').textContent = `Email: ${user.email}`;
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
});
