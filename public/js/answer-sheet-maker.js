import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, getDocs, addDoc, query, where, doc, setDoc
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM Elements
const examTitleInput = document.getElementById('examTitle');
const subjectSelect = document.getElementById('subjectSelect');
const classSelect = document.getElementById('classSelect');
const studentIdLengthInput = document.getElementById('studentIdLength');
const subjectIdLengthInput = document.getElementById('subjectIdLength');
const totalQuestionsInput = document.getElementById('totalQuestions');
const choiceOptionsSelect = document.getElementById('choiceOptions');
const questionsPerColumnInput = document.getElementById('questionsPerColumn');
const pointsConfig = document.getElementById('pointsConfig');
const sheetPreview = document.getElementById('sheetPreview');
const answerKeySection = document.getElementById('answerKeySection');
const answerKeyGrid = document.getElementById('answerKeyGrid');

const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userRoleEl = document.getElementById('user-role');
const userIconBtn = document.getElementById('userIconBtn');
const userDropdown = document.getElementById('userDropdown');

// Current answer key data
let currentAnswerKey = {};
let currentQuestionSetId = null;

// Toggle user dropdown
userIconBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  userDropdown.classList.toggle('show');
});
document.addEventListener('click', () => {
  userDropdown.classList.remove('show');
});

// Auth listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userNameEl.textContent = user.displayName || 'User';
    userEmailEl.textContent = user.email;
    const role = await getUserRole(user.email);
    userRoleEl.textContent = `Role: ${role || 'N/A'}`;
    
    loadSubjects();
    loadClasses();
  } else {
    window.location.href = 'index.html';
  }
});

// Get user role
async function getUserRole(email) {
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    return querySnapshot.docs[0].data().role || null;
  } catch (err) {
    console.error('Error getting user role:', err);
    return null;
  }
}

