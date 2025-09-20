// js/academic-periods.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";

import {

getFirestore,

doc,

setDoc,

getDoc,

collection,

getDocs,

query,

where,

deleteDoc,

Timestamp

} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

// --- Firebase config ---

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

// --- Form Elements ---

const academicYearIdInput = document.getElementById('academicYearId');

const schoolYearIdInput = document.getElementById('schoolYearId');

const schoolYearStartInput = document.getElementById('schoolYearStart');

const schoolYearEndInput = document.getElementById('schoolYearEnd');

const createBtn = document.getElementById('createAcademicYearBtn');

const cancelEditBtn = document.getElementById('cancelEditBtn');

const semestersContainer = document.getElementById('semestersContainer');

const addSemesterBtn = document.getElementById('addSemesterBtn');

const addFirstSemesterBtn = document.getElementById('addFirstSemesterBtn');

const academicYearsGrid = document.getElementById('academicYearsGrid');

const currentAcademicYearSpan = document.getElementById('currentAcademicYear');

const autoSuggestBtn = document.getElementById('autoSuggestBtn');
const cancelSuggestBtn = document.getElementById('cancelSuggestBtn');

// Enhanced form elements
const formTitle = document.getElementById('formTitle');
const formProgress = document.getElementById('formProgress');
const prevStepBtn = document.getElementById('prevStepBtn');
const nextStepBtn = document.getElementById('nextStepBtn');
const semesterCount = document.getElementById('semesterCount');
const semesterActions = document.querySelector('.semester-actions');

let editModeId = null;
let currentStep = 1;
const totalSteps = 3;

// --- Generate Unique Semester ID ---

function generateUniqueSemesterId() {

const timestamp = Math.floor(Date.now() / 1000); // Convert to seconds for Firebase compatibility

const randomNum = Math.floor(Math.random() * 1000);

return `sem_${timestamp}_${randomNum}`;

}

// --- Generate Unique Term ID ---

function generateUniqueTermId() {

const timestamp = Math.floor(Date.now() / 1000); // Convert to seconds for Firebase compatibility

const randomNum = Math.floor(Math.random() * 1000);

return `term_${timestamp}_${randomNum}`;

}

// --- Current Academic Year Calculation ---

function getCurrentAcademicYear() {

const now = new Date();

const currentYear = now.getFullYear();

const currentMonth = now.getMonth(); // 0-11

// Academic year typically starts in August/September

// If current month is January-July, we're in the second half of the academic year

// If current month is August-December, we're in the first half of the academic year

let academicStartYear, academicEndYear;

if (currentMonth >= 7) { // August (7) to December (11)

academicStartYear = currentYear;

academicEndYear = currentYear + 1;

} else { // January (0) to July (6)

academicStartYear = currentYear - 1;

academicEndYear = currentYear;

}

return `${academicStartYear}-${academicEndYear}`;

}

// --- Check if Academic Year is Active ---

function isAcademicYearActive(academicYearData) {

if (!academicYearData.semesters || academicYearData.semesters.length === 0) {

return false;

}

const now = new Date();

// Check if current date falls within any semester's date range

for (const semester of academicYearData.semesters) {

if (semester.semStart && semester.semEnd) {

const startDate = semester.semStart.toDate ? semester.semStart.toDate() : new Date(semester.semStart);

const endDate = semester.semEnd.toDate ? semester.semEnd.toDate() : new Date(semester.semEnd);

if (now >= startDate && now <= endDate) {

return true;

}

}

}

// If no semester dates are set, check if the academic year matches current academic year

const currentAcademicYear = getCurrentAcademicYear();

const academicYearId = academicYearData.academicYearId || '';

return academicYearId.includes(currentAcademicYear);

}

// --- Enhanced Auto Suggest Current Academic Year ---

