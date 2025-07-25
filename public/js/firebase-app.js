// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Firebase configuration
export const firebaseConfig = {
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

// Define the login function
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    console.log('Login function called');

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('User logged in successfully:', user);
        checkUserRole(user.uid);
    } catch (error) {
        document.getElementById('error-message').innerText = error.message;
        console.log('Error logging in:', error.message);
    }
}

// Define the logout function
async function logout() {
    console.log('Logout function called');
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.log('Error during logout:', error.message);
    }
}

// Check user role function
async function checkUserRole(uid) {
    console.log('Checking user role for UID:', uid);
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
        const userRole = userDoc.data().role;
        console.log('User role:', userRole);
        sessionStorage.setItem("role", userRole);
        window.location.href = "dashboard.html";
    } else {
        console.log('No such document!');
    }
}

// Expose functions to the global scope
// Expose functions to the global scope
window.logout = logout; // Makes logout accessible in the global scope
window.login = login;   // Exposing login if needed


console.log('firebase-app.js loaded successfully');
