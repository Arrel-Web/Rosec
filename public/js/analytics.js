// Analytics Dashboard JavaScript
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Firebase configuration
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
const auth = getAuth(app);
const db = getFirestore(app);

// Global variables
let currentUser = null;
let userRole = null;
let scoreChart = null;
let gradeChart = null;

// Initialize the analytics dashboard
document.addEventListener('DOMContentLoaded', function() {
  initializeAuth();
  setupEventListeners();
  initializeCharts();
});

// Authentication
function initializeAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserProfile();
      await loadAnalyticsData();
    } else {
      window.location.href = 'index.html';
    }
  });
}

async function loadUserProfile() {
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      userRole = userData.role || 'teacher';
      
      document.getElementById('user-name').textContent = `User Name: ${userData.name || currentUser.email}`;
      document.getElementById('user-email').textContent = currentUser.email;
      document.getElementById('user-role').textContent = `Role: ${userRole}`;
      
      // Apply role-based restrictions
      applyRoleRestrictions();
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
  }
}

function applyRoleRestrictions() {
  if (userRole === 'teacher') {
    // Hide admin-only navigation items
    const teachersNav = document.getElementById('teachers-nav');
    const academicPeriodsNav = document.getElementById('academic-periods-nav');
    
    if (teachersNav) teachersNav.style.display = 'none';
    if (academicPeriodsNav) academicPeriodsNav.style.display = 'none';
  }
}

// Event Listeners
function setupEventListeners() {
  // Sign out
  document.getElementById('signOutBtn').addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  });

  // User dropdown
  const userIconBtn = document.getElementById('userIconBtn');
  const userDropdown = document.getElementById('userDropdown');
  
  userIconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    userDropdown.classList.remove('show');
  });

  // Period filter
  document.getElementById('periodFilter').addEventListener('change', handlePeriodChange);
  
  // Export button
  document.getElementById('exportBtn').addEventListener('click', exportReport);
  
  // Trend period
  document.getElementById('trendPeriod').addEventListener('change', updateScoreChart);
}

function handlePeriodChange() {
  const periodFilter = document.getElementById('periodFilter');
  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  
  if (periodFilter.value === 'custom') {
    startDate.style.display = 'inline-block';
    endDate.style.display = 'inline-block';
  } else {
    startDate.style.display = 'none';
    endDate.style.display = 'none';
  }
  
  loadAnalyticsData();
}

// Analytics Data Loading
async function loadAnalyticsData() {
  try {
    showLoadingState();
    
    const [examsData, studentsData, resultsData] = await Promise.all([
      loadExamsData(),
      loadStudentsData(),
      loadResultsData()
    ]);
    
    updateStatistics(examsData, studentsData, resultsData);
    updateCharts(resultsData);
    updatePerformanceLists(examsData, resultsData);
    updateRecentActivity();
    
    hideLoadingState();
  } catch (error) {
    console.error('Error loading analytics data:', error);
    showErrorState();
  }
}

async function loadExamsData() {
  try {
    // Load from both 'exams' and 'questions' collections
    const [examsSnapshot, questionsSnapshot] = await Promise.all([
      getDocs(collection(db, 'exams')),
      getDocs(collection(db, 'questions'))
    ]);
    
    let allExams = [];
    
    // Add exams from 'exams' collection
    examsSnapshot.docs.forEach(doc => {
      allExams.push({ id: doc.id, ...doc.data(), source: 'exams' });
    });
    
    // Add exams from 'questions' collection
    questionsSnapshot.docs.forEach(doc => {
      allExams.push({ id: doc.id, ...doc.data(), source: 'questions' });
    });
    
    // Apply role-based filtering
    if (userRole === 'teacher') {
      allExams = allExams.filter(exam => 
        exam.createdBy === currentUser.email || 
        exam.teacherId === currentUser.uid
      );
    }
    
    return allExams;
  } catch (error) {
    console.error('Error loading exams data:', error);
    return [];
  }
}

