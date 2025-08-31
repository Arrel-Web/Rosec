// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, getDocs, query, where, doc, getDoc, deleteDoc, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
  getAuth, onAuthStateChanged, signOut 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// Firebase Config
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

console.log('Firebase initialized successfully');

// Global variables
let currentExam = null;
let currentAnswerKey = {};
let examId = null;

// Get examId from URL parameters
const urlParams = new URLSearchParams(window.location.search);
examId = urlParams.get('examId');
console.log('Exam ID:', examId);

// DOM Elements for user dropdown - copied from subjectstudent.js
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userRoleEl = document.getElementById('user-role');
const userIconBtn = document.getElementById('userIconBtn');
const userDropdown = document.getElementById('userDropdown');

// User dropdown toggle - with null checks
if (userIconBtn && userDropdown) {
  userIconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('show');
  });
  document.addEventListener('click', () => userDropdown.classList.remove('show'));
}

// Logout - with null check
const signOutBtn = document.getElementById('signOutBtn');
if (signOutBtn) {
  signOutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
      window.location.href = 'index.html';
    }).catch(error => {
      console.error('Log out error:', error);
      alert('Failed to log out. Please try again.');
    });
  });
}

// Auth state - with null checks
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (userNameEl) userNameEl.textContent = user.displayName || 'User Name:';
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userRoleEl) userRoleEl.textContent = 'Role: Teacher';
  } else {
    if (userNameEl) userNameEl.textContent = 'User Name';
    if (userEmailEl) userEmailEl.textContent = 'user@example.com';
    if (userRoleEl) userRoleEl.textContent = 'Role: N/A';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const examContent = document.getElementById('examContent');

  const pageTitle = document.getElementById('pageTitle');
  const examTitle = document.getElementById('examTitle');
  const examSubject = document.getElementById('examSubject');
  const examClass = document.getElementById('examClass');
  const examDate = document.getElementById('examDate');
  const totalQuestions = document.getElementById('totalQuestions');
  const choiceOptions = document.getElementById('choiceOptions');
  const studentIdLength = document.getElementById('studentIdLength');
  const subjectIdLength = document.getElementById('subjectIdLength');
  const createdBy = document.getElementById('createdBy');

  const noAnswerKey = document.getElementById('noAnswerKey');
  const answerKeyPreview = document.getElementById('answerKeyPreview');
  const answerKeyGrid = document.getElementById('answerKeyGrid');
  const addAnswerKeyBtn = document.getElementById('addAnswerKeyBtn');
  const deleteAnswerKeyBtn = document.getElementById('deleteAnswerKeyBtn');
  const deleteExamBtn = document.getElementById('deleteExamBtn');

  const answerKeyCreator = document.getElementById('answerKeyCreator');
  const answerKeyCreatorGrid = document.getElementById('answerKeyCreatorGrid');
  const saveAnswerKeyBtn = document.getElementById('saveAnswerKeyBtn');
  const clearAnswerKeyBtn = document.getElementById('clearAnswerKeyBtn');
  const cancelAnswerKeyBtn = document.getElementById('cancelAnswerKeyBtn');

  // ------------------- Utility Functions -------------------

  async function getSubjectName(subjectId) {
    if (!subjectId) return 'N/A';
    try {
      const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
      if (subjectDoc.exists()) {
        const subjectData = subjectDoc.data();
        return subjectData.name || subjectData.subjectName || subjectId;
      }
      return subjectId;
    } catch (error) {
      console.error('Error fetching subject:', error);
      return subjectId;
    }
  }

  function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    let date;
    if (timestamp.toDate) date = timestamp.toDate();
    else if (timestamp instanceof Date) date = timestamp;
    else date = new Date(timestamp);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function showError(message) {
    if (loadingState) loadingState.style.display = 'none';
    if (examContent) examContent.style.display = 'none';
    if (errorState) {
      errorState.style.display = 'block';
      const errorMessage = errorState.querySelector('p');
      if (errorMessage) errorMessage.textContent = message;
    }
  }

  function showNoAnswerKey() {
    if (noAnswerKey) noAnswerKey.style.display = 'block';
    if (answerKeyPreview) answerKeyPreview.style.display = 'none';
    if (deleteAnswerKeyBtn) deleteAnswerKeyBtn.style.display = 'none';
  }

  function showAnswerKeyPreview(items) {
    if (noAnswerKey) noAnswerKey.style.display = 'none';
    if (answerKeyPreview) answerKeyPreview.style.display = 'block';
    if (deleteAnswerKeyBtn) deleteAnswerKeyBtn.style.display = 'inline-flex';

    if (answerKeyGrid) {
      answerKeyGrid.innerHTML = '';
      items.forEach(item => {
        const keyItem = document.createElement('div');
        keyItem.className = 'key-item';
        keyItem.innerHTML = `
          <div class="key-question">Q${item.number}</div>
          <div class="key-answer">${item.correctAnswer}</div>
        `;
        answerKeyGrid.appendChild(keyItem);
      });
    }
  }

  async function displayExam(exam) {
    try {
      if (loadingState) loadingState.style.display = 'none';
      if (examContent) examContent.style.display = 'block';

      const title = exam.examTitle || exam.name || exam.title || 'Untitled Exam';
      if (pageTitle) pageTitle.textContent = title;
      if (examTitle) examTitle.textContent = title;

      const subjectName = await getSubjectName(exam.subjectId);
      if (examSubject) examSubject.textContent = subjectName;
      if (examClass) examClass.textContent = exam.classId || exam.class || 'N/A';
      if (examDate) examDate.textContent = formatDate(exam.createdAt || exam.dateCreated);

      if (totalQuestions) totalQuestions.textContent = exam.totalQuestions || (exam.items ? exam.items.length : 0);
      if (choiceOptions) choiceOptions.textContent = exam.choiceOptions || exam.choices || 4;
      if (studentIdLength) studentIdLength.textContent = exam.studentIdLength || 8;
      if (subjectIdLength) subjectIdLength.textContent = exam.subjectIdLength || 0;
      if (createdBy) createdBy.textContent = exam.createdBy || exam.creator || 'N/A';

      if (exam.items && exam.items.length > 0) showAnswerKeyPreview(exam.items);
      else showNoAnswerKey();

      console.log('Exam displayed successfully');
    } catch (error) {
      console.error('Error displaying exam:', error);
      showError('Error displaying exam data');
    }
  }

  // ------------------- Firebase Actions -------------------

  async function loadExam() {
    if (!examId) return showError('No exam ID provided');

    try {
      if (loadingState) loadingState.style.display = 'block';
      if (errorState) errorState.style.display = 'none';
      if (examContent) examContent.style.display = 'none';

      const examsRef = collection(db, 'exams');
      const q = query(examsRef, where('examId', '==', examId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const examDoc = querySnapshot.docs[0];
        currentExam = { id: examDoc.id, ...examDoc.data() };
        currentExam.items = Array.isArray(currentExam.items) ? currentExam.items : [];
        await displayExam(currentExam);
      } else showError('Exam not found in Firestore');
    } catch (error) {
      console.error('Error loading exam:', error);
      showError('Failed to load exam. Please check your connection and try again.');
    }
  }

  async function deleteExam() {
    if (!examId || !currentExam) return alert('No exam to delete');
    if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'exams', examId));
      alert('Exam deleted successfully');
      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert('Failed to delete exam. Please try again.');
    }
  }

  async function deleteAnswerKey() {
    if (!examId || !currentExam) return alert('No exam found');
    if (!confirm('Are you sure you want to delete the answer key?')) return;

    try {
      const examRef = doc(db, 'exams', examId);
      await updateDoc(examRef, { items: [] });
      currentExam.items = [];
      showNoAnswerKey();
      alert('Answer key deleted successfully');
    } catch (error) {
      console.error('Error deleting answer key:', error);
      alert('Failed to delete answer key. Please try again.');
    }
  }

  // ------------------- Answer Key Creator -------------------

  function showAnswerKeyCreator() {
    if (!currentExam) return;
    const totalQs = currentExam.totalQuestions || 30;
    const choices = currentExam.choiceOptions || currentExam.choices || 4;

    const choiceLetters = Array.from({ length: choices }, (_, i) => String.fromCharCode(65 + i));
    if (!answerKeyCreatorGrid) return;
    answerKeyCreatorGrid.innerHTML = '';
    currentAnswerKey = {};

    if (currentExam.items && currentExam.items.length > 0) {
      currentExam.items.forEach(item => currentAnswerKey[item.number] = item.correctAnswer);
    }

    for (let i = 1; i <= totalQs; i++) {
      const creatorItem = document.createElement('div');
      creatorItem.className = 'creator-item';

      const questionNumber = document.createElement('div');
      questionNumber.className = 'creator-question';
      questionNumber.textContent = `Q${i}`;

      const choicesContainer = document.createElement('div');
      choicesContainer.className = 'creator-choices';

      choiceLetters.forEach(choice => {
        const bubble = document.createElement('div');
        bubble.className = 'creator-bubble';
        bubble.textContent = choice;
        bubble.setAttribute('data-question', i);
        bubble.setAttribute('data-choice', choice);
        bubble.title = `Question ${i} - Choice ${choice}`;
        if (currentAnswerKey[i] === choice) bubble.classList.add('selected');

        bubble.addEventListener('click', (e) => {
          const allBubblesForQuestion = document.querySelectorAll(`[data-question="${i}"].creator-bubble`);
          if (bubble.classList.contains('selected')) {
            bubble.classList.remove('selected');
            delete currentAnswerKey[i];
          } else {
            allBubblesForQuestion.forEach(b => b.classList.remove('selected'));
            bubble.classList.add('selected');
            currentAnswerKey[i] = choice;
          }
        });

        choicesContainer.appendChild(bubble);
      });

      creatorItem.appendChild(questionNumber);
      creatorItem.appendChild(choicesContainer);
      answerKeyCreatorGrid.appendChild(creatorItem);
    }

    if (answerKeyCreator) answerKeyCreator.style.display = 'block';
  }

  async function saveAnswerKey() {
    if (!examId || !currentExam) return alert('No exam found');
    if (Object.keys(currentAnswerKey).length === 0) return alert('Please set at least one answer before saving.');

    try {
      const items = Object.keys(currentAnswerKey).map(qNum => ({
        number: parseInt(qNum),
        correctAnswer: currentAnswerKey[qNum]
      })).sort((a, b) => a.number - b.number);

      const examRef = doc(db, 'exams', examId);
      await updateDoc(examRef, { items });
      currentExam.items = items;

      if (answerKeyCreator) answerKeyCreator.style.display = 'none';
      showAnswerKeyPreview(items);
      alert('Answer key saved successfully!');
    } catch (error) {
      console.error('Error saving answer key:', error);
      alert('Failed to save answer key. Please try again.');
    }
  }

  function clearAnswerKey() {
    if (confirm('Are you sure you want to clear all answers?')) {
      currentAnswerKey = {};
      document.querySelectorAll('.creator-bubble.selected').forEach(b => b.classList.remove('selected'));
    }
  }

  function cancelAnswerKeyCreation() {
    if (answerKeyCreator) answerKeyCreator.style.display = 'none';
    currentAnswerKey = {};
  }

  // ------------------- Event Listeners -------------------

  if (deleteExamBtn) deleteExamBtn.addEventListener('click', deleteExam);
  if (deleteAnswerKeyBtn) deleteAnswerKeyBtn.addEventListener('click', deleteAnswerKey);
  if (addAnswerKeyBtn) addAnswerKeyBtn.addEventListener('click', showAnswerKeyCreator);
  if (saveAnswerKeyBtn) saveAnswerKeyBtn.addEventListener('click', saveAnswerKey);
  if (clearAnswerKeyBtn) clearAnswerKeyBtn.addEventListener('click', clearAnswerKey);
  if (cancelAnswerKeyBtn) cancelAnswerKeyBtn.addEventListener('click', cancelAnswerKeyCreation);

  if (answerKeyCreator) answerKeyCreator.addEventListener('click', (e) => {
    if (e.target === answerKeyCreator) cancelAnswerKeyCreation();
  });



  // ------------------- Initialize -------------------

  function initialize() {
    loadExam();
  }

  if (!examId) showError('No exam ID provided in URL');
  else initialize();
});