autoSuggestBtn.addEventListener('click', () => {

const currentYear = getCurrentAcademicYear();

academicYearIdInput.value = `A.Y${currentYear}`;

schoolYearIdInput.value = `sy${currentYear}`;

// Set default dates for academic year (August to July)

const startYear = parseInt(currentYear.split('-')[0]);

const endYear = parseInt(currentYear.split('-')[1]);

const startDate = new Date(startYear, 7, 1); // August 1st

const endDate = new Date(endYear, 6, 31); // July 31st

schoolYearStartInput.value = startDate.toISOString().split('T')[0];

schoolYearEndInput.value = endDate.toISOString().split('T')[0];

// Clear semesters container and add default semesters

semestersContainer.innerHTML = '';

// Add First Semester

const firstSemester = createSemesterBlock();

firstSemester.querySelector('.semester-label').value = '1st Semester';

firstSemester.querySelector('.semester-start').value = new Date(startYear, 7, 1).toISOString().split('T')[0]; // August 1st

firstSemester.querySelector('.semester-end').value = new Date(startYear, 11, 31).toISOString().split('T')[0]; // December 31st

semestersContainer.appendChild(firstSemester);

// Add Second Semester

const secondSemester = createSemesterBlock();

secondSemester.querySelector('.semester-label').value = '2nd Semester';

secondSemester.querySelector('.semester-start').value = new Date(endYear, 0, 1).toISOString().split('T')[0]; // January 1st

secondSemester.querySelector('.semester-end').value = new Date(endYear, 4, 31).toISOString().split('T')[0]; // May 31st

semestersContainer.appendChild(secondSemester);

// Update semester display
updateSemesterDisplay();

// Show cancel button and hide auto-suggest button
if (autoSuggestBtn && cancelSuggestBtn) {
  autoSuggestBtn.style.display = 'none';
  cancelSuggestBtn.style.display = 'inline-flex';
}

// Show success notification
showNotification(`Auto-filled with current academic year: ${currentYear}`, 'success');

// Advance to next step if on step 1
if (currentStep === 1) {
  setTimeout(() => {
    currentStep = 2;
    showStep(currentStep);
  }, 1000);
}

});

// --- Cancel Auto Suggest ---
if (cancelSuggestBtn) {
  cancelSuggestBtn.addEventListener('click', () => {
    // Clear the form
    clearForm();
    
    // Show auto-suggest button and hide cancel button
    if (autoSuggestBtn && cancelSuggestBtn) {
      autoSuggestBtn.style.display = 'inline-flex';
      cancelSuggestBtn.style.display = 'none';
    }
    
    // Show notification
    showNotification('Auto-suggestion cancelled. Form cleared.', 'info');
  });
}

// --- Update Current Academic Year Display ---

function updateCurrentAcademicYearDisplay() {

const currentYear = getCurrentAcademicYear();

if (currentAcademicYearSpan) {

currentAcademicYearSpan.textContent = currentYear;

}

}

// Initialize current academic year display

updateCurrentAcademicYearDisplay();

// --- Enhanced Clear Form ---

function clearForm() {

academicYearIdInput.value = '';

schoolYearIdInput.value = '';

schoolYearStartInput.value = '';

schoolYearEndInput.value = '';

semestersContainer.innerHTML = `
  <div class="empty-semesters-state">
    <div class="empty-icon">
      <i class="fa-solid fa-calendar-plus"></i>
    </div>
    <h4>No semesters added yet</h4>
    <p>Add semesters to organize your academic year</p>
    <button type="button" class="add-first-semester-btn" id="addFirstSemesterBtn">
      <i class="fa-solid fa-plus"></i> Add Your First Semester
    </button>
  </div>
`;

// Re-attach event listener for the new button
const newAddFirstBtn = document.getElementById('addFirstSemesterBtn');
if (newAddFirstBtn) {
  newAddFirstBtn.addEventListener('click', () => {
    const semesterBlock = createSemesterBlock();
    semestersContainer.innerHTML = '';
    semestersContainer.appendChild(semesterBlock);
    updateSemesterDisplay();
  });
}

academicYearIdInput.disabled = false;

// Update form title and button
if (formTitle) {
  formTitle.textContent = 'Create Academic Year';
}

const btnContent = createBtn.querySelector('.btn-text');
if (btnContent) {
  btnContent.textContent = 'Create Academic Year';
}

editModeId = null;

cancelEditBtn.style.display = 'none';

// Reset to first step
currentStep = 1;
showStep(currentStep);

// Update semester display
updateSemesterDisplay();

// Reset auto-suggest button states
if (autoSuggestBtn && cancelSuggestBtn) {
  autoSuggestBtn.style.display = 'inline-flex';
  cancelSuggestBtn.style.display = 'none';
}

// Remove validation errors
const errorDiv = document.querySelector('.validation-error');
if (errorDiv) {
  errorDiv.remove();
}

// Remove selected class from all cards

document.querySelectorAll('.academic-year-card.selected').forEach(card => {

card.classList.remove('selected');

});

}