// Load subjects
async function loadSubjects() {
  try {
    const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    
    subjectsSnapshot.forEach(doc => {
      const subject = doc.data();
      const option = document.createElement('option');
      option.value = subject.subjectId;
      option.textContent = `${subject.name} (${subject.code})`;
      subjectSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading subjects:', error);
    // Load demo data if Firebase fails
    loadDemoSubjects();
  }
}

// Load classes
async function loadClasses() {
  try {
    const classesSnapshot = await getDocs(collection(db, 'classes'));
    classSelect.innerHTML = '<option value="">Select Class</option>';
    
    classesSnapshot.forEach(doc => {
      const classData = doc.data();
      const option = document.createElement('option');
      option.value = classData.classId;
      option.textContent = classData.classId;
      classSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading classes:', error);
    // Load demo data if Firebase fails
    loadDemoClasses();
  }
}

// Demo data loaders
function loadDemoSubjects() {
  subjectSelect.innerHTML = `
    <option value="">Select Subject</option>
    <option value="math101">Mathematics 101</option>
    <option value="eng101">English 101</option>
    <option value="sci101">Science 101</option>
  `;
}

function loadDemoClasses() {
  classSelect.innerHTML = `
    <option value="">Select Class</option>
    <option value="class1">BSIT-3A</option>
    <option value="class2">BSCS-2B</option>
    <option value="class3">BSCPE-4C</option>
  `;
}

// Points configuration management
document.getElementById('addPointsRow').addEventListener('click', addPointsRow);

function addPointsRow() {
  const pointsRow = document.createElement('div');
  pointsRow.className = 'points-row';
  pointsRow.innerHTML = `
    <label>Questions</label>
    <input type="number" class="input range-start" placeholder="From" min="1" style="width: 60px;">
    <span>to</span>
    <input type="number" class="input range-end" placeholder="To" min="1" style="width: 60px;">
    <span>=</span>
    <input type="number" class="input points-value" placeholder="Points" min="0.5" step="0.5" value="1" style="width: 60px;">
    <span>points</span>
    <button type="button" class="btn btn-secondary remove-points-row">×</button>
  `;
  
  pointsRow.querySelector('.remove-points-row').addEventListener('click', () => {
    pointsRow.remove();
  });
  
  pointsConfig.appendChild(pointsRow);
}

// Remove points row
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('remove-points-row')) {
    const pointsRows = pointsConfig.querySelectorAll('.points-row');
    if (pointsRows.length > 1) {
      e.target.closest('.points-row').remove();
    } else {
      alert('At least one points range is required.');
    }
  }
});

// Generate answer sheet
document.getElementById('generateSheet').addEventListener('click', generateAnswerSheet);

function generateAnswerSheet() {
  const examTitle = examTitleInput.value || 'Examination';
  const totalQuestions = parseInt(totalQuestionsInput.value) || 30;
  const choiceCount = parseInt(choiceOptionsSelect.value) || 4;
  const questionsPerColumn = parseInt(questionsPerColumnInput.value) || 15;
  const selectedSubject = subjectSelect.options[subjectSelect.selectedIndex]?.text || '';
  const selectedClass = classSelect.value || '';
  const studentIdLength = parseInt(studentIdLengthInput.value) || 8;
  const subjectIdLength = parseInt(subjectIdLengthInput.value) || 0;
  
  // Validate student ID length (mandatory)
  if (studentIdLength < 1 || studentIdLength > 15) {
    alert('Student ID length must be between 1 and 15 digits.');
    return;
  }
  
  // Get points configuration
  const pointsRanges = getPointsConfiguration();
  
  // Generate choice letters
  const choices = [];
  for (let i = 0; i < choiceCount; i++) {
    choices.push(String.fromCharCode(65 + i)); // A, B, C, D, E
  }
  
  // Generate scanner start/end markers
  const scannerStartMarker = '<div class="scanner-marker"></div>'.repeat(5);
  const scannerEndMarker = '<div class="scanner-marker"></div>'.repeat(5);
  
  // Generate answer sheet HTML
  let sheetHTML = `
    <div class="sheet-header">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        ${scannerStartMarker}
        <div style="text-align: center; flex: 1;">
          <h2 style="margin: 0; font-size: 18px;">${examTitle}</h2>
          <p style="margin: 5px 0; font-size: 14px;">${selectedSubject}</p>
          ${selectedClass ? `<p style="margin: 5px 0; font-size: 12px;">Class: ${selectedClass}</p>` : ''}
        </div>
        ${scannerStartMarker}
      </div>
    </div>
    
    <div class="student-info">
      <div>
        <strong>Name:</strong> ________________________________<br><br>
        <strong>Date:</strong> ________________________________
      </div>
      <div>
        <strong>Section:</strong> ________________________________<br><br>
        <strong>Signature:</strong> ________________________________
      </div>
    </div>
  `;
  
  // Add ID sections
  sheetHTML += generateIdSections(studentIdLength, subjectIdLength);
  
  // Generate questions section
  sheetHTML += `<div class="questions-grid">`;
  
  // Generate questions in columns
  const columns = Math.ceil(totalQuestions / questionsPerColumn);
  for (let col = 0; col < columns; col++) {
    sheetHTML += '<div class="question-column">';
    
    const startQuestion = col * questionsPerColumn + 1;
    const endQuestion = Math.min(startQuestion + questionsPerColumn - 1, totalQuestions);
    
    for (let q = startQuestion; q <= endQuestion; q++) {
      const points = getPointsForQuestion(q, pointsRanges);
      
      sheetHTML += `
        <div class="question-row">
          <span class="question-number">${q}.</span>
          ${choices.map(choice => `
            <span class="choice-bubble" data-question="${q}" data-choice="${choice}"></span>
            <span>${choice}</span>
          `).join('')}
          <span class="points-display">(${points} pt${points !== 1 ? 's' : ''})</span>
        </div>
      `;
    }
    
    sheetHTML += '</div>';
  }
  
  sheetHTML += `
    </div>
    <div style="margin-top: 30px; text-align: center; display: flex; justify-content: space-between; align-items: center;">
      ${scannerEndMarker}
      <div style="flex: 1; text-align: center;">
        <strong>END OF ANSWER SHEET</strong><br>
        <small>Total Questions: ${totalQuestions} | Total Points: ${calculateTotalPoints(pointsRanges, totalQuestions)}</small>
      </div>
      ${scannerEndMarker}
    </div>
  `;
  
  sheetPreview.innerHTML = sheetHTML;
  sheetPreview.style.display = 'block';
  
  // Generate answer key inputs with bubbles
  generateAnswerKeyBubbles(totalQuestions, choices);
  
  // Scroll to preview
  sheetPreview.scrollIntoView({ behavior: 'smooth' });
}

function generateIdSections(studentIdLength, subjectIdLength) {
  let idHTML = '<div class="id-sections">';
  
  // Student ID section (mandatory)
  idHTML += `
    <div class="id-section">
      <h4>STUDENT ID (Required)</h4>
      <div class="id-bubbles">
        ${Array.from({length: studentIdLength}, (_, digitIndex) => `
          <div class="digit-column">
            <div class="digit-label">${digitIndex + 1}</div>
            ${Array.from({length: 10}, (_, digit) => `
              <div class="id-bubble" data-type="student" data-digit="${digitIndex}" data-value="${digit}">${digit}</div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  // Subject ID section (optional)
  if (subjectIdLength > 0) {
    idHTML += `
      <div class="id-section">
        <h4>SUBJECT ID (Optional)</h4>
        <div class="id-bubbles">
          ${Array.from({length: subjectIdLength}, (_, digitIndex) => `
            <div class="digit-column">
              <div class="digit-label">${digitIndex + 1}</div>
              ${Array.from({length: 10}, (_, digit) => `
                <div class="id-bubble" data-type="subject" data-digit="${digitIndex}" data-value="${digit}">${digit}</div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    // Add empty section to maintain grid layout
    idHTML += '<div class="id-section" style="opacity: 0.3;"><h4>Subject ID Disabled</h4><p style="font-size: 12px;">Set length > 0 to enable</p></div>';
  }
  
  idHTML += '</div>';
  return idHTML;
}

function getPointsConfiguration() {
  const pointsRows = pointsConfig.querySelectorAll('.points-row');
  const ranges = [];
  
  pointsRows.forEach(row => {
    const start = parseInt(row.querySelector('.range-start').value) || 1;
    const end = parseInt(row.querySelector('.range-end').value) || 1;
    const points = parseFloat(row.querySelector('.points-value').value) || 1;
    
    ranges.push({ start, end, points });
  });
  
  return ranges;
}

function getPointsForQuestion(questionNumber, pointsRanges) {
  for (const range of pointsRanges) {
    if (questionNumber >= range.start && questionNumber <= range.end) {
      return range.points;
    }
  }
  return 1; // Default points
}

function calculateTotalPoints(pointsRanges, totalQuestions) {
  let total = 0;
  for (let q = 1; q <= totalQuestions; q++) {
    total += getPointsForQuestion(q, pointsRanges);
  }
  return total;
}

function generateAnswerKeyBubbles(totalQuestions, choices) {
  answerKeyGrid.innerHTML = '';
  
  for (let i = 1; i <= totalQuestions; i++) {
    const keyItem = document.createElement('div');
    keyItem.className = 'key-item';
    
    const questionNumber = document.createElement('div');
    questionNumber.className = 'key-question-number';
    questionNumber.textContent = `Q${i}`;
    
    const choicesContainer = document.createElement('div');
    choicesContainer.className = 'key-choices';
    
    choices.forEach(choice => {
      const bubble = document.createElement('div');
      bubble.className = 'key-bubble';
      bubble.setAttribute('data-question', i);
      bubble.setAttribute('data-choice', choice);
      bubble.setAttribute('data-choice', choice);
      bubble.title = `Question ${i} - Choice ${choice}`;
      
      // Check if this choice is already selected
      if (currentAnswerKey[i] === choice) {
        bubble.classList.add('selected');
      }
      
      bubble.addEventListener('click', (e) => {
        handleAnswerKeyBubbleClick(e, i, choice);
      });
      
      choicesContainer.appendChild(bubble);
    });
    
    keyItem.appendChild(questionNumber);
    keyItem.appendChild(choicesContainer);
    answerKeyGrid.appendChild(keyItem);
  }
  
  answerKeySection.style.display = 'block';
}

function handleAnswerKeyBubbleClick(event, questionNumber, choice) {
  const bubble = event.target;
  const allBubblesForQuestion = document.querySelectorAll(`[data-question="${questionNumber}"].key-bubble`);
  
  // If this bubble is already selected, unselect it
  if (bubble.classList.contains('selected')) {
    bubble.classList.remove('selected');
    delete currentAnswerKey[questionNumber];
  } else {
    // Unselect all other bubbles for this question
    allBubblesForQuestion.forEach(b => b.classList.remove('selected'));
    
    // Select this bubble
    bubble.classList.add('selected');
    currentAnswerKey[questionNumber] = choice;
  }
  
  console.log('Current Answer Key:', currentAnswerKey);
}

// Save template
document.getElementById('saveTemplate').addEventListener('click', saveTemplate);

async function saveTemplate() {
  if (!currentAnswerKey || Object.keys(currentAnswerKey).length === 0) {
    alert('Please generate an answer sheet first and configure the answer key.');
    return;
  }
  
  const examTitle = examTitleInput.value || 'Examination';
  const subjectId = subjectSelect.value;
  const classId = classSelect.value;
  const totalQuestions = parseInt(totalQuestionsInput.value) || 30;
  const studentIdLength = parseInt(studentIdLengthInput.value) || 8;
  const subjectIdLength = parseInt(subjectIdLengthInput.value) || 0;
  
  if (!subjectId || !classId) {
    alert('Please select both subject and class.');
    return;
  }
  
  // Convert answer key to format matching existing structure
  const items = [];
  for (let i = 1; i <= totalQuestions; i++) {
    if (currentAnswerKey[i]) {
      items.push({
        number: i,
        correctAnswer: currentAnswerKey[i]
      });
    }
  }
  
  if (items.length === 0) {
    alert('Please set at least one correct answer.');
    return;
  }
  
  try {
    const questionSetData = {
      examTitle,
      subjectId,
      classId,
      totalQuestions,
      studentIdLength,
      subjectIdLength,
      items,
      pointsConfiguration: getPointsConfiguration(),
      choiceOptions: parseInt(choiceOptionsSelect.value),
      createdBy: auth.currentUser?.email,
      createdAt: new Date(),
      scannerCompatible: true
    };
    
    // Generate unique ID
    currentQuestionSetId = `qset_${Date.now()}`;
    
    await setDoc(doc(db, 'questions', currentQuestionSetId), {
      questionSetId: currentQuestionSetId,
      ...questionSetData
    });
    
    alert('Answer sheet template and answer key saved successfully!');
    
  } catch (error) {
    console.error('Error saving template:', error);
    alert('Failed to save template. Please try again.');
  }
}

// Save answer key
document.getElementById('saveAnswerKey').addEventListener('click', () => {
  if (Object.keys(currentAnswerKey).length === 0) {
    alert('Please set at least one answer first.');
    return;
  }
  
  alert(`Answer key updated with ${Object.keys(currentAnswerKey).length} answers! Remember to save the template to persist changes.`);
  console.log('Current Answer Key:', currentAnswerKey);
});

// Clear answer key
document.getElementById('clearAnswerKey').addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all answers?')) {
    currentAnswerKey = {};
    const allBubbles = document.querySelectorAll('.key-bubble.selected');
    allBubbles.forEach(bubble => {
      bubble.classList.remove('selected');
    });
    console.log('Answer key cleared');
  }
});

// Print functionality
document.getElementById('printSheet').addEventListener('click', () => {
  window.print();
});

// Export PDF (basic implementation)
document.getElementById('exportPDF').addEventListener('click', () => {
  // This would require a PDF library like jsPDF
  alert('PDF export functionality would be implemented here using jsPDF library.');
});

// Auto-update points ranges when total questions change
totalQuestionsInput.addEventListener('change', () => {
  const totalQuestions = parseInt(totalQuestionsInput.value) || 30;
  const pointsRows = pointsConfig.querySelectorAll('.points-row');
  
  if (pointsRows.length === 1) {
    const firstRow = pointsRows[0];
    firstRow.querySelector('.range-end').value = totalQuestions;
  }
});

// Validate student ID length
studentIdLengthInput.addEventListener('change', (e) => {
  const value = parseInt(e.target.value);
  if (value < 1 || value > 15) {
    alert('Student ID length must be between 1 and 15 digits.');
    e.target.value = Math.max(1, Math.min(15, value || 8));
  }
});

// Validate subject ID length
subjectIdLengthInput.addEventListener('change', (e) => {
  const value = parseInt(e.target.value);
  if (value < 0 || value > 8) {
    alert('Subject ID length must be between 0 and 8 digits.');
    e.target.value = Math.max(0, Math.min(8, value || 0));
  }
});

// Logout functionality
document.getElementById('signOutBtn').addEventListener('click', () => {
  signOut(auth).then(() => {
    window.location.href = 'index.html';
  }).catch((error) => {
    console.error('Log out error:', error);
    alert('Failed to log out. Please try again.');
  });
});

// Initialize demo data if Firebase is not available
if (!navigator.onLine) {
  console.log('Offline mode - loading demo data');
  loadDemoSubjects();
  loadDemoClasses();
}

console.log('Answer Sheet Maker loaded successfully');