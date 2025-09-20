import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, getDocs, addDoc, query, where, doc, setDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
  getAuth, onAuthStateChanged, signOut 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getUserRole, applySidebarRestrictions, applyPageRestrictions } from './role-manager.js';

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
const studentIdLengthInput = document.getElementById('studentIdLength');
const subjectIdLengthInput = document.getElementById('subjectIdLength');
const totalQuestionsInput = document.getElementById('totalQuestions');
const choiceOptionsSelect = document.getElementById('choiceOptions');
const questionsPerColumnInput = document.getElementById('questionsPerColumn');
const pointsConfig = document.getElementById('pointsConfig');
const sheetPreview = document.getElementById('sheetPreview');
const answerKeySection = document.getElementById('answerKeySection');
const answerKeyGrid = document.getElementById('answerKeyGrid');
const emptyPreview = document.getElementById('emptyPreview');

const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userRoleEl = document.getElementById('user-role');
const userIconBtn = document.getElementById('userIconBtn');
const userDropdown = document.getElementById('userDropdown');

// Current answer key data
let currentAnswerKey = {};
let currentQuestionSetId = null;

// Store subjects and classes data
let subjectsData = [];
let classesData = [];

// Check for URL parameters to populate form (for view/edit mode from exam details)
function loadFromURLParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  
  if (mode === 'view' || mode === 'edit') {
    // Store exam ID for editing
    if (mode === 'edit' && urlParams.get('examId')) {
      window.currentExamId = urlParams.get('examId');
      window.currentClassId = urlParams.get('classId');
      window.currentSubjectId = urlParams.get('subjectId');
    }
    
    // Populate form fields from URL parameters
    if (examTitleInput && urlParams.get('examTitle')) {
      examTitleInput.value = urlParams.get('examTitle');
    }
    if (totalQuestionsInput && urlParams.get('totalQuestions')) {
      totalQuestionsInput.value = urlParams.get('totalQuestions');
    }
    if (choiceOptionsSelect && urlParams.get('choiceOptions')) {
      choiceOptionsSelect.value = urlParams.get('choiceOptions');
    }
    if (questionsPerColumnInput && urlParams.get('questionsPerColumn')) {
      questionsPerColumnInput.value = urlParams.get('questionsPerColumn');
    }
    if (studentIdLengthInput && urlParams.get('studentIdLength')) {
      studentIdLengthInput.value = urlParams.get('studentIdLength');
    }
    if (subjectIdLengthInput && urlParams.get('subjectIdLength')) {
      subjectIdLengthInput.value = urlParams.get('subjectIdLength');
    }
    
    // Load subject selection
    const subjectId = urlParams.get('subjectId');
    if (subjectId && subjectSelect) {
      // Wait for subjects to load then set the correct subject
      const loadSubjectSelection = () => {
        if (subjectSelect.options.length > 1) {
          subjectSelect.value = subjectId;
          console.log('Subject loaded:', subjectId, subjectSelect.options[subjectSelect.selectedIndex]?.text);
        } else {
          setTimeout(loadSubjectSelection, 100);
        }
      };
      loadSubjectSelection();
    }
    
    // Load points configuration
    const pointsConfigParam = urlParams.get('pointsConfig');
    if (pointsConfigParam) {
      try {
        const pointsConfiguration = JSON.parse(pointsConfigParam);
        // Wait for the points config section to be available
        setTimeout(() => {
          loadPointsConfiguration(pointsConfiguration);
        }, 1000);
      } catch (error) {
        console.error('Error parsing points configuration:', error);
      }
    }
    
    // Load answer key items
    const answerItemsParam = urlParams.get('answerItems');
    if (answerItemsParam) {
      try {
        const answerItems = JSON.parse(answerItemsParam);
        // Load answer key items into currentAnswerKey object
        currentAnswerKey = {};
        answerItems.forEach(item => {
          currentAnswerKey[item.number] = item.correctAnswer;
        });
        console.log('Loaded answer key from URL:', currentAnswerKey);
      } catch (error) {
        console.error('Error parsing answer items:', error);
      }
    }
    
    // Auto-generate the sheet after ensuring all data is loaded
    const waitForDataAndGenerate = () => {
      // Check if subject is loaded (if subjectId was provided)
      const subjectLoaded = !subjectId || (subjectSelect && subjectSelect.value === subjectId);
      
      if (subjectLoaded) {
        console.log('All data loaded, generating sheet...');
        generateAnswerSheet();
      } else {
        console.log('Waiting for subject to load...');
        setTimeout(waitForDataAndGenerate, 200);
      }
    };
    
    // Start the generation process after a base delay
    setTimeout(waitForDataAndGenerate, 1000);
  }
}