// --- Enhanced Enter Edit Mode ---

function enterEditMode() {

// Update form title
if (formTitle) {
  formTitle.textContent = 'Edit Academic Year';
}

// Update button text
const btnContent = createBtn.querySelector('.btn-text');
if (btnContent) {
  btnContent.textContent = 'Update Academic Year';
}

cancelEditBtn.style.display = 'inline-flex';

// Update form icon to edit icon
const formIcon = document.querySelector('.form-icon i');
if (formIcon) {
  formIcon.className = 'fa-solid fa-edit';
}

// Update semester display
updateSemesterDisplay();

}

// --- Cancel Edit ---

cancelEditBtn.addEventListener('click', clearForm);

// --- Dynamic Semester / Term Handlers ---

function createTermBlock() {

const termDiv = document.createElement('div');

termDiv.className = 'term-block';

// Generate unique term ID

const uniqueTermId = generateUniqueTermId();

termDiv.innerHTML = `

<input type="hidden" class="term-id" value="${uniqueTermId}">

<label>Term Name: <input type="text" class="term-name" placeholder="Prelim"></label>

<button type="button" class="remove-btn">Remove Term</button>

`;

termDiv.querySelector('.remove-btn').addEventListener('click', () => termDiv.remove());

return termDiv;

}

function createSemesterBlock() {

const semesterDiv = document.createElement('div');

semesterDiv.className = 'semester-block';

// Generate unique semester ID

const uniqueSemesterId = generateUniqueSemesterId();

semesterDiv.innerHTML = `

<div class="semester-header">

<h5>Semester</h5>

<button type="button" class="remove-btn">Remove Semester</button>

</div>

<input type="hidden" class="semester-id" value="${uniqueSemesterId}">

<div class="semester-form-fields">

<label>Semester Label:
<input type="text" class="semester-label" placeholder="1st Semester">
</label>

<label>Start Date:
<input type="date" class="semester-start">
</label>

<label>End Date:
<input type="date" class="semester-end">
</label>

</div>

<div class="terms-container"></div>

<button type="button" class="add-btn add-term-btn">+ Add Term</button>

`;

semesterDiv.querySelector('.remove-btn').addEventListener('click', () => {
  semesterDiv.remove();
  updateSemesterDisplay();
});

const addTermBtn = semesterDiv.querySelector('.add-term-btn');

const termsContainer = semesterDiv.querySelector('.terms-container');

addTermBtn.addEventListener('click', () => {

const termBlock = createTermBlock();

termsContainer.appendChild(termBlock);

});

return semesterDiv;

}

// Enhanced semester management
addSemesterBtn.addEventListener('click', () => {
  const semesterBlock = createSemesterBlock();
  semestersContainer.appendChild(semesterBlock);
  updateSemesterDisplay();
});

// Add first semester button
if (addFirstSemesterBtn) {
  addFirstSemesterBtn.addEventListener('click', () => {
    const semesterBlock = createSemesterBlock();
    semestersContainer.innerHTML = ''; // Clear empty state
    semestersContainer.appendChild(semesterBlock);
    updateSemesterDisplay();
  });
}

// Enhanced Form Step Navigation
function updateFormProgress() {
  const progressPercentage = (currentStep / totalSteps) * 100;
  if (formProgress) {
    formProgress.style.width = `${progressPercentage}%`;
  }
  
  const progressText = document.querySelector('.progress-text');
  if (progressText) {
    progressText.textContent = `Step ${currentStep} of ${totalSteps}`;
  }
}

