import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, collection, getDocs, query, where, addDoc, doc, getDoc, setDoc, deleteDoc 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { 
  getAuth, onAuthStateChanged, signOut 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getUserRole, applySidebarRestrictions, applyPageRestrictions, applyImmediateRestrictions, removeImmediateRestrictions, clearRoleCache } from './role-manager.js';

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
const classesGrid = document.getElementById('classesGrid');
const suggestedList = classesGrid; // Use classesGrid as the main container
const suggestedCount = document.getElementById('suggested-count');
const subjectsGrid = document.getElementById('subjectsGrid');
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userRoleEl = document.getElementById('user-role');
const userIconBtn = document.getElementById('userIconBtn');
const userDropdown = document.getElementById('userDropdown');

// Subjects section elements
const subjectsSection = document.getElementById('subjectsSection');
const selectedClassNameSpan = document.getElementById('selectedClassName');
const addSubjectBtn = document.getElementById('addSubjectBtn');

// Add subject form elements
const addSubjectFormSection = document.getElementById('addSubjectForm');
const addSubjectClassName = document.getElementById('addSubjectClassName');
const selectedClassIdInput = document.getElementById('selectedClassId');
const subjectForm = document.getElementById('subjectForm');
const subjectIdInput = document.getElementById('subjectIdInput');
const subjectNameInput = document.getElementById('subjectNameInput');
const cancelAddSubject = document.getElementById('cancelAddSubject');

// Teacher form inputs
const teacherEmailInput = document.getElementById('teacherSelect');
const newTeacherNameInput = document.getElementById('newTeacherName');
const newTeacherEmailInput = document.getElementById('newTeacherEmail');

// Create Class form inputs
const createClassForm = document.getElementById('createClassForm');
const classIdInput = document.getElementById('classIdInput');

// Academic Year form inputs
const academicYearSelect = document.getElementById('academicYearSelect');
const newAcademicYearIdInput = document.getElementById('newAcademicYearId');
const newAcademicYearNameInput = document.getElementById('newAcademicYearName');

// User dropdown toggle
userIconBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  userDropdown.classList.toggle('show');
});
document.addEventListener('click', () => userDropdown.classList.remove('show'));

// Logout
document.getElementById('signOutBtn').addEventListener('click', () => {
  signOut(auth).then(() => {
    window.location.href = 'index.html';
  }).catch(error => {
    console.error('Log out error:', error);
    alert('Failed to log out. Please try again.');
  });
});