// Helper function to load points configuration
function loadPointsConfiguration(pointsConfiguration) {
  if (!pointsConfig) return;
  
  // Clear existing points configuration
  pointsConfig.innerHTML = '';
  
  // Recreate the points configuration UI from saved data
  pointsConfiguration.forEach((config, index) => {
    const pointsRow = document.createElement('div');
    pointsRow.className = 'points-row';
    pointsRow.innerHTML = `
      <label>Questions ${config.start}-${config.end}:</label>
      <input type="number" class="input range-start" placeholder="From" min="1" style="width: 60px;" value="${config.start}">
      <span>to</span>
      <input type="number" class="input range-end" placeholder="To" min="1" style="width: 60px;" value="${config.end}">
      <span>=</span>
      <input type="number" class="input points-value" placeholder="Points" min="0.5" step="0.5" value="${config.points}" style="width: 60px;">
      <span>points</span>
      <button type="button" class="btn btn-secondary remove-points-row">×</button>
    `;
    
    pointsRow.querySelector('.remove-points-row').addEventListener('click', () => {
      pointsRow.remove();
    });
    
    pointsConfig.appendChild(pointsRow);
  });
  
  console.log('Loaded points configuration:', pointsConfiguration);
}

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
    
    const role = await getUserRole(user.email, db);
    if (userRoleEl) userRoleEl.textContent = `Role: ${role || 'N/A'}`;
    
    // Store user info in localStorage for immediate restrictions
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userRole', role || '');
    
    // Remove immediate restrictions if user is admin
    if (role !== 'teacher') {
      const immediateStyle = document.getElementById('immediate-teacher-restrictions');
      if (immediateStyle) {
        immediateStyle.remove();
      }
    }
    
    // Apply role-based restrictions
    applySidebarRestrictions(role);
    applyPageRestrictions(role, 'answer-sheet-maker');
    
    // Load data using the same logic as classes.js
    await loadSubjectsWithClasses();
  } else {
    // Clear localStorage on logout
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    
    window.location.href = 'index.html';
  }
});