function showStep(stepNumber) {
  // Hide all steps
  document.querySelectorAll('.enhanced-form-step').forEach(step => {
    step.classList.remove('active');
  });
  
  // Show current step
  const currentStepElement = document.querySelector(`[data-step="${stepNumber}"]`);
  if (currentStepElement) {
    currentStepElement.classList.add('active');
  }
  
  // Update navigation buttons
  if (prevStepBtn) {
    prevStepBtn.disabled = stepNumber === 1;
  }
  
  if (nextStepBtn) {
    if (stepNumber === totalSteps) {
      nextStepBtn.style.display = 'none';
    } else {
      nextStepBtn.style.display = 'inline-flex';
      const nextBtnText = nextStepBtn.querySelector('span');
      if (nextBtnText) {
        nextBtnText.textContent = stepNumber === totalSteps - 1 ? 'Review' : 'Next';
      }
    }
  }
  
  updateFormProgress();
}

function validateCurrentStep() {
  switch (currentStep) {
    case 1:
      return academicYearIdInput.value.trim() !== '';
    case 2:
      return schoolYearIdInput.value.trim() !== '' && 
             schoolYearStartInput.value !== '' && 
             schoolYearEndInput.value !== '';
    case 3:
      return true; // Semesters are optional
    default:
      return true;
  }
}

function showValidationError(message) {
  // Create or update validation message
  let errorDiv = document.querySelector('.validation-error');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.style.cssText = `
      background: linear-gradient(135deg, #fce4ec, #ffebee);
      border: 1px solid #f48fb1;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 15px 0;
      color: #c2185b;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: shake 0.5s ease-in-out;
    `;
    
    const currentStepElement = document.querySelector(`[data-step="${currentStep}"]`);
    if (currentStepElement) {
      currentStepElement.appendChild(errorDiv);
    }
  }
  
  errorDiv.innerHTML = `
    <i class="fa-solid fa-exclamation-triangle"></i>
    <span>${message}</span>
  `;
  
  // Remove error after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}

// Navigation button handlers
if (prevStepBtn) {
  prevStepBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      showStep(currentStep);
    }
  });
}

if (nextStepBtn) {
  nextStepBtn.addEventListener('click', () => {
    if (!validateCurrentStep()) {
      let errorMessage = '';
      switch (currentStep) {
        case 1:
          errorMessage = 'Please enter an Academic Year ID to continue.';
          break;
        case 2:
          errorMessage = 'Please fill in all school year details to continue.';
          break;
        default:
          errorMessage = 'Please complete all required fields.';
      }
      showValidationError(errorMessage);
      return;
    }
    
    // Remove any existing validation errors
    const errorDiv = document.querySelector('.validation-error');
    if (errorDiv) {
      errorDiv.remove();
    }
    
    if (currentStep < totalSteps) {
      currentStep++;
      showStep(currentStep);
    }
  });
}

// Update semester display
function updateSemesterDisplay() {
  const semesterBlocks = semestersContainer.querySelectorAll('.semester-block');
  const count = semesterBlocks.length;
  
  if (semesterCount) {
    semesterCount.textContent = count;
  }
  
  if (semesterActions) {
    semesterActions.style.display = count > 0 ? 'flex' : 'none';
  }
  
  // Show/hide empty state
  const emptyState = semestersContainer.querySelector('.empty-semesters-state');
  if (emptyState) {
    emptyState.style.display = count > 0 ? 'none' : 'block';
  }
}

// Initialize form
function initializeEnhancedForm() {
  currentStep = 1;
  showStep(currentStep);
  updateSemesterDisplay();
}

// Call initialization
initializeEnhancedForm();

