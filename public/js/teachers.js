import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

async function loadTeachers() {
  try {
    const teachersCol = collection(db, 'teachers');
    const teachersSnapshot = await getDocs(teachersCol);

    if (teachersSnapshot.empty) {
      teachersTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#666;">No teachers found.</td></tr>`;
      return;
    }

    teachersTableBody.innerHTML = '';
    teachersSnapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${data.name || '-'}</td>
        <td>${data.email || '-'}</td>
      `;
      teachersTableBody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error loading teachers:', error);
    teachersTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:red;">Failed to load teachers.</td></tr>`;
  }
}

// Load teachers on page load
loadTeachers();