async function loadStudentsData() {
  try {
    const studentsRef = collection(db, 'students');
    let studentsQuery = studentsRef;
    
    // If teacher, only load students from their classes
    if (userRole === 'teacher') {
      // Get teacher's classes first
      const classesSnapshot = await getDocs(
        query(collection(db, 'classes'), where('teacherEmail', '==', currentUser.email))
      );
      
      if (classesSnapshot.empty) {
        return [];
      }
      
      const classIds = classesSnapshot.docs.map(doc => doc.data().classId || doc.id);
      
      // Get students from those classes
      const allStudents = await getDocs(studentsRef);
      return allStudents.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(student => classIds.includes(student.classId));
    }
    
    const snapshot = await getDocs(studentsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error loading students data:', error);
    return [];
  }
}

async function loadResultsData() {
  try {
    // Load from multiple possible result collections
    const collections = ['examResults', 'scan_results', 'scanResults', 'results'];
    let allResults = [];
    
    for (const collectionName of collections) {
      try {
        const resultsRef = collection(db, collectionName);
        let resultsQuery = resultsRef;
        
        // Apply role-based filtering
        if (userRole === 'teacher') {
          // Try different field names for teacher filtering
          const teacherQueries = [
            query(resultsRef, where('teacherId', '==', currentUser.uid)),
            query(resultsRef, where('teacherEmail', '==', currentUser.email)),
            query(resultsRef, where('createdBy', '==', currentUser.uid))
          ];
          
          for (const tQuery of teacherQueries) {
            try {
              const snapshot = await getDocs(tQuery);
              if (!snapshot.empty) {
                snapshot.docs.forEach(doc => {
                  allResults.push({ 
                    id: doc.id, 
                    ...doc.data(), 
                    collection: collectionName 
                  });
                });
                break; // Found results with this query, no need to try others
              }
            } catch (queryError) {
              // Field might not exist, continue to next query
              continue;
            }
          }
        } else {
          // Admin can see all results
          const snapshot = await getDocs(resultsQuery);
          snapshot.docs.forEach(doc => {
            allResults.push({ 
              id: doc.id, 
              ...doc.data(), 
              collection: collectionName 
            });
          });
        }
      } catch (collectionError) {
        // Collection might not exist, continue to next one
        continue;
      }
    }
    
    // Process and normalize the results data
    return allResults.map(result => ({
      ...result,
      score: normalizeScore(result),
      studentId: result.studentId || result.student_id || result.studentID,
      examId: result.examId || result.exam_id || result.questionSetId,
      timestamp: result.timestamp || result.createdAt || result.scanTime
    }));
    
  } catch (error) {
    console.error('Error loading results data:', error);
    return [];
  }
}

// Helper function to normalize score from different formats
function normalizeScore(result) {
  // Try different score field names and formats
  if (result.score !== undefined) {
    return typeof result.score === 'number' ? result.score : parseFloat(result.score) || 0;
  }
  
  if (result.percentage !== undefined) {
    return typeof result.percentage === 'number' ? result.percentage : parseFloat(result.percentage) || 0;
  }
  
  if (result.grade !== undefined) {
    return typeof result.grade === 'number' ? result.grade : parseFloat(result.grade) || 0;
  }
  
  // Calculate score from correct answers if available
  if (result.correctAnswers !== undefined && result.totalQuestions !== undefined) {
    return (result.correctAnswers / result.totalQuestions) * 100;
  }
  
  if (result.answers && Array.isArray(result.answers)) {
    // If we have answers array, we might need to calculate score
    // This would require the answer key, so for now return 0
    return 0;
  }
  
  return 0;
}

// Statistics Updates
function updateStatistics(examsData, studentsData, resultsData) {
  // Total Exams
  document.getElementById('totalExams').textContent = examsData.length;
  
  // Average Score
  const avgScore = calculateAverageScore(resultsData);
  document.getElementById('avgScore').textContent = `${avgScore.toFixed(1)}%`;
  
  // Total Students
  document.getElementById('totalStudents').textContent = studentsData.length;
  
  // Pass Rate
  const passRate = calculatePassRate(resultsData);
  document.getElementById('passRate').textContent = `${passRate.toFixed(1)}%`;
  
  // Update change indicators (mock data for now)
  updateChangeIndicators();
}

function calculateAverageScore(resultsData) {
  if (resultsData.length === 0) return 0;
  
  const totalScore = resultsData.reduce((sum, result) => {
    return sum + (result.score || 0);
  }, 0);
  
  return totalScore / resultsData.length;
}

function calculatePassRate(resultsData) {
  if (resultsData.length === 0) return 0;
  
  const passingGrade = 60; // Configurable passing grade
  const passedCount = resultsData.filter(result => (result.score || 0) >= passingGrade).length;
  
  return (passedCount / resultsData.length) * 100;
}

function updateChangeIndicators() {
  // Mock data for change indicators
  const changes = [
    { id: 'examsChange', value: '+12%', positive: true },
    { id: 'scoreChange', value: '+5.2%', positive: true },
    { id: 'studentsChange', value: '+8', positive: true },
    { id: 'passRateChange', value: '+3.1%', positive: true }
  ];
  
  changes.forEach(change => {
    const element = document.getElementById(change.id);
    if (element) {
      element.className = `stat-change ${change.positive ? 'positive' : 'negative'}`;
      element.innerHTML = `
        <i class="fa-solid fa-arrow-${change.positive ? 'up' : 'down'}"></i>
        <span>${change.value} from last month</span>
      `;
    }
  });
}

// Charts Initialization and Updates
function initializeCharts() {
  initializeScoreChart();
  initializeGradeChart();
}

function initializeScoreChart() {
  const ctx = document.getElementById('scoreChart').getContext('2d');
  
  scoreChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Average Score',
        data: [],
        borderColor: '#1a73e8',
        backgroundColor: 'rgba(26, 115, 232, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      }
    }
  });
}