// Enhanced notification system
function showNotification(message, type = 'info') {
  // Remove any existing notifications to prevent overlap
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notif => {
    if (notif.parentNode) {
      notif.remove();
    }
  });

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? 'linear-gradient(135deg, #4caf50, #45a049)' : 
                 type === 'error' ? 'linear-gradient(135deg, #f44336, #da190b)' : 
                 'linear-gradient(135deg, #2196f3, #0b7dda)'};
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 10000;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideInRight 0.5s ease;
    max-width: 400px;
    opacity: 1;
    transform: translateX(0);
  `;
  
  const icon = type === 'success' ? 'fa-check-circle' : 
               type === 'error' ? 'fa-exclamation-circle' : 
               'fa-info-circle';
  
  notification.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  // Store timeout ID to prevent conflicts
  const timeoutId = setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.5s ease forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 500);
    }
  }, 5000); // Increased to 5 seconds for better visibility
  
  // Allow manual dismissal by clicking
  notification.addEventListener('click', () => {
    clearTimeout(timeoutId);
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  });
}

// Add CSS for notification animations
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`;
document.head.appendChild(notificationStyles);

// --- Enhanced Create / Update Academic Year ---

createBtn.addEventListener('click', async () => {

// Show loading state
const btnContent = createBtn.querySelector('.btn-content');
const btnLoading = createBtn.querySelector('.btn-loading');
if (btnContent && btnLoading) {
  btnContent.style.display = 'none';
  btnLoading.style.display = 'flex';
}
createBtn.disabled = true;

const academicYearId = editModeId || academicYearIdInput.value.trim();

const schoolYearId = schoolYearIdInput.value.trim();

const schoolYearStart = schoolYearStartInput.value ? Timestamp.fromDate(new Date(schoolYearStartInput.value)) : null;

const schoolYearEnd = schoolYearEndInput.value ? Timestamp.fromDate(new Date(schoolYearEndInput.value)) : null;

if (!academicYearId || !schoolYearId) {

showNotification('Please fill Academic Year ID and School Year ID.', 'error');

// Reset button state
const btnContent = createBtn.querySelector('.btn-content');
const btnLoading = createBtn.querySelector('.btn-loading');
if (btnContent && btnLoading) {
  btnContent.style.display = 'flex';
  btnLoading.style.display = 'none';
}
createBtn.disabled = false;

return;

}

// Collect semesters & terms

const semesterBlocks = semestersContainer.querySelectorAll('.semester-block');

const semesters = [];

for (const semDiv of semesterBlocks) {

const semId = semDiv.querySelector('.semester-id').value.trim();

const semLabel = semDiv.querySelector('.semester-label').value.trim();

const semStart = semDiv.querySelector('.semester-start').value ? Timestamp.fromDate(new Date(semDiv.querySelector('.semester-start').value)) : null;

const semEnd = semDiv.querySelector('.semester-end').value ? Timestamp.fromDate(new Date(semDiv.querySelector('.semester-end').value)) : null;

if (!semId || !semLabel) {

showNotification('Please fill Semester ID and Label.', 'error');

// Reset button state
const btnContent = createBtn.querySelector('.btn-content');
const btnLoading = createBtn.querySelector('.btn-loading');
if (btnContent && btnLoading) {
  btnContent.style.display = 'flex';
  btnLoading.style.display = 'none';
}
createBtn.disabled = false;

return;

}

const termDivs = semDiv.querySelectorAll('.term-block');

const terms = [];

for (const termDiv of termDivs) {

const termId = termDiv.querySelector('.term-id').value.trim();

const termName = termDiv.querySelector('.term-name').value.trim();

if (!termId || !termName) {

showNotification('Please fill all Term IDs and Names.', 'error');

// Reset button state
const btnContent = createBtn.querySelector('.btn-content');
const btnLoading = createBtn.querySelector('.btn-loading');
if (btnContent && btnLoading) {
  btnContent.style.display = 'flex';
  btnLoading.style.display = 'none';
}
createBtn.disabled = false;

return;

}

terms.push({ termId, termName });

}

semesters.push({ semId, semLabel, semStart, semEnd, terms });

}

try {

// Save school year

await setDoc(doc(db, 'schoolyear', schoolYearId), {

startDate: schoolYearStart,

endDate: schoolYearEnd,

isActive: true,

createdAt: Timestamp.fromDate(new Date())

});

// Save semesters & terms

for (const sem of semesters) {

await setDoc(doc(db, 'semester', sem.semId), {

name: sem.semLabel,

startDate: sem.semStart,

endDate: sem.semEnd,

createdAt: Timestamp.fromDate(new Date())

});

for (const term of sem.terms) {

await setDoc(doc(db, 'term', term.termId), {

name: term.termName,

createdAt: Timestamp.fromDate(new Date())

});

}

}

// Save academic year

await setDoc(doc(db, 'academicyear', academicYearId), {

academicYearId,

schoolYearId,

semesters,

createdAt: Timestamp.fromDate(new Date())

});

// Show success notification
showNotification(
  editModeId ? 'Academic Year updated successfully!' : 'Academic Year created successfully!', 
  'success'
);

clearForm();

loadAcademicYears();

} catch (error) {

console.error(error);

showNotification('Error saving academic year: ' + error.message, 'error');

} finally {

// Reset button state
const btnContent = createBtn.querySelector('.btn-content');
const btnLoading = createBtn.querySelector('.btn-loading');
if (btnContent && btnLoading) {
  btnContent.style.display = 'flex';
  btnLoading.style.display = 'none';
}
createBtn.disabled = false;

}

});

