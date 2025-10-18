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

// Generate answer key configuration (no visual sheet needed)
document.getElementById('generateSheet')?.addEventListener('click', generateAnswerKeyConfig);

function generateAnswerKeyConfig() {
  // Validate subject selection before generating
  const subjectId = subjectSelect?.value;
  if (!subjectId) {
    alert('Please select a subject before generating the answer key.');
    return;
  }

  // Hide empty preview and show action buttons
  if (emptyPreview) {
    emptyPreview.style.display = 'none';
  }
  
  // Show action buttons in preview header
  const actionButtons = document.querySelectorAll('.preview-header .btn');
  actionButtons.forEach(btn => btn.style.display = 'inline-flex');
  
  // Fixed values
  const totalQuestions = 30;
  const choices = ['A', 'B', 'C', 'D'];
  
  // Get points configuration
  const pointsRanges = getPointsConfiguration();
  
  // Display answer key configuration info
  if (sheetPreview) {
    sheetPreview.innerHTML = `
      <div style="padding: 30px; text-align: center;">
        <div style="background: #e8f0fe; border: 2px solid #1a73e8; border-radius: 10px; padding: 30px; margin-bottom: 30px;">
          <i class="fa-solid fa-info-circle" style="font-size: 48px; color: #1a73e8; margin-bottom: 15px;"></i>
          <h2 style="color: #1a73e8; margin: 0 0 15px 0;">Answer Key Configuration</h2>
          <div style="font-size: 16px; color: #333; line-height: 1.8;">
            <p><strong>Fixed Settings:</strong></p>
            <p>📝 <strong>30 Questions</strong> (Fixed)</p>
            <p>🔤 <strong>Choices: A, B, C, D</strong> (Fixed)</p>
            <p>🆔 <strong>Student ID:</strong> 11 digits (0-9)</p>
            <p>📚 <strong>Subject ID:</strong> 4 characters (1 letter A-J + 3 numbers 0-9)</p>
            <p style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #1a73e8;">
              <strong>Points Configuration:</strong><br>
              ${pointsRanges.map(r => `Questions ${r.start}-${r.end}: ${r.points} point${r.points !== 1 ? 's' : ''}`).join('<br>')}
            </p>
          </div>
        </div>
        <p style="color: #666; font-size: 14px;">Configure the correct answers below and save to create the answer key for Raspberry Pi scanning.</p>
      </div>
    `;
    sheetPreview.style.display = 'block';
    
    // Generate answer key inputs with bubbles
    generateAnswerKeyBubbles(30, choices);
    
    // Hide configuration panel and expand preview
    hideConfigurationPanel();
    
    // Scroll to answer key section
    if (answerKeySection) {
      answerKeySection.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

// Hide/Show configuration panel
function hideConfigurationPanel() {
  const formCard = document.querySelector('.enhanced-form-card');
  const previewArea = document.querySelector('.preview-area');
  const toggleBtn = document.getElementById('toggleConfig');
  
  if (formCard && previewArea && toggleBtn) {
    formCard.style.display = 'none';
    previewArea.style.gridColumn = '1 / -1'; // Make preview full width
    toggleBtn.style.display = 'inline-flex';
    toggleBtn.innerHTML = '<i class="fa-solid fa-sliders"></i> Show Configuration';
  }
}

function showConfigurationPanel() {
  const formCard = document.querySelector('.enhanced-form-card');
  const previewArea = document.querySelector('.preview-area');
  const toggleBtn = document.getElementById('toggleConfig');
  
  if (formCard && previewArea && toggleBtn) {
    formCard.style.display = 'block';
    previewArea.style.gridColumn = ''; // Reset to normal width
    toggleBtn.innerHTML = '<i class="fa-solid fa-sliders"></i> Hide Configuration';
  }
}

// Toggle configuration panel
document.getElementById('toggleConfig')?.addEventListener('click', () => {
  const formCard = document.querySelector('.enhanced-form-card');
  if (formCard && formCard.style.display === 'none') {
    showConfigurationPanel();
  } else {
    hideConfigurationPanel();
  }
});

// Note: Visual answer sheet generation removed - only JSON answer key is needed for Raspberry Pi

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

// ✅ Save template with JSON answer key
async function saveTemplate() {
  const subjectId = subjectSelect?.value;

  console.log('Save validation - Subject ID:', subjectId);

  // Basic validation - only require subject
  if (!subjectId) {
    alert('Please select a subject.');
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

  // Convert answer key into JSON object format
  const answerKeyJSON = {};
  for (let i = 1; i <= 30; i++) {
    if (currentAnswerKey[i]) {
      answerKeyJSON[i] = currentAnswerKey[i];
    }
  }

  try {
    // Use existing exam ID if editing, otherwise generate new one
    if (window.currentExamId) {
      currentQuestionSetId = window.currentExamId;
    } else {
      currentQuestionSetId = `qset_${Date.now()}`;
    }

    // Get subject name for exam title
    const selectedOption = subjectSelect.options[subjectSelect.selectedIndex];
    const subjectName = selectedOption ? selectedOption.text : 'Answer Sheet';
    const examTitle = `${subjectName} - Answer Sheet`;

    // ✅ Complete exam document data with JSON answer key
    const examData = {
      // Primary identifiers
      examId: currentQuestionSetId,
      examTitle: examTitle,
      name: examTitle,
      title: examTitle,
      
      // Course/Class information
      subjectId,
      classId,
      class: classId,
      
      // Fixed configuration
      totalQuestions: 30,
      choiceOptions: 4,
      choices: 4,
      studentIdLength: 11,
      subjectIdLength: 4, // 1 letter + 3 numbers
      
      // Answer key as JSON object: { "1": "A", "2": "B", ... }
      answerKey: answerKeyJSON,
      
      // Points configuration
      pointsConfiguration: getPointsConfiguration(),
      
      // Store the actual generated answer sheet HTML
      generatedSheetHTML: sheetPreview ? sheetPreview.outerHTML : '',
      
      // Metadata
      createdBy: auth.currentUser?.email,
      creator: auth.currentUser?.email,
      createdAt: new Date(),
      dateCreated: new Date(),
      updatedAt: new Date(),
      
      // Technical flags
      scannerCompatible: true,
      status: 'active',
      version: '2.0'
    };

    console.log('Saving exam data:', examData);

    if (auth.currentUser) {
      // Save to Firebase 'exams' collection
      await setDoc(doc(db, 'exams', currentQuestionSetId), examData);
      
      const answerCount = Object.keys(answerKeyJSON).length;
      const isEditing = window.currentExamId;
      const message = isEditing 
        ? `Exam updated successfully! ${answerCount > 0 ? `Updated with ${answerCount} answer(s).` : 'Updated without answer key.'}`
        : answerCount > 0 
          ? `Exam saved successfully with ${answerCount} answer(s)! Redirecting to dashboard...`
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