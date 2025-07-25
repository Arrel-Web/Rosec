const admin = require('firebase-admin');
const serviceAccount = require('./path-to-your-service-account-key.json'); // 🔁 replace this with actual path

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seedFirestore() {
  // USERS with correct Auth UIDs
  await db.collection('users').doc('AuOLW7XJwxe8qUobFINDNfW1hfv2').set({
    uid: 'AuOLW7XJwxe8qUobFINDNfW1hfv2',
    name: 'Admin STI',
    email: 'adminsti@gmail.com',
    role: 'admin'
  });

  await db.collection('users').doc('iUg5sjqULhgy2PraY88wLGKmybU2').set({
    uid: 'iUg5sjqULhgy2PraY88wLGKmybU2',
    name: 'Teacher 123',
    email: 'teacher123@gmail.com',
    role: 'teacher'
  });

  await db.collection('users').doc('gN2NysT9OSfC7djJNeYpwr8sLYz1').set({
    uid: 'gN2NysT9OSfC7djJNeYpwr8sLYz1',
    name: 'Admin 123',
    email: 'admin123@gmail.com',
    role: 'admin'
  });

  // STUDENTS
  await db.collection('students').doc('10001').set({
    studentId: 10001,
    name: 'Juan Dela Cruz',
    program: 'BSIT'
  });

  await db.collection('students').doc('10002').set({
    studentId: 10002,
    name: 'Maria Santos',
    program: 'BSCS'
  });

  // SCHOOL YEAR
  await db.collection('schoolyear').doc('2024').set({
    schoolyearId: 2024,
    startDate: new Date('2024-06-01'),
    endDate: new Date('2025-03-31')
  });

  // TERM
  await db.collection('term').doc('1').set({ termId: 1, name: 'Prelim' });
  await db.collection('term').doc('2').set({ termId: 2, name: 'Midterm' });

  // SEMESTER
  await db.collection('semester').doc('1').set({
    semesterId: 1,
    semesterLabel: '1st Semester',
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-10-31'),
    isActive: true
  });

  // ACADEMIC YEAR
  await db.collection('academicYear').doc('1001').set({
    academicYearId: 1001,
    schoolyearId: 2024,
    termId: 1,
    semesterId: 1,
    startDate: Date.now(),
    endDate: Date.now()
  });

  // SUBJECTS
  await db.collection('subjects').doc('201').set({
    subjectId: 201,
    name: 'Mathematics',
    code: 'MATH101'
  });

  // CLASSES
  await db.collection('classes').doc('301').set({
    classId: 301,
    subjectId: 201,
    teacherEmail: 'teacher123@gmail.com',
    academicYearId: 1001
  });

  // CLASS MEMBERS
  await db.collection('classMembers').add({
    classId: 301,
    studentId: 10001,
    enrolledAt: new Date()
  });

  await db.collection('classMembers').add({
    classId: 301,
    studentId: 10002,
    enrolledAt: new Date()
  });

  // QUESTIONS + SUBCOLLECTION ITEMS
  const questionRef = db.collection('questions').doc('401');
  await questionRef.set({
    questionId: 401,
    subjectId: 201,
    academicYearId: 1001,
    createdBy: 'teacher123@gmail.com'
  });

  await questionRef.collection('items').doc('item1').set({
    itemId: 'item1',
    number: 1,
    correctAnswer: 'A'
  });

  await questionRef.collection('items').doc('item2').set({
    itemId: 'item2',
    number: 2,
    correctAnswer: 'B'
  });

  // SCANNED BATCHES + SUBCOLLECTION scannedItems
  const batchRef = db.collection('scannedBatches').doc('B001');
  await batchRef.set({
    batchId: 'B001',
    classId: 301,
    questionId: 401
  });

  await batchRef.collection('scannedItems').doc('SC001').set({
    scanId: 'SC001',
    studentId: 10001,
    answers: {
      '1': 'A',
      '2': 'B',
      '3': 'D',
      '4': 'D'
    },
    score: 3,
    correctedAt: new Date('2024-06-10T12:00:00Z')
  });

  await batchRef.collection('scannedItems').doc('SC002').set({
    scanId: 'SC002',
    studentId: 10002,
    answers: {
      '1': 'A',
      '2': 'C',
      '3': 'C',
      '4': 'D'
    },
    score: 2,
    correctedAt: new Date('2024-06-10T12:05:00Z')
  });

  console.log('✅ Firestore seeded successfully!');
}

seedFirestore().catch(console.error);