// --- Delete Academic Year ---

async function deleteAcademicYear(academicYearId) {

const user = auth.currentUser;

if (!user) {

alert('Please sign in to delete academic years.');

return;

}

// Check user role

try {

const usersCol = collection(db, 'users');

const q = query(usersCol, where('email', '==', user.email));

const querySnapshot = await getDocs(q);

if (!querySnapshot.empty) {

const userData = querySnapshot.docs[0].data();

if (userData.role !== 'admin') {

alert('Only administrators can delete academic years.');

return;

}

} else {

alert('Unable to verify user role.');

return;

}

} catch (err) {

console.error('Error checking user role:', err);

alert('Error verifying permissions.');

return;

}

// Confirm deletion

const confirmDelete = confirm(`Are you sure you want to delete academic year "${academicYearId}"?\n\nThis will also remove all related semesters and terms. This action cannot be undone.`);

if (!confirmDelete) {

return;

}

try {

console.log(`Deleting academic year: ${academicYearId}`);

// Get the academic year document

const academicYearDoc = doc(db, 'academicyear', academicYearId);

const academicYearSnap = await getDoc(academicYearDoc);

if (!academicYearSnap.exists()) {

alert('Academic year not found.');

return;

}

const academicYearData = academicYearSnap.data();

// Delete related semesters and terms

if (academicYearData.semesters && academicYearData.semesters.length) {

for (const sem of academicYearData.semesters) {

// Delete terms

if (sem.terms && sem.terms.length) {

for (const term of sem.terms) {

if (term.termId) {

await deleteDoc(doc(db, 'term', term.termId));

console.log(`Deleted term: ${term.termId}`);

}

}

}

// Delete semester

if (sem.semId) {

await deleteDoc(doc(db, 'semester', sem.semId));

console.log(`Deleted semester: ${sem.semId}`);

}

}

}

// Delete school year if it exists

if (academicYearData.schoolYearId) {

try {

await deleteDoc(doc(db, 'schoolyear', academicYearData.schoolYearId));

console.log(`Deleted school year: ${academicYearData.schoolYearId}`);

} catch (schoolYearError) {

console.warn(`Could not delete school year ${academicYearData.schoolYearId}:`, schoolYearError);

}

}

// Delete the academic year document

await deleteDoc(academicYearDoc);

console.log(`Deleted academic year: ${academicYearId}`);

// Clear form if the deleted academic year was being edited

if (editModeId === academicYearId) {

clearForm();

}

// Reload academic years

loadAcademicYears();

alert(`Academic year "${academicYearId}" has been successfully deleted.`);

} catch (error) {

console.error('Error deleting academic year:', error);

alert('Failed to delete academic year: ' + error.message);

}

}

// --- Load Academic Years ---