function initializeGradeChart() {
  const ctx = document.getElementById('gradeChart').getContext('2d');
  
  gradeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['A (90-100%)', 'B (80-89%)', 'C (70-79%)', 'D (60-69%)', 'F (0-59%)'],
      datasets: [{
        data: [0, 0, 0, 0, 0],
        backgroundColor: [
          '#28a745',
          '#17a2b8',
          '#ffc107',
          '#fd7e14',
          '#dc3545'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 15
          }
        }
      }
    }
  });
}

function updateCharts(resultsData) {
  updateScoreChart(resultsData);
  updateGradeChart(resultsData);
}

function updateScoreChart(resultsData) {
  if (!scoreChart) return;
  
  const period = document.getElementById('trendPeriod').value;
  const chartData = generateScoreChartData(resultsData, period);
  
  scoreChart.data.labels = chartData.labels;
  scoreChart.data.datasets[0].data = chartData.data;
  scoreChart.update();
}

function updateGradeChart(resultsData) {
  if (!gradeChart) return;
  
  const gradeDistribution = calculateGradeDistribution(resultsData);
  gradeChart.data.datasets[0].data = gradeDistribution;
  gradeChart.update();
}

function generateScoreChartData(resultsData, period) {
  const labels = [];
  const data = [];
  
  if (resultsData.length === 0) {
    // Return empty data if no results
    return { labels: ['No Data'], data: [0] };
  }
  
  // Sort results by timestamp
  const sortedResults = resultsData
    .filter(result => result.timestamp)
    .sort((a, b) => {
      const dateA = result.timestamp?.toDate ? result.timestamp.toDate() : new Date(result.timestamp);
      const dateB = result.timestamp?.toDate ? result.timestamp.toDate() : new Date(result.timestamp);
      return dateA - dateB;
    });
  
  if (sortedResults.length === 0) {
    return { labels: ['No Data'], data: [0] };
  }
  
  const now = new Date();
  const groupedData = {};
  
  if (period === 'daily') {
    // Group by day for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toDateString();
      groupedData[dateKey] = [];
    }
    
    sortedResults.forEach(result => {
      const resultDate = result.timestamp?.toDate ? result.timestamp.toDate() : new Date(result.timestamp);
      const dateKey = resultDate.toDateString();
      if (groupedData[dateKey]) {
        groupedData[dateKey].push(result.score || 0);
      }
    });
    
    Object.keys(groupedData).forEach(dateKey => {
      const date = new Date(dateKey);
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      const scores = groupedData[dateKey];
      const avgScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      data.push(avgScore);
    });
    
  } else if (period === 'weekly') {
    // Group by week for the last 8 weeks
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * i));
      const weekKey = `Week ${8 - i}`;
      groupedData[weekKey] = [];
      labels.push(weekKey);
    }
    
    sortedResults.forEach(result => {
      const resultDate = result.timestamp?.toDate ? result.timestamp.toDate() : new Date(result.timestamp);
      const weeksDiff = Math.floor((now - resultDate) / (7 * 24 * 60 * 60 * 1000));
      if (weeksDiff >= 0 && weeksDiff < 8) {
        const weekKey = `Week ${8 - weeksDiff}`;
        if (groupedData[weekKey]) {
          groupedData[weekKey].push(result.score || 0);
        }
      }
    });
    
    labels.forEach(weekKey => {
      const scores = groupedData[weekKey];
      const avgScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      data.push(avgScore);
    });
    
  } else if (period === 'monthly') {
    // Group by month for the last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      labels.push(monthKey);
      groupedData[monthKey] = [];
    }
    
    sortedResults.forEach(result => {
      const resultDate = result.timestamp?.toDate ? result.timestamp.toDate() : new Date(result.timestamp);
      const monthKey = resultDate.toLocaleDateString('en-US', { month: 'short' });
      if (groupedData[monthKey]) {
        groupedData[monthKey].push(result.score || 0);
      }
    });
    
    labels.forEach(monthKey => {
      const scores = groupedData[monthKey];
      const avgScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      data.push(avgScore);
    });
  }
  
  return { labels, data };
}

