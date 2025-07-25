// Import Firebase modules
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, query, where, updateDoc } from "firebase/firestore";

// Firebase configuration
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
const auth = getAuth(app);
const db = getFirestore(app);

// 🔹 Login Function
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        checkUserRole(user.uid);
    } catch (error) {
        document.getElementById('error-message').innerText = error.message;
        console.log('Login button clicked');
    }
}

// 🔹 Check User Role
async function checkUserRole(uid) {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
        const userRole = userDoc.data().role;
        sessionStorage.setItem("role", userRole);
        window.location.href = "dashboard.html";
    }
}

// 🔹 Logout Function
async function logout() {
    await signOut(auth);
    sessionStorage.clear(); // Clear sessionStorage when logging out
    window.location.href = "index.html";
}

// 🔹 Dropdown toggle logic
document.addEventListener('DOMContentLoaded', () => {
    const userIconBtn = document.getElementById('userIconBtn');
    const userDropdown = document.getElementById('userDropdown');

    userIconBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (event) => {
        if (!userIconBtn.contains(event.target) && !userDropdown.contains(event.target)) {
            userDropdown.style.display = 'none';
        }
    });
});


  // Ensure button is clickable and opens the dropdown
  userIconBtn.addEventListener('click', (e) => {
    // Prevent the default behavior (if any)
    e.stopPropagation();
    // Toggle the visibility of the dropdown
    userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
  });

  // Close dropdown if clicking anywhere else on the page
  document.addEventListener('click', (event) => {
    if (!userIconBtn.contains(event.target) && !userDropdown.contains(event.target)) {
      userDropdown.style.display = 'none';
    }
  });
;


// 🔹 Populate Dashboard Based on Role
window.onload = function () {
    onAuthStateChanged(auth, async (user) => {
        
            
            function displayDashboard(userRole, userEmail) {
                document.getElementById('user-role').innerText = `Logged in as: ${userRole}`;
                document.getElementById('userEmail').innerText = `Email: ${userEmail}`;
                
                if (userRole === 'admin') {
                    console.log('Displaying Admin Dashboard');
                    document.getElementById('admin-dashboard').style.display = 'block';
                    loadSubjects();
                } else if (userRole === 'teacher') {
                    console.log('Displaying Teacher Dashboard');
                    document.getElementById('teacher-dashboard').style.display = 'block';
                    loadAssignedSubjects(userEmail);  // Fetch assigned subjects using email
                }
            }
            
            // Populate dropdown
           
            document.getElementById('dropdown-email').innerText = `📧 ${userEmail}`;
            document.getElementById('dropdown-role').innerText = `🔐 ${userRole}`;
            
            // Show relevant dashboard
            if (userRole === 'admin') {
                document.getElementById('admin-dashboard').style.display = 'block';
                loadSubjects();
            } else if (userRole === 'teacher') {
                document.getElementById('teacher-dashboard').style.display = 'block';
                loadAssignedSubjects(user.uid);
            }
        }
        
    );
};

// Wait until DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // This ensures the DOM is ready, but you should still make sure user is logged in
    setTimeout(() => {
        const userIconBtn = document.getElementById('userIconBtn');
        const userDropdown = document.getElementById('userDropdown');

        if (userIconBtn && userDropdown) {
            userIconBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
            });

            document.addEventListener('click', (event) => {
                if (!userIconBtn.contains(event.target) && !userDropdown.contains(event.target)) {
                    userDropdown.style.display = 'none';
                }
            });
        } else {
            console.warn("🔍 Icon or dropdown not found.");
        }
    }, 500); // Delay to wait for Firebase auth
});

// 🔹 Add Subject (Admin)
async function addSubject() {
    const subjectName = document.getElementById('newSubject').value;
    if (subjectName.trim() === "") return;
    try {
        const subjectRef = await addDoc(collection(db, "subjects"), { name: subjectName, assignedTeacher: null, students: [] });
        showAssignTeacherPrompt(subjectRef.id);
    } catch (error) {
        console.error("❌ Error adding subject:", error);
    }
}

// 🔹 Show Assign Teacher Prompt
async function showAssignTeacherPrompt(subjectId) {
    const teacherQuery = query(collection(db, "users"), where("role", "==", "teacher"));
    const teacherSnapshot = await getDocs(teacherQuery);

    if (teacherSnapshot.empty) {
        alert("No teachers available to assign.");
        return;
    }

    const teacherSelect = document.createElement('select');
    teacherSnapshot.forEach(doc => {
        const option = document.createElement('option');
        option.value = doc.id;
        option.innerText = `${doc.data().name}`;
        teacherSelect.appendChild(option);
    });

    const promptDiv = document.createElement('div');
    promptDiv.id = 'assignTeacherPrompt';
    promptDiv.innerHTML = ` 
        <h3>Select a Teacher</h3>
        <div>
            <label for="teacherSelect">Teacher:</label>
            ${teacherSelect.outerHTML}
        </div>
        <button id="assignTeacherBtn">Assign Teacher</button>
    `;
    document.body.appendChild(promptDiv);

    document.getElementById('assignTeacherBtn').addEventListener('click', async () => {
        const selectedTeacherId = teacherSelect.value;
        await assignTeacherToSubject(subjectId, selectedTeacherId);
    });
}

// 🔹 Assign Teacher to Subject
async function assignTeacherToSubject(subjectId, teacherId) {
    try {
        const subjectRef = doc(db, "subjects", subjectId);
        await updateDoc(subjectRef, { assignedTeacher: teacherId });

        const promptDiv = document.getElementById('assignTeacherPrompt');
        promptDiv.remove();

        alert('Teacher assigned successfully!');
        loadSubjects();
    } catch (error) {
        console.error("❌ Error assigning teacher:", error);
    }
}

// 🔹 Load Subjects (Admin)
async function loadSubjects() {
    const snapshot = await getDocs(collection(db, "subjects"));
    const subjectList = document.getElementById('subjectList');
    subjectList.innerHTML = "";
    snapshot.forEach(doc => {
        let li = document.createElement('li');
        li.innerText = doc.data().name;
        subjectList.appendChild(li);
    });
}

// 🔹 Load Assigned Subjects (Teacher)
async function loadAssignedSubjects(uid) {
    const q = query(collection(db, "subjects"), where("assignedTeacher", "==", uid));
    const snapshot = await getDocs(q);
    const assignedSubjects = document.getElementById('assignedSubjects');
    assignedSubjects.innerHTML = "";

    if (snapshot.empty) {
        assignedSubjects.innerHTML = "<p>You have not been assigned any subjects yet.</p>";
        return;
    }

    snapshot.forEach(doc => {
        let li = document.createElement('li');
        li.innerText = doc.data().name;
        assignedSubjects.appendChild(li);
    });
}