async function loadAcademicYears() {

academicYearsGrid.innerHTML = '<p class="muted">Loading...</p>';

try {

const snapshot = await getDocs(collection(db, 'academicyear'));

academicYearsGrid.innerHTML = '';

if (snapshot.empty) {

academicYearsGrid.innerHTML = '<p class="muted">No academic years yet.</p>';

return;

}

for (const docSnap of snapshot.docs) {

const data = docSnap.data();

const card = document.createElement('div');

card.className = 'academic-year-card';

const academicYearDisplay = data.academicYearId || 'N/A';

const schoolYearDisplay = data.schoolYearId || 'N/A';

let semestersHtml = '';

if (data.semesters && data.semesters.length) {

data.semesters.forEach((sem, index) => {

let termsHtml = '';

if (sem.terms && sem.terms.length) {

termsHtml = `<div class="terms-list">`;

sem.terms.forEach(term => {

termsHtml += `<span class="term-badge">${term.termName || 'N/A'}</span>`;

});

termsHtml += `</div>`;

}

// Format semester dates if available

let semesterDates = '';

if (sem.semStart && sem.semEnd) {

const startDate = sem.semStart.toDate ? sem.semStart.toDate() : new Date(sem.semStart);

const endDate = sem.semEnd.toDate ? sem.semEnd.toDate() : new Date(sem.semEnd);

semesterDates = `<div class="semester-dates">
<i class="fa-solid fa-calendar-days"></i>
${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
</div>`;

}

semestersHtml += `
<div class="semester-item">
<div class="semester-header">
<i class="fa-solid fa-book-open"></i>
<span class="semester-name">${sem.semLabel || 'N/A'}</span>
<span class="semester-count">${sem.terms ? sem.terms.length : 0} terms</span>
</div>
${semesterDates}
${termsHtml}
</div>`;

});

}

// Check if this academic year is currently active

const isActive = isAcademicYearActive(data);

if (isActive) {

card.classList.add('active');

}

card.innerHTML = `

<div class="status-badge">

<i class="fa-solid fa-circle-check"></i>

Active

</div>

<button class="delete-academic-year-btn" data-academic-year-id="${academicYearDisplay}" title="Delete Academic Year">

<i class="fa-solid fa-trash"></i>

</button>

<div class="card-main-content">

<div class="academic-year-title">

<i class="fa-solid fa-graduation-cap"></i>

<h5>${academicYearDisplay}</h5>

</div>

<div class="school-year-info">

<i class="fa-solid fa-school"></i>

<span class="school-year-label">School Year:</span>

<span class="school-year-value">${schoolYearDisplay}</span>

</div>

<div class="semesters-section">

<div class="section-title">

<i class="fa-solid fa-calendar-alt"></i>

<span>Semesters (${data.semesters ? data.semesters.length : 0})</span>

</div>

<div class="semesters-content">

${semestersHtml || '<div class="no-semesters"><i class="fa-solid fa-info-circle"></i> No semesters configured</div>'}

</div>

</div>

</div>

`;

// Add click handler for the card (excluding delete button)

card.addEventListener('click', async (e) => {

// Don't select academic year if delete button was clicked

if (e.target.closest('.delete-academic-year-btn')) {

return;

}

// If already editing this academic year, cancel edit mode

if (editModeId === docSnap.id) {

clearForm();

return;

}

// Remove selected class from all other cards

document.querySelectorAll('.academic-year-card.selected').forEach(otherCard => {

otherCard.classList.remove('selected');

});

// Add selected class to this card

card.classList.add('selected');

editModeId = docSnap.id;

academicYearIdInput.value = data.academicYearId || '';

academicYearIdInput.disabled = false;

schoolYearIdInput.value = data.schoolYearId || '';

// Load school year dates if schoolYearId exists
if (data.schoolYearId) {
  try {
    const schoolYearDoc = await getDoc(doc(db, 'schoolyear', data.schoolYearId));
    if (schoolYearDoc.exists()) {
      const schoolYearData = schoolYearDoc.data();
      
      // Set start date
      if (schoolYearData.startDate) {
        const startDate = schoolYearData.startDate.toDate ? schoolYearData.startDate.toDate() : new Date(schoolYearData.startDate);
        schoolYearStartInput.value = startDate.toISOString().split('T')[0];
      }
      
      // Set end date
      if (schoolYearData.endDate) {
        const endDate = schoolYearData.endDate.toDate ? schoolYearData.endDate.toDate() : new Date(schoolYearData.endDate);
        schoolYearEndInput.value = endDate.toISOString().split('T')[0];
      }
    }
  } catch (error) {
    console.warn('Could not load school year dates:', error);
  }
}

semestersContainer.innerHTML = '';

if (data.semesters && data.semesters.length) {

for (const sem of data.semesters) {

const semBlock = createSemesterBlock();

semBlock.querySelector('.semester-id').value = sem.semId || '';

semBlock.querySelector('.semester-label').value = sem.semLabel || '';

semBlock.querySelector('.semester-start').value = sem.semStart

? new Date(sem.semStart.toDate ? sem.semStart.toDate() : sem.semStart).toISOString().split('T')[0]

: '';

semBlock.querySelector('.semester-end').value = sem.semEnd

? new Date(sem.semEnd.toDate ? sem.semEnd.toDate() : sem.semEnd).toISOString().split('T')[0]

: '';

const termsContainer = semBlock.querySelector('.terms-container');

if (sem.terms && sem.terms.length) {

for (const term of sem.terms) {

const termBlock = createTermBlock();

termBlock.querySelector('.term-id').value = term.termId || '';

termBlock.querySelector('.term-name').value = term.termName || '';

termsContainer.appendChild(termBlock);

}

}

semestersContainer.appendChild(semBlock);

}

}

enterEditMode();

});

// Add delete button handler

const deleteBtn = card.querySelector('.delete-academic-year-btn');

deleteBtn.addEventListener('click', async (e) => {

e.stopPropagation(); // Prevent card selection

await deleteAcademicYear(docSnap.id);

});

academicYearsGrid.appendChild(card);

}

} catch (error) {

console.error(error);

academicYearsGrid.innerHTML = '<p class="muted">Failed to load academic years.</p>';

}

}

