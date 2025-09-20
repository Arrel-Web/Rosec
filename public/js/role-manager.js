// Role Management Utility
import { 
  getFirestore, collection, getDocs, query, where 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Cache for user roles to avoid repeated database calls
const roleCache = new Map();

// Get user role from Firestore with caching
export async function getUserRole(email, db) {
  try {
    // Check cache first
    if (roleCache.has(email)) {
      return roleCache.get(email);
    }

    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    const role = querySnapshot.empty ? null : (querySnapshot.docs[0].data().role || null);
    
    // Cache the result
    roleCache.set(email, role);
    
    return role;
  } catch (err) {
    console.error('Error getting user role:', err);
    return null;
  }
}

// Clear role cache (useful for logout)
export function clearRoleCache() {
  roleCache.clear();
}

// Apply immediate restrictions before page load (for teachers)
export function applyImmediateRestrictions() {
  // Hide teacher-restricted elements immediately with CSS
  const style = document.createElement('style');
  style.id = 'teacher-restrictions';
  style.textContent = `
    /* Hide teacher-restricted elements immediately */
    .teacher-restricted {
      display: none !important;
    }
    
    /* Hide specific navigation items for teachers */
    a[href*="teachers.html"],
    a[href*="academic-periods.html"] {
      display: none !important;
    }
    
    /* Hide create class section */
    #createClassSection {
      display: none !important;
    }
    
    /* Hide teacher assignment fields in add subject form */
    #teacherSelect,
    label[for="teacherSelect"],
    #newTeacherName,
    #newTeacherEmail,
    .teacher-assignment-section {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

// Remove immediate restrictions (for admins)
export function removeImmediateRestrictions() {
  const style = document.getElementById('teacher-restrictions');
  if (style) {
    style.remove();
  }
}

// Apply role-based restrictions to sidebar navigation
export function applySidebarRestrictions(role) {
  const sidebar = document.querySelector('.sidebar-nav');
  if (!sidebar) return;

  if (role === 'teacher') {
    // Keep the immediate restrictions in place
    const restrictedItems = [
      'teachers.html',      // Cannot see teacher list
      'academic-periods.html' // Cannot see academic periods
    ];

    const navLinks = sidebar.querySelectorAll('a');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (restrictedItems.some(item => href && href.includes(item))) {
        link.style.display = 'none';
        link.classList.add('teacher-restricted');
      }
    });
  } else {
    // For non-teachers, remove restrictions
    removeImmediateRestrictions();
    const navLinks = sidebar.querySelectorAll('a');
    navLinks.forEach(link => {
      link.style.display = '';
      link.classList.remove('teacher-restricted');
    });
  }
}

// Apply role-based restrictions to page elements
export function applyPageRestrictions(role, pageName) {
  if (role !== 'teacher') return; // Only apply restrictions for teachers

  switch (pageName) {
    case 'classes':
      applyClassesRestrictions();
      break;
    case 'students':
      applyStudentsRestrictions();
      break;
    case 'dashboard':
      applyDashboardRestrictions();
      break;
    case 'teachers':
      // Teachers should not access this page at all
      redirectToUnauthorized();
      break;
    case 'academic-periods':
      // Teachers should not access this page at all
      redirectToUnauthorized();
      break;
  }
}

// Restrictions for classes page (teachers)
function applyClassesRestrictions() {
  // Hide create class section
  const createClassSection = document.getElementById('createClassSection');
  if (createClassSection) {
    createClassSection.style.display = 'none';
  }

  // Modify add subject form for teachers
  const addSubjectFormSection = document.getElementById('addSubjectFormSection');
  if (addSubjectFormSection) {
    // Hide teacher assignment fields since teachers can only assign themselves
    const teacherSelectLabel = addSubjectFormSection.querySelector('label[for="teacherSelect"]');
    const teacherSelect = document.getElementById('teacherSelect');
    const newTeacherParagraph = addSubjectFormSection.querySelector('p');
    const newTeacherName = document.getElementById('newTeacherName');
    const newTeacherEmail = document.getElementById('newTeacherEmail');
    
    if (teacherSelectLabel) teacherSelectLabel.style.display = 'none';
    if (teacherSelect) teacherSelect.style.display = 'none';
    if (newTeacherParagraph && newTeacherParagraph.textContent.includes('Or add new teacher')) {
      newTeacherParagraph.style.display = 'none';
    }
    if (newTeacherName) newTeacherName.style.display = 'none';
    if (newTeacherEmail) newTeacherEmail.style.display = 'none';
    
    // Update form title to be clearer for teachers
    const formTitle = addSubjectFormSection.querySelector('h3');
    if (formTitle) {
      formTitle.innerHTML = 'Add New Subject to <span id="selectedClassName"></span> (You will be assigned as teacher)';
    }
  }
}

// Restrictions for students page (teachers)
function applyStudentsRestrictions() {
  // Teachers can add/delete students, so no restrictions needed here
  // But we might want to limit them to only see students from their classes
}

// Restrictions for dashboard (teachers)
function applyDashboardRestrictions() {
  // Teachers can create exams, so no major restrictions needed
  // But we might want to filter exams to only show their subjects
}

// Redirect to unauthorized page or dashboard
function redirectToUnauthorized() {
  alert('Access denied. You do not have permission to view this page.');
  window.location.href = 'dashboard.html';
}

// Update user role display
export function updateUserRoleDisplay(role) {
  const userRoleEl = document.getElementById('user-role');
  if (userRoleEl) {
    userRoleEl.textContent = `Role: ${role || 'N/A'}`;
  }
}

// Check if user has permission for specific action
export function hasPermission(role, action) {
  const permissions = {
    admin: [
      'create_class', 'delete_class', 'view_all_classes',
      'add_teacher', 'delete_teacher', 'view_teachers',
      'create_academic_period', 'view_academic_periods',
      'add_student', 'delete_student', 'view_all_students',
      'add_subject', 'delete_subject', 'view_all_subjects',
      'create_exam', 'delete_exam', 'view_all_exams'
    ],
    teacher: [
      'view_assigned_classes', 'add_student', 'delete_student',
      'add_subject', 'view_assigned_subjects',
      'create_exam', 'view_assigned_exams'
    ]
  };

  return permissions[role]?.includes(action) || false;
}