// Fetch teacher name by email
async function getTeacherNameByEmail(email) {
  if (!email) return 'No teacher assigned';
  try {
    const teachersCol = collection(db, 'teachers');
    const q = query(teachersCol, where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return email;
    return snap.docs[0].data().name || email;
  } catch (err) {
    console.error('Error fetching teacher name:', err);
    return email;
  }
}

// Load teachers dropdown
export async function loadTeachersIntoDropdown() {
  if (!teacherEmailInput) return;
  teacherEmailInput.innerHTML = `<option value="">Select Teacher</option>`;
  try {
    const teachersCol = collection(db, 'teachers');
    const teachersSnap = await getDocs(teachersCol);
    teachersSnap.forEach(doc => {
      const t = doc.data();
      const option = document.createElement('option');
      option.value = t.email;
      option.textContent = t.name || t.email;
      teacherEmailInput.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load teachers:', error);
  }
}

// Load academic years dropdown
export async function loadAcademicYearsIntoDropdown(selectedValue = '') {
  if (!academicYearSelect) return;
  academicYearSelect.innerHTML = `<option value="">Select Academic Year</option>`;
  try {
    const acadCol = collection(db, 'academicyear'); // make sure this matches your collection name
    const acadSnap = await getDocs(acadCol);

    if (acadSnap.empty) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No academic years found';
      academicYearSelect.appendChild(option);
      return;
    }

    acadSnap.forEach(doc => {
      const value = doc.id; // use the document ID as academic ID
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value; // show only the academic ID
      if (value === selectedValue) option.selected = true;
      academicYearSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load academic years:', error);
    academicYearSelect.innerHTML = `<option value="">Error loading academic years</option>`;
  }
}

// Create subject card
async function createSubjectCard(subject, classId) {
  const teacherName = await getTeacherNameByEmail(subject.assignedTeacherEmail);
  const link = document.createElement('a');
  link.className = 'subject-card';
  link.href = `subject-details.html?subjectId=${encodeURIComponent(subject.subjectId)}&classId=${encodeURIComponent(classId)}`;
  link.style.textDecoration = 'none';
  link.style.color = 'inherit';
  link.innerHTML = `
    <h4>${subject.name}</h4>
    <div class="subject-id">${subject.subjectId}</div>
    <div class="teacher-info">${teacherName}</div>
  `;
  return link;
}

// Delete class function
async function deleteClass(classId) {
  const user = auth.currentUser;
  if (!user) {
    alert('Please sign in to delete classes.');
    return;
  }

  // Check user role
  const userRole = await getUserRole(user.email, db);
  if (userRole !== 'admin') {
    alert('Only administrators can delete classes.');
    return;
  }

  // Confirm deletion
  const confirmDelete = confirm(`Are you sure you want to delete class "${classId}"?\n\nThis will also remove all subjects linked to this class. This action cannot be undone.`);
  if (!confirmDelete) {
    return;
  }

  try {
    console.log(`Deleting class: ${classId}`);

    // Find all documents in the classes collection with this classId
    const classesQuery = query(collection(db, 'classes'), where('classId', '==', classId));
    const classesSnap = await getDocs(classesQuery);

    if (classesSnap.empty) {
      alert('Class not found.');
      return;
    }

    // Collect all subject IDs linked to this class
    const subjectIds = new Set();
    classesSnap.forEach(doc => {
      const data = doc.data();
      if (data.subjectId) {
        subjectIds.add(data.subjectId);
      }
    });

    // Delete all class documents
    const deletePromises = [];
    classesSnap.forEach(doc => {
      deletePromises.push(deleteDoc(doc.ref));
    });

    // Delete all subjects linked to this class
    if (subjectIds.size > 0) {
      console.log(`Deleting ${subjectIds.size} subjects linked to class ${classId}:`, Array.from(subjectIds));
      
      for (const subjectId of subjectIds) {
        const subjectDocRef = doc(db, 'subjects', subjectId);
        deletePromises.push(deleteDoc(subjectDocRef));
      }
    }

    await Promise.all(deletePromises);
    console.log(`Successfully deleted class ${classId} and ${subjectIds.size} associated subjects`);

    // Hide subjects section if the deleted class was selected
    const selectedClassId = selectedClassIdInput ? selectedClassIdInput.value : '';
    if (selectedClassId === classId) {
      if (subjectsSection) subjectsSection.style.display = 'none';
      if (addSubjectFormSection) addSubjectFormSection.classList.remove('show');
      if (selectedClassIdInput) selectedClassIdInput.value = '';
      if (selectedClassNameSpan) selectedClassNameSpan.textContent = '';
      if (addSubjectClassName) addSubjectClassName.textContent = '';
      if (subjectsGrid) subjectsGrid.innerHTML = `<p class="muted">Select a class to view its subjects.</p>`;
    }

    // Reload classes
    const role = await getUserRole(user.email, db);
    await loadClasses(user.email, role);

    alert(`Class "${classId}" has been successfully deleted.`);

  } catch (error) {
    console.error('Error deleting class:', error);
    alert('Failed to delete class: ' + error.message);
  }
}

// Add teacher welcome message
function addTeacherWelcomeMessage(userName) {
  // Remove existing welcome message if it exists
  const existingMessage = document.querySelector('.teacher-welcome');
  if (existingMessage) {
    existingMessage.remove();
  }

  // Create welcome message
  const welcomeDiv = document.createElement('div');
  welcomeDiv.className = 'teacher-welcome';
  welcomeDiv.innerHTML = `
    <h3><i class="fa-solid fa-chalkboard-user"></i> Welcome, ${userName}!</h3>
    <p>Here are the classes assigned to you. Click on a class to view and manage its subjects.</p>
  `;

  // Insert before the grid container
  const gridContainer = document.querySelector('.grid-container');
  if (gridContainer) {
    gridContainer.parentNode.insertBefore(welcomeDiv, gridContainer);
  }
}

// getUserRole function is now imported from role-manager.js

// Track the current loading request to prevent race conditions
let currentLoadingClassId = null;
let loadingRequestId = 0;

// Load subjects for a class
async function loadSubjectsForClass(classId) {
  if (!subjectsGrid) return;
  
  // Generate a unique request ID for this load operation
  const requestId = ++loadingRequestId;
  currentLoadingClassId = classId;
  
  // Show loading state immediately with spinner
  subjectsGrid.innerHTML = `
    <div class="empty-state">
      <div class="loading-spinner"></div>
      <h3>Loading Subjects</h3>
      <p>Loading subjects for ${classId}...</p>
    </div>
  `;
  
  if (!classId) {
    // Only update if this is still the current request
    if (currentLoadingClassId === classId && requestId === loadingRequestId) {
      subjectsGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-exclamation-triangle"></i>
          <h3>No Class ID</h3>
          <p>No class ID provided</p>
        </div>
      `;
    }
    return;
  }
  
  try {
    // Get current user and role for filtering
    const user = auth.currentUser;
    const userRole = user ? await getUserRole(user.email, db) : null;
    
    const classesQuery = query(collection(db, 'classes'), where('classId', '==', classId));
    const classesSnap = await getDocs(classesQuery);
    
    // Check if this request is still current before proceeding
    if (currentLoadingClassId !== classId || requestId !== loadingRequestId) {
      return; // Abort this request as a newer one has started
    }
    
    if (classesSnap.empty) {
      subjectsGrid.innerHTML = `<p class="muted">No subjects linked to this class.</p>`;
      return;
    }

    const subjectIds = [];
    classesSnap.forEach(doc => {
      const data = doc.data();
      if (data.subjectId) {
        // For teachers, only include subjects assigned to them
        if (userRole === 'teacher') {
          if (data.teacherEmail === user.email) {
            subjectIds.push(data.subjectId.toLowerCase());
          }
        } else {
          // For admins, include all subjects
          subjectIds.push(data.subjectId.toLowerCase());
        }
      }
    });

    // Check again before continuing
    if (currentLoadingClassId !== classId || requestId !== loadingRequestId) {
      return;
    }

    if (subjectIds.length === 0) {
      const message = userRole === 'teacher' 
        ? 'No subjects assigned to you in this class.'
        : 'No subject IDs found for this class.';
      subjectsGrid.innerHTML = `<p class="muted">${message}</p>`;
      return;
    }

    const allSubjectsSnap = await getDocs(collection(db, 'subjects'));
    
    // Check again after the async operation
    if (currentLoadingClassId !== classId || requestId !== loadingRequestId) {
      return;
    }
    
    let matchedSubjects = [];
    allSubjectsSnap.forEach(doc => {
      const subjectData = doc.data();
      if (subjectIds.includes((subjectData.subjectId || '').toLowerCase())) {
        // Additional filter for teachers - double check the assignment
        if (userRole === 'teacher') {
          if (subjectData.assignedTeacherEmail === user.email) {
            matchedSubjects.push(subjectData);
          }
        } else {
          // For admins, include all matched subjects
          matchedSubjects.push(subjectData);
        }
      }
    });

    // Final check before updating the UI
    if (currentLoadingClassId !== classId || requestId !== loadingRequestId) {
      return;
    }

    if (matchedSubjects.length === 0) {
      const message = userRole === 'teacher' 
        ? 'No subjects assigned to you in this class.'
        : 'No matching subjects found for this class.';
      subjectsGrid.innerHTML = `<p class="muted">${message}</p>`;
      return;
    }

    // Clear the grid and add subjects
    subjectsGrid.innerHTML = '';
    for (const subject of matchedSubjects) {
      // Check before each card creation
      if (currentLoadingClassId !== classId || requestId !== loadingRequestId) {
        return;
      }
      
      const card = await createSubjectCard(subject, classId);
      
      // Final check before appending
      if (currentLoadingClassId === classId && requestId === loadingRequestId) {
        subjectsGrid.appendChild(card);
      }
    }
  } catch (err) {
    console.error('Error loading subjects:', err);
    // Only show error if this is still the current request
    if (currentLoadingClassId === classId && requestId === loadingRequestId) {
      subjectsGrid.innerHTML = `<p class="muted">Error loading subjects.</p>`;
    }
  }
}

// Load classes
async function loadClasses(userEmail, role) {
  if (!classesGrid) return;
  
  // Show loading state
  classesGrid.innerHTML = `
    <div class="empty-state">
      <div class="loading-spinner"></div>
      <h3>Loading Classes</h3>
      <p>Please wait...</p>
    </div>
  `;
  
  if (suggestedCount) suggestedCount.textContent = '';
  if (!role) {
    classesGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-book"></i>
        <h3>Role not found</h3>
        <p>Unable to determine your role</p>
      </div>
    `;
    if (userRoleEl) userRoleEl.textContent = 'Role: N/A';
    return;
  }
  if (userRoleEl) userRoleEl.textContent = `Role: ${role}`;

  let classesQuery;
  if (role === 'admin') {
    classesQuery = query(collection(db, 'classes'));
  } else if (role === 'teacher') {
    classesQuery = query(collection(db, 'classes'), where('teacherEmail', '==', userEmail));
  } else {
    classesGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-book"></i>
        <h3>No Access</h3>
        <p>No classes available for your role</p>
      </div>
    `;
    return;
  }

  try {
    const classesSnapshot = await getDocs(classesQuery);
    if (classesSnapshot.empty) {
      classesGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-book"></i>
          <h3>No Classes</h3>
          <p>Create your first class to get started</p>
        </div>
      `;
      return;
    }

    const uniqueClasses = new Map();
    classesSnapshot.forEach(doc => {
      const data = doc.data();
      const cId = data.classId || doc.id;
      if (!uniqueClasses.has(cId)) uniqueClasses.set(cId, data);
    });

    // Clear loading state and add classes
    classesGrid.innerHTML = '';
    uniqueClasses.forEach(classData => {
      const div = document.createElement('div');
      div.className = 'class-card';
      div.setAttribute('data-class-id', classData.classId);
      div.innerHTML = `
        <button class="delete-class-btn" data-class-id="${classData.classId}" title="Delete Class">
          <i class="fa-solid fa-trash"></i>
        </button>
        <h5>${classData.classId}</h5>
        <div class="card-detail">
          <span class="label">Academic Year:</span>
          <span class="value">${classData.academicId || 'N/A'}</span>
        </div>
      `;
      
      // Add click handler for the card (excluding delete button)
      div.addEventListener('click', (e) => {
        // Don't select class if delete button was clicked
        if (e.target.closest('.delete-class-btn')) {
          return;
        }
        
        // Remove selected class from all cards
        document.querySelectorAll('.class-card').forEach(card => {
          card.classList.remove('selected');
        });
        // Add selected class to clicked card
        div.classList.add('selected');
        
        // Show subjects section
        if (subjectsSection) subjectsSection.style.display = 'block';
        if (selectedClassIdInput) selectedClassIdInput.value = classData.classId;
        if (selectedClassNameSpan) selectedClassNameSpan.textContent = classData.classId;
        if (addSubjectClassName) addSubjectClassName.textContent = classData.classId;
        
        loadSubjectsForClass(classData.classId);
      });

      // Add delete button handler
      const deleteBtn = div.querySelector('.delete-class-btn');
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent card selection
        await deleteClass(classData.classId);
      });

      classesGrid.appendChild(div);
    });

    if (suggestedCount) suggestedCount.textContent = uniqueClasses.size;
  } catch (err) {
    console.error('Error loading classes:', err);
    classesGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <h3>Error</h3>
        <p>Failed to load classes</p>
      </div>
    `;
  }
}

// Add Subject button event handler
if (addSubjectBtn) {
  addSubjectBtn.addEventListener('click', () => {
    console.log('Add Subject button clicked');
    if (addSubjectFormSection) {
      addSubjectFormSection.classList.add('show');
      console.log('Form shown');
    } else {
      console.error('addSubjectFormSection not found');
    }
  });
} else {
  console.error('addSubjectBtn not found');
}

// Cancel Add Subject button event handler
if (cancelAddSubject) {
  cancelAddSubject.addEventListener('click', () => {
    console.log('Cancel button clicked');
    if (addSubjectFormSection) {
      addSubjectFormSection.classList.remove('show');
    }
    if (subjectForm) {
      subjectForm.reset();
    }
  });
} else {
  console.error('cancelAddSubject not found');
}

// Add subject form submission
if (subjectForm) {
  subjectForm.addEventListener('submit', async (e) => {
    console.log('Subject form submitted');
    e.preventDefault();
    
    // Get form values
    const subjectId = subjectIdInput ? subjectIdInput.value.trim() : '';
    const subjectName = subjectNameInput ? subjectNameInput.value.trim() : '';
    const classId = selectedClassIdInput ? selectedClassIdInput.value : '';
    const selectedTeacherEmail = teacherEmailInput ? teacherEmailInput.value : '';
    const newTeacherName = newTeacherNameInput ? newTeacherNameInput.value.trim() : '';
    const newTeacherEmail = newTeacherEmailInput ? newTeacherEmailInput.value.trim() : '';

    console.log('Form values:', {
      subjectId,
      subjectName,
      classId,
      selectedTeacherEmail,
      newTeacherName,
      newTeacherEmail
    });

    // Validate required fields
    if (!classId) {
      alert('No class selected. Please select a class first.');
      return;
    }
    
    if (!subjectId || !subjectName) {
      alert('Please fill out Subject ID and Subject Name.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('Please sign in to add subjects.');
      return;
    }

    try {
      const userRole = await getUserRole(user.email, db);
      console.log('User role:', userRole);
      
      let teacherEmailToAssign = '';

      // For teachers, automatically assign themselves
      if (userRole === 'teacher') {
        teacherEmailToAssign = user.email;
        console.log('Teacher role - assigning self:', teacherEmailToAssign);
      } else {
        // For admins, handle teacher assignment
        if (selectedTeacherEmail) {
          // Use existing teacher
          teacherEmailToAssign = selectedTeacherEmail;
          console.log('Using existing teacher:', teacherEmailToAssign);
        } else if (newTeacherName && newTeacherEmail) {
          // Create new teacher
          console.log('Creating new teacher:', newTeacherName, newTeacherEmail);
          const teacherDocRef = doc(db, 'teachers', newTeacherEmail);
          const teacherDocSnap = await getDoc(teacherDocRef);
          if (!teacherDocSnap.exists()) {
            await setDoc(teacherDocRef, { email: newTeacherEmail, name: newTeacherName });
            console.log('New teacher created');
            await loadTeachersIntoDropdown();
          }
          teacherEmailToAssign = newTeacherEmail;
        } else {
          // No teacher assignment - this is optional
          console.log('No teacher assigned');
          teacherEmailToAssign = '';
        }
      }

      console.log('Final teacher email to assign:', teacherEmailToAssign);

      // Create or update subject
      const subjectDocRef = doc(db, 'subjects', subjectId);
      const subjectDocSnap = await getDoc(subjectDocRef);
      
      if (!subjectDocSnap.exists()) {
        await setDoc(subjectDocRef, { 
          subjectId, 
          name: subjectName, 
          assignedTeacherEmail: teacherEmailToAssign 
        });
        console.log('New subject created');
      } else {
        await setDoc(subjectDocRef, { 
          assignedTeacherEmail: teacherEmailToAssign, 
          name: subjectName 
        }, { merge: true });
        console.log('Subject updated');
      }

      // Get class academic ID
      let classAcademicId = '';
      const classQuery = query(collection(db, 'classes'), where('classId', '==', classId));
      const classSnap = await getDocs(classQuery);
      if (!classSnap.empty) {
        classAcademicId = classSnap.docs[0].data().academicId || '';
      }

      // Link subject to class
      const duplicateQuery = query(collection(db, 'classes'), 
        where('classId', '==', classId), 
        where('subjectId', '==', subjectId)
      );
      const duplicateSnap = await getDocs(duplicateQuery);
      
      if (duplicateSnap.empty) {
        await addDoc(collection(db, 'classes'), { 
          classId, 
          subjectId, 
          academicId: classAcademicId, 
          teacherEmail: teacherEmailToAssign 
        });
        console.log('Subject linked to class');
      } else {
        console.log('Subject already linked to class');
      }

      alert(`Subject "${subjectName}" added to class ${classId}`);
      
      // Reset form and hide it
      subjectForm.reset();
      if (addSubjectFormSection) {
        addSubjectFormSection.classList.remove('show');
      }
      
      // Reload subjects for the class
      loadSubjectsForClass(classId);
      
    } catch (err) {
      console.error('Error adding subject:', err);
      alert('Failed to add subject: ' + err.message);
    }
  });
} else {
  console.error('subjectForm not found');
}

// Create Class form submission
if (createClassForm) {
  createClassForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const classId = classIdInput.value.trim();
    const selectedAcademicId = academicYearSelect ? academicYearSelect.value : '';
    const newAcademicYearId = newAcademicYearIdInput ? newAcademicYearIdInput.value.trim() : '';
    const newAcademicYearName = newAcademicYearNameInput ? newAcademicYearNameInput.value.trim() : '';

    if (!classId) {
      alert('Please enter a Class ID.');
      return;
    }
    if (!selectedAcademicId && (!newAcademicYearId || !newAcademicYearName)) {
      alert('Please select an existing academic year or create a new one.');
      return;
    }

    try {
      let academicIdToAssign = '';
      if (selectedAcademicId) {
        academicIdToAssign = selectedAcademicId;
      } else {
        const acadDocRef = doc(db, 'academicYears', newAcademicYearId);
        const acadDocSnap = await getDoc(acadDocRef);
        if (!acadDocSnap.exists()) {
          await setDoc(acadDocRef, { 
            schoolYearId: newAcademicYearName, 
            termId: 'TBD', 
            semesterId: 'TBD' 
          });
        }
        academicIdToAssign = newAcademicYearId;
      }

      const classesCol = collection(db, 'classes');
      const q = query(classesCol, where('classId', '==', classId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        alert(`Class with ID "${classId}" already exists.`);
        return;
      }

      await addDoc(classesCol, { classId, academicId: academicIdToAssign });
      alert(`Class ${classId} created successfully!`);
      createClassForm.reset();

      // Reload academic years dropdown and auto-select the newly created
      await loadAcademicYearsIntoDropdown(academicIdToAssign);

      const user = auth.currentUser;
      if (user) {
        const role = await getUserRole(user.email, db);
        await loadClasses(user.email, role);
      }
    } catch (error) {
      console.error('Error creating class:', error);
      alert('Failed to create class.');
    }
  });
}

// Auth state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userNameEl.textContent = user.displayName || 'User Name:';
    userEmailEl.textContent = user.email;
    const role = await getUserRole(user.email, db);
    
    // Store user info in localStorage for immediate restrictions
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userRole', role || '');
    
    // Apply teacher-specific UI layout
    const contentLayout = document.querySelector('.content-layout');
    if (role === 'teacher') {
      if (contentLayout) {
        contentLayout.classList.add('teacher-layout');
      }
      // Add teacher welcome message
      addTeacherWelcomeMessage(user.displayName || user.email);
    } else {
      // Remove immediate restrictions if user is admin
      const immediateStyle = document.getElementById('immediate-teacher-restrictions');
      if (immediateStyle) {
        immediateStyle.remove();
      }
      if (contentLayout) {
        contentLayout.classList.remove('teacher-layout');
      }
      // Remove teacher welcome message if it exists
      const welcomeMessage = document.querySelector('.teacher-welcome');
      if (welcomeMessage) {
        welcomeMessage.remove();
      }
    }
    
    // Apply role-based restrictions
    applySidebarRestrictions(role);
    applyPageRestrictions(role, 'classes');
    
    await loadClasses(user.email, role);
    if (addSubjectFormSection) addSubjectFormSection.style.display = 'none';
    if (subjectsGrid) subjectsGrid.innerHTML = `<p class="muted">Select a class to view its subjects.</p>`;
    await loadTeachersIntoDropdown();
    await loadAcademicYearsIntoDropdown();
  } else {
    // Clear localStorage on logout
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    clearRoleCache();
    
    // Reset layout
    const contentLayout = document.querySelector('.content-layout');
    if (contentLayout) {
      contentLayout.classList.remove('teacher-layout');
    }
    
    userNameEl.textContent = 'User Name';
    userEmailEl.textContent = 'user@example.com';
    userRoleEl.textContent = 'Role: N/A';
    if (suggestedList) suggestedList.innerHTML = `<p class="muted">Please sign in to see your classes.</p>`;
    if (subjectsGrid) subjectsGrid.innerHTML = '';
    if (addSubjectFormSection) addSubjectFormSection.style.display = 'none';
  }
});