// --- Initial Load ---

loadAcademicYears();

// --- User Dropdown ---

const userBtn = document.getElementById('userIconBtn');

const userDropdown = document.getElementById('userDropdown');

const userNameE = document.getElementById('user-name');

const userEmail = document.getElementById('user-email');

const userRole = document.getElementById('user-role');

const signOutBtn = document.getElementById('signOutBtn');

// Toggle dropdown on click

userBtn.addEventListener('click', (e) => {

e.stopPropagation();

userDropdown.classList.toggle('show');

});

// Close dropdown when clicking outside

document.addEventListener('click', () => {

userDropdown.classList.remove('show');

});

// Close dropdown with Escape key

document.addEventListener('keydown', (e) => {

if (e.key === 'Escape') {

userDropdown.classList.remove('show');

}

});

// --- Firebase Auth: Show current user info ---

onAuthStateChanged(auth, async (user) => {

if (user) {

try {

const usersCol = collection(db, 'users');

const q = query(usersCol, where('email', '==', user.email));

const querySnapshot = await getDocs(q);

if (!querySnapshot.empty) {

const userData = querySnapshot.docs[0].data();

userNameE.textContent = user.displayName || 'User Name:';

userEmail.textContent = userData.email || 'N/A';

userRole.textContent = `Role: ${userData.role || 'N/A'}`;

} else {

userNameE.textContent = user.displayName || 'User Name:';

userEmail.textContent = 'N/A';

userRole.textContent = 'Role: N/A';

}

} catch (err) {

console.error('Error fetching user:', err);

userNameE.textContent = user.displayName || 'User Name:';

userEmail.textContent = 'N/A';

userRole.textContent = 'Role: N/A';

}

} else {

userNameE.textContent = 'User Name:';

userEmail.textContent = 'N/A';

userRole.textContent = 'Role: N/A';

}

});

// --- Sign out ---

signOutBtn.addEventListener('click', async () => {

try {

await signOut(auth);

window.location.href = 'login.html';

} catch (err) {

console.error('Error signing out:', err);

}

});