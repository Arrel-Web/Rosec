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

  // Exam Sheet Modal Elements
  const viewExamSheetBtn = document.getElementById('viewExamSheetBtn');
  const examSheetModal = document.getElementById('examSheetModal');
  const closeExamSheetBtn = document.getElementById('closeExamSheetBtn');
  const printExamSheetBtn = document.getElementById('printExamSheetBtn');
  const downloadExamSheetBtn = document.getElementById('downloadExamSheetBtn');
  const examSheetContent = document.getElementById('examSheetContent');

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

  // ------------------- Exam Sheet Generator -------------------

  function generateExamSheet(exam) {
    if (!exam) return '';

    const totalQuestions = exam.totalQuestions || 30;
    const choiceOptions = exam.choiceOptions || exam.choices || 4;
    const choiceLetters = Array.from({ length: choiceOptions }, (_, i) => String.fromCharCode(65 + i));
    
    const examTitle = exam.examTitle || exam.name || exam.title || 'Untitled Exam';
    const subjectName = exam.subjectName || exam.subjectId || 'N/A';
    const className = exam.classId || exam.class || 'N/A';
    const examDate = formatDate(exam.createdAt || exam.dateCreated);

    return `
      <div class="exam-sheet">
        <div class="exam-sheet-header">
          <div class="exam-sheet-title">${examTitle}</div>
          <div class="exam-sheet-info">
            <div><span>Subject:</span> <span>${subjectName}</span></div>
            <div><span>Class:</span> <span>${className}</span></div>
            <div><span>Date:</span> <span>${examDate}</span></div>
            <div><span>Total Questions:</span> <span>${totalQuestions}</span></div>
          </div>
        </div>

        <div class="student-info-section">
          <h3 style="margin: 0 0 15px 0; text-align: center;">STUDENT INFORMATION</h3>
          <div class="student-info-grid">
            <div class="info-field">
              <label>Name:</label>
              <div class="field-line"></div>
            </div>
            <div class="info-field">
              <label>Student ID:</label>
              <div class="field-line"></div>
            </div>
            <div class="info-field">
              <label>Section:</label>
              <div class="field-line"></div>
            </div>
            <div class="info-field">
              <label>Score:</label>
              <div class="field-line"></div>
            </div>
          </div>
        </div>

        <div class="instructions">
          <h3>INSTRUCTIONS:</h3>
          <ul>
            <li>Use a black or blue pen to fill in the circles completely.</li>
            <li>Make heavy marks that fill the circle completely.</li>
            <li>Erase cleanly any marks you wish to change.</li>
            <li>Make no stray marks on this answer sheet.</li>
            <li>Choose only one answer per question.</li>
          </ul>
        </div>

        <div class="questions-section">
          <h3 style="margin: 0 0 20px 0; text-align: center;">ANSWER SHEET</h3>
          ${Array.from({ length: totalQuestions }, (_, i) => {
            const questionNum = i + 1;
            return `
              <div class="question-item">
                <div class="question-number">${questionNum}.</div>
                <div class="question-choices">
                  ${choiceLetters.map(letter => `
                    <div class="choice-option">
                      <div class="choice-bubble">${letter}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Show exam sheet modal using answer sheet maker logic
  function showExamSheet() {
    if (!currentExam) {
      alert('No exam data available.');
      return;
    }

    // Generate exam sheet HTML using the same logic as answer sheet maker
    const examSheetHTML = generateAnswerSheetHTML(currentExam);
    examSheetContent.innerHTML = examSheetHTML;
    examSheetModal.style.display = 'flex';
  }

  // Close exam sheet modal
  function closeExamSheet() {
    examSheetModal.style.display = 'none';
  }

  // Print exam sheet using the same print functionality as answer sheet maker
  function printExamSheet() {
    // Check if exam sheet is generated
    if (!examSheetContent || !examSheetContent.innerHTML.trim()) {
      alert('Please generate the exam sheet first.');
      return;
    }
    
    // Add a small delay to ensure the print styles are applied
    setTimeout(() => {
      window.print();
    }, 100);
  }

  // Download exam sheet as PDF
  function downloadExamSheetPDF() {
    if (!examSheetContent || !examSheetContent.innerHTML.trim()) {
      alert('Please generate the exam sheet first.');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    const examSheetHTML = examSheetContent.innerHTML;
    const examTitle = currentExam.examTitle || currentExam.name || 'Exam';
    
    const htmlContent = '<!DOCTYPE html>' +
      '<html>' +
      '<head>' +
      '<title>Exam Sheet - ' + examTitle + '</title>' +
      '<style>' +
      '@page { size: 5.5in 8.5in; margin: 0.25in; }' +
      'body { margin: 0; padding: 0; background: white; font-family: "Courier New", monospace; font-size: 8px; }' +
      '.answer-sheet-preview { display: block; border: 2px solid #000; margin: 0; padding: 10px; background: white; font-size: 8px; font-family: "Courier New", monospace; page-break-inside: avoid; width: 100%; height: auto; max-width: none; box-sizing: border-box; overflow: visible; }' +
      '.sheet-header { margin-bottom: 6px; padding-bottom: 6px; border-bottom: 2px solid #000; text-align: center; }' +
      '.sheet-header h2 { font-size: 12px; margin: 0; font-weight: bold; }' +
      '.sheet-header p { font-size: 9px; margin: 2px 0; }' +
      '.student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #000; font-size: 8px; }' +
      '.id-sections { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 6px 0; padding: 6px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; }' +
      '.id-section { text-align: center; }' +
      '.id-section h4 { font-size: 8px; margin-bottom: 4px; font-weight: bold; }' +
      '.id-bubbles { display: flex; justify-content: center; gap: 3px; flex-wrap: wrap; }' +
      '.digit-column { display: flex; flex-direction: column; align-items: center; gap: 1px; }' +
      '.digit-label { font-size: 6px; font-weight: bold; margin-bottom: 1px; }' +
      '.id-bubble { width: 8px; height: 8px; border: 1px solid #000; border-radius: 50%; display: block; margin: 0.5px auto; font-size: 5px; line-height: 6px; text-align: center; }' +
      '.questions-grid { margin-top: 4px; gap: 4px; display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; }' +
      '.question-column { break-inside: avoid; flex: 1; margin-right: 6px; }' +
      '.question-column:last-child { margin-right: 0; }' +
      '.question-row { margin-bottom: 2px; padding: 0.5px; display: flex; align-items: center; gap: 2px; }' +
      '.question-number { min-width: 15px; font-size: 8px; font-weight: bold; flex-shrink: 0; }' +
      '.question-choices { display: flex; align-items: center; gap: 2px; flex: 1; }' +
      '.choice-bubble { width: 10px; height: 10px; border: 1px solid #000; border-radius: 50%; display: inline-block; margin: 0 1px; }' +
      '.question-choices span { font-size: 7px; }' +
      '.points-display { font-size: 6px; color: #000; margin-left: 3px; }' +
      '.scanner-marker { background: #000; width: 10px; height: 10px; margin: 0 2px; display: inline-block; }' +
      '</style>' +
      '</head>' +
      '<body>' +
      examSheetHTML +
      '<script>' +
      'window.onload = function() {' +
      'setTimeout(function() { window.print(); }, 100);' +
      '}' +
      '</script>' +
      '</body>' +
      '</html>';
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  // Generate answer sheet HTML using the same logic as answer-sheet-maker.js
  function generateAnswerSheetHTML(exam) {
    const examTitle = exam.examTitle || exam.name || exam.title || 'Examination';
    const totalQuestions = exam.totalQuestions || 30;
    const choiceCount = exam.choiceOptions || exam.choices || 4;
    const subjectInfo = exam.subjectId || 'Subject';
    const className = exam.classId || exam.class || '';
    const studentIdLength = exam.studentIdLength || 8;
    const subjectIdLength = exam.subjectIdLength || 0;
    
    // Generate choice letters
    const choices = [];
    for (let i = 0; i < choiceCount; i++) {
      choices.push(String.fromCharCode(65 + i)); // A, B, C, D, E
    }
    
    // Generate scanner start/end markers
    const scannerStartMarker = '<div class="scanner-marker"></div>'.repeat(5);
    const scannerEndMarker = '<div class="scanner-marker"></div>'.repeat(5);
    
    // Generate answer sheet HTML
    let sheetHTML = '<div class="sheet-header">' +
      '<div style="display: flex; justify-content: space-between; align-items: center;">' +
      scannerStartMarker +
      '<div style="text-align: center; flex: 1;">' +
      '<h2 style="margin: 0; font-size: 18px;">' + examTitle + '</h2>' +
      '<p style="margin: 5px 0; font-size: 14px;">' + subjectInfo + '</p>' +
      (className ? '<p style="margin: 5px 0; font-size: 12px;">Class: ' + className + '</p>' : '') +
      '</div>' +
      scannerStartMarker +
      '</div>' +
      '</div>' +
      '<div class="student-info">' +
      '<div>' +
      '<strong>Name:</strong> ________________________________<br><br>' +
      '<strong>Date:</strong> ________________________________' +
      '</div>' +
      '<div>' +
      '<strong>Section:</strong> ________________________________<br><br>' +
      '<strong>Signature:</strong> ________________________________' +
      '</div>' +
      '</div>';
    
    // Add ID sections
    sheetHTML += generateIdSections(studentIdLength, subjectIdLength);
    
    // Generate questions section
    sheetHTML += '<div class="questions-grid">';
    
    // Determine optimal layout based on question count
    let actualQuestionsPerColumn;
    
    if (totalQuestions > 50) {
      actualQuestionsPerColumn = Math.ceil(totalQuestions / 4); // 4 columns max
    } else if (totalQuestions > 30) {
      actualQuestionsPerColumn = Math.ceil(totalQuestions / 3); // 3 columns max
    } else if (totalQuestions > 15) {
      actualQuestionsPerColumn = Math.ceil(totalQuestions / 2); // 2 columns max
    } else {
      actualQuestionsPerColumn = totalQuestions; // Single column for very few questions
    }
    
    // Generate questions in columns
    const columns = Math.ceil(totalQuestions / actualQuestionsPerColumn);
    for (let col = 0; col < columns; col++) {
      sheetHTML += '<div class="question-column">';
      
      const startQuestion = col * actualQuestionsPerColumn + 1;
      const endQuestion = Math.min(startQuestion + actualQuestionsPerColumn - 1, totalQuestions);
      
      for (let q = startQuestion; q <= endQuestion; q++) {
        const points = getPointsForQuestion(q, exam.pointsConfiguration || [{ start: 1, end: totalQuestions, points: 1 }]);
        
        sheetHTML += '<div class="question-row">' +
          '<span class="question-number">' + q + '.</span>' +
          '<div class="question-choices">' +
          choices.map(choice => 
            '<span class="choice-bubble" data-question="' + q + '" data-choice="' + choice + '"></span>' +
            '<span>' + choice + '</span>'
          ).join('') +
          '<span class="points-display">(' + points + ' pt' + (points !== 1 ? 's' : '') + ')</span>' +
          '</div>' +
          '</div>';
      }
      
      sheetHTML += '</div>';
    }
    
    const totalPoints = calculateTotalPoints(exam.pointsConfiguration || [{ start: 1, end: totalQuestions, points: 1 }], totalQuestions);
    
    sheetHTML += '</div>' +
      '<div style="margin-top: 30px; text-align: center; display: flex; justify-content: space-between; align-items: center;">' +
      scannerEndMarker +
      '<div style="flex: 1; text-align: center;">' +
      '<strong>END OF ANSWER SHEET</strong><br>' +
      '<small>Total Questions: ' + totalQuestions + ' | Total Points: ' + totalPoints + '</small>' +
      '</div>' +
      scannerEndMarker +
      '</div>';
    
    return sheetHTML;
  }

  // Helper functions from answer-sheet-maker.js
  function generateIdSections(studentIdLength, subjectIdLength) {
    let idHTML = '<div class="id-sections">';
    
    // Student ID section (mandatory)
    idHTML += '<div class="id-section">' +
      '<h4>STUDENT ID (Required)</h4>' +
      '<div class="id-bubbles">';
    
    for (let digitIndex = 0; digitIndex < studentIdLength; digitIndex++) {
      idHTML += '<div class="digit-column">' +
        '<div class="digit-label">' + (digitIndex + 1) + '</div>';
      
      for (let digit = 0; digit < 10; digit++) {
        idHTML += '<div class="id-bubble" data-type="student" data-digit="' + digitIndex + '" data-value="' + digit + '">' + digit + '</div>';
      }
      
      idHTML += '</div>';
    }
    
    idHTML += '</div></div>';
    
    // Subject ID section (optional)
    if (subjectIdLength > 0) {
      idHTML += '<div class="id-section">' +
        '<h4>SUBJECT ID (Optional)</h4>' +
        '<div class="id-bubbles">';
      
      for (let digitIndex = 0; digitIndex < subjectIdLength; digitIndex++) {
        idHTML += '<div class="digit-column">' +
          '<div class="digit-label">' + (digitIndex + 1) + '</div>';
        
        for (let digit = 0; digit < 10; digit++) {
          idHTML += '<div class="id-bubble" data-type="subject" data-digit="' + digitIndex + '" data-value="' + digit + '">' + digit + '</div>';
        }
        
        idHTML += '</div>';
      }
      
      idHTML += '</div></div>';
    } else {
      // Add empty section to maintain grid layout
      idHTML += '<div class="id-section" style="opacity: 0.3;"><h4>Subject ID Disabled</h4><p style="font-size: 12px;">Set length > 0 to enable</p></div>';
    }
    
    idHTML += '</div>';
    return idHTML;
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

  // Exam Sheet Event Listeners
  if (viewExamSheetBtn) viewExamSheetBtn.addEventListener('click', showExamSheet);
  if (closeExamSheetBtn) closeExamSheetBtn.addEventListener('click', closeExamSheet);
  if (printExamSheetBtn) printExamSheetBtn.addEventListener('click', printExamSheet);
  if (downloadExamSheetBtn) downloadExamSheetBtn.addEventListener('click', downloadExamSheetPDF);

  // Close modal when clicking outside
  if (examSheetModal) {
    examSheetModal.addEventListener('click', (e) => {
      if (e.target === examSheetModal) {
        closeExamSheet();
      }
    });
  }

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
