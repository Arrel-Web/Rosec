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
if (userIconBtn) {
  userIconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('show');
  });
  
  document.addEventListener('click', () => {
    userDropdown.classList.remove('show');
  });
}

// Auth listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (userNameEl) userNameEl.textContent = user.displayName || 'User Name:';
    if (userEmailEl) userEmailEl.textContent = user.email;
    
    // Update user avatar
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && user.photoURL) {
      userAvatar.src = user.photoURL;
    }
    
    const role = await getUserRole(user.email);
    if (userRoleEl) userRoleEl.textContent = `Role: ${role || 'N/A'}`;
    
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
  }
}


// Points configuration management
document.getElementById('addPointsRow')?.addEventListener('click', addPointsRow);

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
document.getElementById('generateSheet')?.addEventListener('click', generateAnswerSheet);

function generateAnswerSheet() {
  const examTitle = examTitleInput?.value || 'Examination';
  const totalQuestions = parseInt(totalQuestionsInput?.value) || 30;
  const choiceCount = parseInt(choiceOptionsSelect?.value) || 4;
  const questionsPerColumn = parseInt(questionsPerColumnInput?.value) || 15;
  const selectedSubject = subjectSelect?.options[subjectSelect.selectedIndex]?.text || '';
  const selectedClass = classSelect?.value || '';
  const studentIdLength = parseInt(studentIdLengthInput?.value) || 8;
  const subjectIdLength = parseInt(subjectIdLengthInput?.value) || 0;
  
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
  
  if (sheetPreview) {
    sheetPreview.innerHTML = sheetHTML;
    sheetPreview.style.display = 'block';
    
    // Generate answer key inputs with bubbles
    generateAnswerKeyBubbles(totalQuestions, choices);
    
    // Scroll to preview
    sheetPreview.scrollIntoView({ behavior: 'smooth' });
  }
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
  const pointsRows = pointsConfig?.querySelectorAll('.points-row') || [];
  const ranges = [];
  
  pointsRows.forEach(row => {
    const start = parseInt(row.querySelector('.range-start')?.value) || 1;
    const end = parseInt(row.querySelector('.range-end')?.value) || 1;
    const points = parseFloat(row.querySelector('.points-value')?.value) || 1;
    
    ranges.push({ start, end, points });
  });
  
  return ranges.length > 0 ? ranges : [{ start: 1, end: 30, points: 1 }];
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
  if (!answerKeyGrid) return;
  
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
  
  if (answerKeySection) {
    answerKeySection.style.display = 'block';
  }
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

// ✅ FIXED: Allow saving exams without answer keys
async function saveTemplate() {
  const examTitle = examTitleInput?.value || 'Examination';
  const subjectId = subjectSelect?.value;
  const classId = classSelect?.value;
  const totalQuestions = parseInt(totalQuestionsInput?.value) || 30;
  const studentIdLength = parseInt(studentIdLengthInput?.value) || 8;
  const subjectIdLength = parseInt(subjectIdLengthInput?.value) || 0;

  // Basic validation - only require title, subject, and class
  if (!examTitle.trim()) {
    alert('Please enter an exam title.');
    return;
  }

  if (!subjectId || !classId) {
    alert('Please select both subject and class.');
    return;
  }

  // Validate student ID length (mandatory)
  if (studentIdLength < 1 || studentIdLength > 15) {
    alert('Student ID length must be between 1 and 15 digits.');
    return;
  }

  // Convert answer key into array of items - allow empty array
  const items = [];
  for (let i = 1; i <= totalQuestions; i++) {
    if (currentAnswerKey[i]) {
      items.push({
        number: i,
        correctAnswer: currentAnswerKey[i]
      });
    }
  }

  try {
    // Generate unique ID for this exam
    currentQuestionSetId = `qset_${Date.now()}`;

    // ✅ Complete exam document data with all necessary fields
    const examData = {
      // Primary identifiers
      examId: currentQuestionSetId,
      examTitle: examTitle.trim(),
      name: examTitle.trim(), // Alternative field name for compatibility
      title: examTitle.trim(), // Another alternative field name
      
      // Course/Class information
      subjectId,
      classId,
      class: classId, // Alternative field name for compatibility
      
      // Question configuration
      totalQuestions,
      choiceOptions: parseInt(choiceOptionsSelect?.value) || 4,
      choices: parseInt(choiceOptionsSelect?.value) || 4, // Alternative field name
      questionsPerColumn: parseInt(questionsPerColumnInput?.value) || 15,
      
      // ID configuration
      studentIdLength,
      subjectIdLength,
      
      // Answer key (can be empty)
      items: items, // Array of answer items - can be empty
      
      // Points configuration
      pointsConfiguration: getPointsConfiguration(),
      
      // Metadata
      createdBy: auth.currentUser?.email,
      creator: auth.currentUser?.email, // Alternative field name
      createdAt: new Date(),
      dateCreated: new Date(), // Alternative field name
      updatedAt: new Date(),
      
      // Technical flags
      scannerCompatible: true,
      status: 'active',
      version: '1.0'
    };

    if (auth.currentUser) {
      // Save to Firebase 'exams' collection
      await setDoc(doc(db, 'exams', currentQuestionSetId), examData);
      
      const message = items.length > 0 
        ? `Exam saved successfully with ${items.length} answer(s)! Redirecting to dashboard...`
        : 'Exam saved successfully without answer key! You can add answers later. Redirecting to dashboard...';
      
      alert(message);
      
      // Redirect to dashboard to show the new exam card
      window.location.href = 'dashboard.html';
    } else {
      alert('Please log in to save exams.');
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Error saving exam:', error);
    alert('Failed to save exam. Please try again.');
  }
}

// Add save template functionality
document.getElementById('saveTemplate')?.addEventListener('click', saveTemplate);

// Save answer key
document.getElementById('saveAnswerKey')?.addEventListener('click', () => {
  if (Object.keys(currentAnswerKey).length === 0) {
    alert('Please set at least one answer first.');
    return;
  }
  
  alert(`Answer key updated with ${Object.keys(currentAnswerKey).length} answers! Remember to save the template to persist changes.`);
  console.log('Current Answer Key:', currentAnswerKey);
});

// Clear answer key
document.getElementById('clearAnswerKey')?.addEventListener('click', () => {
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
document.getElementById('printSheet')?.addEventListener('click', () => {
  window.print();
});

// Export PDF (basic implementation)
document.getElementById('exportPDF')?.addEventListener('click', () => {
  // This would require a PDF library like jsPDF
  alert('PDF export functionality would be implemented here using jsPDF library.');
});

// Auto-update points ranges when total questions change
totalQuestionsInput?.addEventListener('change', () => {
  const totalQuestions = parseInt(totalQuestionsInput.value) || 30;
  const pointsRows = pointsConfig?.querySelectorAll('.points-row');
  
  if (pointsRows && pointsRows.length === 1) {
    const firstRow = pointsRows[0];
    const endInput = firstRow.querySelector('.range-end');
    if (endInput) endInput.value = totalQuestions;
  }
});

// Validate student ID length
studentIdLengthInput?.addEventListener('change', (e) => {
  const value = parseInt(e.target.value);
  if (value < 1 || value > 15) {
    alert('Student ID length must be between 1 and 15 digits.');
    e.target.value = Math.max(1, Math.min(15, value || 8));
  }
});

// Validate subject ID length
subjectIdLengthInput?.addEventListener('change', (e) => {
  const value = parseInt(e.target.value);
  if (value < 0 || value > 8) {
    alert('Subject ID length must be between 0 and 8 digits.');
    e.target.value = Math.max(0, Math.min(8, value || 0));
  }
});

// Logout functionality
document.getElementById('signOutBtn')?.addEventListener('click', () => {
  signOut(auth).then(() => {
    window.location.href = 'index.html';
  }).catch((error) => {
    console.error('Log out error:', error);
    alert('Failed to log out. Please try again.');
  });
});

console.log('Answer Sheet Maker loaded successfully');