function calculateGradeDistribution(resultsData) {
  const distribution = [0, 0, 0, 0, 0]; // A, B, C, D, F
  
  resultsData.forEach(result => {
    const score = result.score || 0;
    if (score >= 90) distribution[0]++;
    else if (score >= 80) distribution[1]++;
    else if (score >= 70) distribution[2]++;
    else if (score >= 60) distribution[3]++;
    else distribution[4]++;
  });
  
  return distribution;
}

// Performance Lists Updates
function updatePerformanceLists(examsData, resultsData) {
  updateTopClasses(resultsData);
  updateSubjectPerformance(examsData, resultsData);
}

async function updateTopClasses(resultsData) {
  const classList = document.getElementById('topClasses');
  
  if (resultsData.length === 0) {
    classList.innerHTML = `
      <li class="performance-item">
        <span class="performance-name">No data available</span>
        <span class="performance-score neutral">-</span>
      </li>
    `;
    return;
  }
  
  try {
    // Group results by class and calculate average scores
    const classPerformance = {};
    
    // Get class information
    const classesSnapshot = await getDocs(collection(db, 'classes'));
    const classesMap = {};
    classesSnapshot.docs.forEach(doc => {
      const classData = doc.data();
      classesMap[doc.id] = classData.className || classData.name || doc.id;
      classesMap[classData.classId] = classData.className || classData.name || classData.classId;
    });
    
    // Group results by class
    resultsData.forEach(result => {
      const classId = result.classId || result.class_id || 'Unknown';
      const className = classesMap[classId] || classId;
      
      if (!classPerformance[className]) {
        classPerformance[className] = {
          name: className,
          scores: [],
          totalScore: 0,
          count: 0
        };
      }
      
      classPerformance[className].scores.push(result.score || 0);
      classPerformance[className].totalScore += (result.score || 0);
      classPerformance[className].count++;
    });
    
    // Calculate averages and sort
    const topClasses = Object.values(classPerformance)
      .map(cls => ({
        name: cls.name,
        score: cls.count > 0 ? cls.totalScore / cls.count : 0,
        level: getPerformanceLevel(cls.count > 0 ? cls.totalScore / cls.count : 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 classes
    
    if (topClasses.length === 0) {
      classList.innerHTML = `
        <li class="performance-item">
          <span class="performance-name">No class data available</span>
          <span class="performance-score neutral">-</span>
        </li>
      `;
      return;
    }
    
    classList.innerHTML = topClasses.map(cls => `
      <li class="performance-item">
        <span class="performance-name">${cls.name}</span>
        <span class="performance-score ${cls.level}">${cls.score.toFixed(1)}%</span>
      </li>
    `).join('');
    
  } catch (error) {
    console.error('Error updating top classes:', error);
    classList.innerHTML = `
      <li class="performance-item">
        <span class="performance-name">Error loading data</span>
        <span class="performance-score neutral">-</span>
      </li>
    `;
  }
}

async function updateSubjectPerformance(examsData, resultsData) {
  const subjectList = document.getElementById('subjectPerformance');
  
  if (resultsData.length === 0 || examsData.length === 0) {
    subjectList.innerHTML = `
      <li class="performance-item">
        <span class="performance-name">No data available</span>
        <span class="performance-score neutral">-</span>
      </li>
    `;
    return;
  }
  
  try {
    // Get subject information
    const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
    const subjectsMap = {};
    subjectsSnapshot.docs.forEach(doc => {
      const subjectData = doc.data();
      subjectsMap[doc.id] = subjectData.name || subjectData.subjectName || doc.id;
      subjectsMap[subjectData.subjectId] = subjectData.name || subjectData.subjectName || subjectData.subjectId;
    });
    
    // Create exam to subject mapping
    const examToSubject = {};
    examsData.forEach(exam => {
      const subjectId = exam.subjectId || exam.subject_id;
      if (subjectId) {
        examToSubject[exam.id] = subjectId;
        examToSubject[exam.examId] = subjectId;
        examToSubject[exam.questionSetId] = subjectId;
      }
    });
    
    // Group results by subject
    const subjectPerformance = {};
    
    resultsData.forEach(result => {
      const examId = result.examId || result.exam_id || result.questionSetId;
      const subjectId = examToSubject[examId] || result.subjectId || result.subject_id;
      
      if (subjectId) {
        const subjectName = subjectsMap[subjectId] || subjectId;
        
        if (!subjectPerformance[subjectName]) {
          subjectPerformance[subjectName] = {
            name: subjectName,
            scores: [],
            totalScore: 0,
            count: 0
          };
        }
        
        subjectPerformance[subjectName].scores.push(result.score || 0);
        subjectPerformance[subjectName].totalScore += (result.score || 0);
        subjectPerformance[subjectName].count++;
      }
    });
    
    // Calculate averages and sort
    const topSubjects = Object.values(subjectPerformance)
      .map(subject => ({
        name: subject.name,
        score: subject.count > 0 ? subject.totalScore / subject.count : 0,
        level: getPerformanceLevel(subject.count > 0 ? subject.totalScore / subject.count : 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 subjects
    
    if (topSubjects.length === 0) {
      subjectList.innerHTML = `
        <li class="performance-item">
          <span class="performance-name">No subject data available</span>
          <span class="performance-score neutral">-</span>
        </li>
      `;
      return;
    }
    
    subjectList.innerHTML = topSubjects.map(subject => `
      <li class="performance-item">
        <span class="performance-name">${subject.name}</span>
        <span class="performance-score ${subject.level}">${subject.score.toFixed(1)}%</span>
      </li>
    `).join('');
    
  } catch (error) {
    console.error('Error updating subject performance:', error);
    subjectList.innerHTML = `
      <li class="performance-item">
        <span class="performance-name">Error loading data</span>
        <span class="performance-score neutral">-</span>
      </li>
    `;
  }
}

// Helper function to determine performance level
function getPerformanceLevel(score) {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'average';
  return 'poor';
}

// Recent Activity Updates
function updateRecentActivity() {
  const activityList = document.getElementById('recentActivity');
  
  // Mock data for recent activities
  const activities = [
    {
      icon: 'fa-file-text',
      iconColor: '#1a73e8',
      title: 'New exam created: Mathematics Midterm',
      time: '2 hours ago'
    },
    {
      icon: 'fa-users',
      iconColor: '#28a745',
      title: '25 students completed Science Quiz',
      time: '4 hours ago'
    },
    {
      icon: 'fa-chart-line',
      iconColor: '#17a2b8',
      title: 'Grade 10-A achieved 95% average',
      time: '6 hours ago'
    },
    {
      icon: 'fa-user-plus',
      iconColor: '#ffc107',
      title: '3 new students enrolled',
      time: '1 day ago'
    },
    {
      icon: 'fa-trophy',
      iconColor: '#fd7e14',
      title: 'Monthly performance report generated',
      time: '2 days ago'
    }
  ];
  
  activityList.innerHTML = activities.map(activity => `
    <li class="activity-item">
      <div class="activity-icon" style="background: ${activity.iconColor}">
        <i class="fa-solid ${activity.icon}"></i>
      </div>
      <div class="activity-content">
        <div class="activity-title">${activity.title}</div>
        <div class="activity-time">${activity.time}</div>
      </div>
    </li>
  `).join('');
}

// Export Functionality
function exportReport() {
  const reportData = {
    generatedAt: new Date().toISOString(),
    period: document.getElementById('periodFilter').value,
    statistics: {
      totalExams: document.getElementById('totalExams').textContent,
      averageScore: document.getElementById('avgScore').textContent,
      totalStudents: document.getElementById('totalStudents').textContent,
      passRate: document.getElementById('passRate').textContent
    }
  };
  
  // Create CSV content
  const csvContent = generateCSVReport(reportData);
  
  // Download CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function generateCSVReport(data) {
  const headers = ['Metric', 'Value'];
  const rows = [
    ['Report Generated', new Date(data.generatedAt).toLocaleString()],
    ['Period', data.period],
    ['Total Exams', data.statistics.totalExams],
    ['Average Score', data.statistics.averageScore],
    ['Total Students', data.statistics.totalStudents],
    ['Pass Rate', data.statistics.passRate]
  ];
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  return csvContent;
}

// Utility Functions
function showLoadingState() {
  // Add loading indicators
  document.querySelectorAll('.stat-value').forEach(el => {
    el.textContent = '...';
  });
}

function hideLoadingState() {
  // Remove loading indicators
}

function showErrorState() {
  console.error('Failed to load analytics data');
  // Show error message to user
}