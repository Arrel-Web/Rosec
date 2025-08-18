import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

// Load students on page load
loadStudents();
  