// Load subjects with their classes using the same logic as classes.js
async function loadSubjectsWithClasses() {
  try {
    console.log('Loading subjects with classes using classes.js logic...');
    
    // Clear subject select
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    
    // First, get all subjects
    const allSubjectsSnap = await getDocs(collection(db, 'subjects'));
    const allSubjects = [];
    allSubjectsSnap.forEach(doc => {
      allSubjects.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('All subjects loaded:', allSubjects);
    
    // Then, get all class-subject relationships from the classes collection
    const allClassesSnap = await getDocs(collection(db, 'classes'));
    const classSubjectMap = new Map(); // Map of subjectId -> classId
    
    allClassesSnap.forEach(doc => {
      const data = doc.data();
      if (data.subjectId && data.classId) {
        classSubjectMap.set(data.subjectId, data.classId);
      }
    });
    
    console.log('Class-Subject mapping:', Array.from(classSubjectMap.entries()));
    
    // Now populate the subject select with class information
    allSubjects.forEach(subject => {
      const classId = classSubjectMap.get(subject.subjectId);
      
      if (classId) {
        const option = document.createElement('option');
        option.value = subject.subjectId;
        option.textContent = `${subject.name} (${subject.code || subject.subjectId}) - ${classId}`;
        option.setAttribute('data-class-id', classId);
        option.setAttribute('data-class-name', classId);
        subjectSelect.appendChild(option);
        
        console.log(`Added subject: ${subject.name} -> Class: ${classId}`);
      } else {
        console.log(`Subject ${subject.name} has no class assignment`);
      }
    });
    
    console.log('Subject select populated successfully');
    
  } catch (error) {
    console.error('Error loading subjects with classes:', error);
    alert('Error loading subjects and classes. Please refresh the page.');
  }
}

// Points configuration management
document.getElementById('addPointsRow')?.addEventListener('click', addPointsRow);

function addPointsRow() {
  const pointsRow = document.createElement('div');
  pointsRow.className = 'points-row';
  pointsRow.innerHTML = `
    <label>Questions</label>
    <input type="number" class="input range-start" min="1" style="width: 60px;">
    <span>to</span>
    <input type="number" class="input range-end" min="1" style="width: 60px;">
    <span>=</span>
    <input type="number" class="input points-value" placeholder="Points" min="0.5" step="0.5" value="1" style="width: 60px;">
    <span class="points-text">points</span>
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
  // Validate subject selection before generating
  const subjectId = subjectSelect?.value;
  if (!subjectId) {
    alert('Please select a subject before generating the answer sheet.');
    return;
  }

  // Hide empty preview and show action buttons
  if (emptyPreview) {
    emptyPreview.style.display = 'none';
  }
  
  // Show action buttons in preview header
  const actionButtons = document.querySelectorAll('.preview-header .btn');
  actionButtons.forEach(btn => btn.style.display = 'inline-flex');
  
  const examTitle = examTitleInput?.value || 'Examination';
  const totalQuestions = parseInt(totalQuestionsInput?.value) || 30;
  const choiceCount = parseInt(choiceOptionsSelect?.value) || 4;
  const questionsPerColumn = parseInt(questionsPerColumnInput?.value) || 15;
  
  // Fix subject selection - get both value and text properly
  let selectedSubject = '';
  if (subjectSelect && subjectSelect.selectedIndex >= 0 && subjectSelect.value) {
    selectedSubject = subjectSelect.options[subjectSelect.selectedIndex].text;
  }
  
  const studentIdLength = parseInt(studentIdLengthInput?.value) || 8;
  const subjectIdLength = parseInt(subjectIdLengthInput?.value) || 0;
  
  // Debug logging to check subject selection
  console.log('Subject Select Element:', subjectSelect);
  console.log('Selected Index:', subjectSelect?.selectedIndex);
  console.log('Selected Value:', subjectSelect?.value);
  console.log('Selected Subject Text:', selectedSubject);
  
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
  
  // Get class name from selected subject
  const selectedOption = subjectSelect?.options[subjectSelect?.selectedIndex];
  const className = selectedOption ? selectedOption.getAttribute('data-class-name') : '';
  
  // Generate answer sheet HTML
  let sheetHTML = `
    <div class="sheet-header">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        ${scannerStartMarker}
        <div style="text-align: center; flex: 1;">
          <h2 style="margin: 0; font-size: 18px;">${examTitle}</h2>
          ${selectedSubject ? `<p style="margin: 5px 0; font-size: 14px; font-weight: bold;">${selectedSubject}</p>` : ''}
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
        <!-- Removed Section and Signature fields -->
      </div>
    </div>
  `;
  
  // Add ID sections
  sheetHTML += generateIdSections(studentIdLength, subjectIdLength);
  
  // Generate questions section
  sheetHTML += `<div class="questions-grid">`;
  
  // Determine optimal layout based on question count - ALWAYS override the input field
  let actualQuestionsPerColumn;
  
  // For high question counts, adjust columns to fit better on one page
  if (totalQuestions > 50) {
    actualQuestionsPerColumn = Math.ceil(totalQuestions / 4); // 4 columns max
  } else if (totalQuestions > 30) {
    actualQuestionsPerColumn = Math.ceil(totalQuestions / 3); // 3 columns max
  } else if (totalQuestions > 15) {
    actualQuestionsPerColumn = Math.ceil(totalQuestions / 2); // 2 columns max
  } else {
    actualQuestionsPerColumn = totalQuestions; // Single column for very few questions
  }
  
  console.log(`Total Questions: ${totalQuestions}, Questions per Column: ${actualQuestionsPerColumn}, Columns: ${Math.ceil(totalQuestions / actualQuestionsPerColumn)}`);
  
  // Generate questions in columns
  const columns = Math.ceil(totalQuestions / actualQuestionsPerColumn);
  for (let col = 0; col < columns; col++) {
    sheetHTML += '<div class="question-column">';
    
    const startQuestion = col * actualQuestionsPerColumn + 1;
    const endQuestion = Math.min(startQuestion + actualQuestionsPerColumn - 1, totalQuestions);
    
    for (let q = startQuestion; q <= endQuestion; q++) {
      const points = getPointsForQuestion(q, pointsRanges);
      
      sheetHTML += `
        <div class="question-row">
          <span class="question-number">${q}.</span>
          <div class="question-choices">
            ${choices.map(choice => `
              <span class="choice-bubble" data-question="${q}" data-choice="${choice}"></span>
              <span>${choice}</span>
            `).join('')}
            <span class="points-display">(${points} pt${points !== 1 ? 's' : ''})</span>
          </div>
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
        <!-- End section removed -->
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

// ✅ FIXED: Proper validation and saving
async function saveTemplate() {
  const examTitle = examTitleInput?.value?.trim();
  const subjectId = subjectSelect?.value;
  const totalQuestions = parseInt(totalQuestionsInput?.value) || 30;
  const studentIdLength = parseInt(studentIdLengthInput?.value) || 8;
  const subjectIdLength = parseInt(subjectIdLengthInput?.value) || 0;

  console.log('Save validation - Subject ID:', subjectId);

  // Basic validation - only require title and subject
  if (!examTitle) {
    alert('Please enter an exam title.');
    return;
  }

  if (!subjectId) {
    alert('Please select a subject.');
    return;
  }

  // Validate student ID length (mandatory)
  if (studentIdLength < 1 || studentIdLength > 15) {
    alert('Student ID length must be between 1 and 15 digits.');
    return;
  }

  // Get the class ID from the selected subject
  const selectedOption = subjectSelect.options[subjectSelect.selectedIndex];
  const classId = selectedOption ? selectedOption.getAttribute('data-class-id') : '';
  
  console.log('Final class ID for saving:', classId);

  if (!classId) {
    alert('Unable to determine class for selected subject. Please try again.');
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
    // Use existing exam ID if editing, otherwise generate new one
    if (window.currentExamId) {
      currentQuestionSetId = window.currentExamId;
    } else {
      currentQuestionSetId = `qset_${Date.now()}`;
    }

    // ✅ Complete exam document data with all necessary fields
    const examData = {
      // Primary identifiers
      examId: currentQuestionSetId,
      examTitle: examTitle,
      name: examTitle, // Alternative field name for compatibility
      title: examTitle, // Another alternative field name
      
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
      
      // Store the actual generated answer sheet HTML
      generatedSheetHTML: sheetPreview ? sheetPreview.outerHTML : '',
      
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

    console.log('Saving exam data:', examData);

    if (auth.currentUser) {
      // Save to Firebase 'exams' collection
      await setDoc(doc(db, 'exams', currentQuestionSetId), examData);
      
      const isEditing = window.currentExamId;
      const message = isEditing 
        ? `Exam updated successfully! ${items.length > 0 ? `Updated with ${items.length} answer(s).` : 'Updated without answer key.'}`
        : items.length > 0 
          ? `Exam saved successfully with ${items.length} answer(s)! Redirecting to dashboard...`
          : 'Exam saved successfully without answer key! You can add answers later. Redirecting to dashboard...';
      
      alert(message);
      
      // If editing, notify parent window and close
      if (isEditing && window.opener) {
        try {
          // Send message to parent window to refresh exam details
          window.opener.postMessage({
            type: 'examUpdated',
            examId: currentQuestionSetId,
            examData: examData
          }, '*');
        } catch (e) {
          console.log('Could not notify parent window:', e);
        }
        
        // Close the editing window after a short delay
        setTimeout(() => {
          window.close();
        }, 1000);
        return;
      }
      
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
  // Check if answer sheet is generated
  const sheetPreview = document.getElementById('sheetPreview');
  if (!sheetPreview || sheetPreview.style.display === 'none' || !sheetPreview.innerHTML.trim()) {
    alert('Please generate the answer sheet first before printing.');
    return;
  }
  
  // Add a small delay to ensure the print styles are applied
  setTimeout(() => {
    window.print();
  }, 100);
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

// Initialize URL params loading when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadFromURLParams();
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