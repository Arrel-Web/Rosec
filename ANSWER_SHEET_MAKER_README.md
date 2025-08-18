# Answer Sheet & Key Maker - Rosec

## Overview
A comprehensive answer sheet and answer key generator with scanner compatibility for OMR (Optical Mark Recognition) processing. This tool integrates seamlessly with the Rosec school management system.

## Features

### ✅ Answer Sheet Generation
- **Configurable Questions**: Support for up to 100 questions
- **Multiple Choice Options**: A-C, A-D, or A-E choices
- **Scanner Compatibility**: Built-in OMR markers for start/end scanning detection
- **Student Information Fields**: Name, Student ID, Date, Signature
- **Print-Ready Format**: Optimized layout for standard paper printing

### ✅ Variable Points System
- **Flexible Scoring**: Set different point values for question ranges
- **Example**: Questions 1-15 = 2 points, Questions 16-30 = 3 points
- **Automatic Calculation**: Total points displayed on answer sheet
- **Multiple Ranges**: Add unlimited point ranges

### ✅ Answer Key Management
- **Interactive Configuration**: Dropdown selects for each question
- **Firebase Integration**: Save answer keys to Firestore database
- **Template Persistence**: Reuse answer sheet templates
- **Real-time Updates**: Changes automatically saved

### ✅ Scanner Integration Ready
- **OMR Markers**: Black square indicators for scan start/end detection
- **Structured Layout**: Optimized bubble positioning for accurate scanning
- **Standardized Format**: Compatible with common OMR scanning systems
- **Error Detection**: Clear visual indicators for proper alignment

## Usage Instructions

### Basic Setup
1. **Login**: Use your Rosec credentials to access the system
2. **Navigate**: Click "Answer Sheet Maker" in the sidebar
3. **Configure**: Set exam title, subject, and class

### Creating Answer Sheets
1. **Basic Settings**:
   - Enter exam title (e.g., "Midterm Examination")
   - Select subject from dropdown
   - Choose class from dropdown

2. **Question Settings**:
   - Set total questions (1-100)
   - Choose choice options (A-C, A-D, or A-E)
   - Configure questions per column for layout

3. **Points Configuration**:
   - Default: All questions = 1 point
   - Custom: Set different point ranges
   - Example: Q1-15 = 2pts, Q16-30 = 3pts
   - Click "Add Points Range" for multiple ranges

4. **Generate**: Click "Generate Answer Sheet"

### Answer Key Configuration
1. **Auto-Generated**: Answer key inputs appear after sheet generation
2. **Fill Correct Answers**: Use dropdown for each question (Q1, Q2, etc.)
3. **Save Template**: Click "Save Template" to store in Firebase
4. **Clear All**: Reset all answer selections

### Export Options
- **Print Sheet**: Direct browser printing with print-optimized styles
- **Save Template**: Store configuration and answer key in Firebase
- **Export PDF**: (Placeholder for future PDF export functionality)

## Technical Details

### Firebase Integration
- **Collections Used**: 
  - `questions`: Stores answer sheet templates and answer keys
  - `subjects`: Links to existing subjects
  - `classes`: Links to existing classes
  - `users`: Authentication and role management

### Data Structure
```javascript
{
  questionSetId: "qset_timestamp",
  examTitle: "Midterm Examination",
  subjectId: "math101",
  classId: "class1",
  totalQuestions: 30,
  items: [
    { number: 1, correctAnswer: "A" },
    { number: 2, correctAnswer: "C" }
  ],
  pointsConfiguration: [
    { start: 1, end: 15, points: 2 },
    { start: 16, end: 30, points: 3 }
  ],
  choiceOptions: 4, // A-D
  createdBy: "teacher@example.com",
  createdAt: "2024-01-01T00:00:00.000Z",
  scannerCompatible: true
}
```

### Scanner Compatibility Features
- **Start Markers**: 5 black squares at sheet beginning
- **End Markers**: 5 black squares at sheet end
- **Bubble Layout**: Standardized spacing for OMR detection
- **Alignment Guides**: Visual markers for proper positioning
- **Question Numbering**: Clear numerical identification

## File Structure
```
/app/public/
├── answer-sheet-maker.html    # Main page
├── js/
│   └── answer-sheet-maker.js  # JavaScript functionality
└── styles.css                # Styling (shared)
```

## Browser Compatibility
- Modern browsers with ES6 module support
- Chrome, Firefox, Safari, Edge
- Requires Firebase JavaScript SDK 10.8.0+

## Print Specifications
- **Paper Size**: Standard 8.5" x 11" (Letter)
- **Margins**: 0.5" all sides recommended
- **Font**: Courier New (monospace) for consistency
- **Scanner Areas**: High contrast black markers
- **Bubble Size**: 16px diameter for optimal scanning

## Future Enhancements
- PDF export with jsPDF integration
- Batch answer sheet generation
- Advanced scanning validation
- Custom branding options
- Multi-language support

## Troubleshooting

### Common Issues
1. **Authentication Required**: Must be logged into Rosec system
2. **Firebase Connection**: Check network connectivity
3. **Print Layout**: Use browser print preview to verify formatting
4. **Scanner Compatibility**: Ensure high contrast printing for OMR markers

### Support
For technical support or feature requests, contact the Rosec development team.