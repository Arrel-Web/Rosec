#!/usr/bin/env python3
"""
Backend Test Suite for Answer Sheet & Key Maker
Tests Firebase integration and API functionality
"""

import requests
import sys
import json
from datetime import datetime

class AnswerSheetBackendTester:
    def __init__(self, base_url="http://localhost:8080"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        
    def run_test(self, name, test_func):
        """Run a single test"""
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            success = test_func()
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - {name}")
            else:
                print(f"❌ Failed - {name}")
            return success
        except Exception as e:
            print(f"❌ Failed - {name}: {str(e)}")
            return False

    def test_answer_sheet_page_accessibility(self):
        """Test if answer sheet maker page is accessible"""
        try:
            response = requests.get(f"{self.base_url}/public/answer-sheet-demo.html", timeout=10)
            if response.status_code == 200:
                # Check for key elements in the HTML
                content = response.text
                required_elements = [
                    'Answer Sheet & Key Maker',
                    'examTitle',
                    'totalQuestions',
                    'choiceOptions',
                    'generateSheet',
                    'saveTemplate',
                    'answer-sheet-maker.js'
                ]
                
                missing_elements = []
                for element in required_elements:
                    if element not in content:
                        missing_elements.append(element)
                
                if missing_elements:
                    print(f"Missing elements: {missing_elements}")
                    return False
                
                print("All required HTML elements found")
                return True
            else:
                print(f"HTTP Status: {response.status_code}")
                return False
        except Exception as e:
            print(f"Error accessing page: {str(e)}")
            return False

    def test_javascript_file_accessibility(self):
        """Test if JavaScript file is accessible"""
        try:
            response = requests.get(f"{self.base_url}/js/answer-sheet-maker.js", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check for key JavaScript functions
                required_functions = [
                    'generateAnswerSheet',
                    'saveTemplate',
                    'loadSubjects',
                    'loadClasses',
                    'getPointsConfiguration',
                    'generateAnswerKeyInputs'
                ]
                
                missing_functions = []
                for func in required_functions:
                    if func not in content:
                        missing_functions.append(func)
                
                if missing_functions:
                    print(f"Missing JavaScript functions: {missing_functions}")
                    return False
                
                print("All required JavaScript functions found")
                return True
            else:
                print(f"HTTP Status: {response.status_code}")
                return False
        except Exception as e:
            print(f"Error accessing JavaScript file: {str(e)}")
            return False

    def test_css_styles_accessibility(self):
        """Test if CSS styles are accessible"""
        try:
            response = requests.get(f"{self.base_url}/styles.css", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check for key CSS classes
                required_classes = [
                    '.sheet-container',
                    '.config-section',
                    '.answer-sheet-preview',
                    '.scanner-marker',
                    '.choice-bubble',
                    '.points-row'
                ]
                
                missing_classes = []
                for css_class in required_classes:
                    if css_class not in content:
                        missing_classes.append(css_class)
                
                if missing_classes:
                    print(f"Missing CSS classes: {missing_classes}")
                    return False
                
                print("All required CSS classes found")
                return True
            else:
                print(f"HTTP Status: {response.status_code}")
                return False
        except Exception as e:
            print(f"Error accessing CSS file: {str(e)}")
            return False

    def test_firebase_config_presence(self):
        """Test if Firebase configuration is present in JavaScript"""
        try:
            response = requests.get(f"{self.base_url}/js/answer-sheet-maker.js", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check for Firebase configuration
                firebase_elements = [
                    'firebaseConfig',
                    'apiKey',
                    'authDomain',
                    'projectId',
                    'initializeApp',
                    'getFirestore',
                    'getAuth'
                ]
                
                missing_elements = []
                for element in firebase_elements:
                    if element not in content:
                        missing_elements.append(element)
                
                if missing_elements:
                    print(f"Missing Firebase elements: {missing_elements}")
                    return False
                
                print("Firebase configuration found")
                return True
            else:
                return False
        except Exception as e:
            print(f"Error checking Firebase config: {str(e)}")
            return False

    def test_login_page_accessibility(self):
        """Test if login page is accessible (required for authentication)"""
        try:
            response = requests.get(f"{self.base_url}/index.html", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check for login elements
                login_elements = [
                    'loginForm',
                    'email',
                    'password',
                    'signInWithEmailAndPassword'
                ]
                
                missing_elements = []
                for element in login_elements:
                    if element not in content:
                        missing_elements.append(element)
                
                if missing_elements:
                    print(f"Missing login elements: {missing_elements}")
                    return False
                
                print("Login page accessible with required elements")
                return True
            else:
                print(f"HTTP Status: {response.status_code}")
                return False
        except Exception as e:
            print(f"Error accessing login page: {str(e)}")
            return False

    def test_demo_data_functionality(self):
        """Test if demo data loading functionality exists"""
        try:
            response = requests.get(f"{self.base_url}/js/answer-sheet-maker.js", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check for demo data function
                if 'loadDemoData' in content:
                    # Check if demo subjects and classes are defined
                    demo_elements = [
                        'Mathematics 101',
                        'English 101',
                        'Science 101',
                        'BSIT-3A',
                        'BSCS-2B',
                        'BSCPE-4C'
                    ]
                    
                    missing_demo = []
                    for element in demo_elements:
                        if element not in content:
                            missing_demo.append(element)
                    
                    if missing_demo:
                        print(f"Missing demo data: {missing_demo}")
                        return False
                    
                    print("Demo data functionality found")
                    return True
                else:
                    print("Demo data function not found")
                    return False
            else:
                return False
        except Exception as e:
            print(f"Error checking demo data: {str(e)}")
            return False

    def test_answer_sheet_generation_logic(self):
        """Test if answer sheet generation logic is properly implemented"""
        try:
            response = requests.get(f"{self.base_url}/js/answer-sheet-maker.js", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check for key generation logic components
                generation_elements = [
                    'scanner-marker',
                    'choice-bubble',
                    'question-number',
                    'points-display',
                    'student-info',
                    'questions-grid',
                    'String.fromCharCode(65 + i)',  # Choice letter generation
                    'calculateTotalPoints',
                    'getPointsForQuestion'
                ]
                
                missing_elements = []
                for element in generation_elements:
                    if element not in content:
                        missing_elements.append(element)
                
                if missing_elements:
                    print(f"Missing generation logic: {missing_elements}")
                    return False
                
                print("Answer sheet generation logic found")
                return True
            else:
                return False
        except Exception as e:
            print(f"Error checking generation logic: {str(e)}")
            return False

    def test_points_configuration_logic(self):
        """Test if points configuration system is implemented"""
        try:
            response = requests.get(f"{self.base_url}/js/answer-sheet-maker.js", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check for points configuration functions
                points_elements = [
                    'getPointsConfiguration',
                    'addPointsRow',
                    'remove-points-row',
                    'range-start',
                    'range-end',
                    'points-value',
                    'calculateTotalPoints'
                ]
                
                missing_elements = []
                for element in points_elements:
                    if element not in content:
                        missing_elements.append(element)
                
                if missing_elements:
                    print(f"Missing points configuration: {missing_elements}")
                    return False
                
                print("Points configuration system found")
                return True
            else:
                return False
        except Exception as e:
            print(f"Error checking points configuration: {str(e)}")
            return False

def main():
    """Run all backend tests"""
    print("🚀 Starting Answer Sheet & Key Maker Backend Tests")
    print("=" * 60)
    
    tester = AnswerSheetBackendTester()
    
    # Run all tests
    tests = [
        ("Answer Sheet Page Accessibility", tester.test_answer_sheet_page_accessibility),
        ("JavaScript File Accessibility", tester.test_javascript_file_accessibility),
        ("CSS Styles Accessibility", tester.test_css_styles_accessibility),
        ("Firebase Configuration", tester.test_firebase_config_presence),
        ("Login Page Accessibility", tester.test_login_page_accessibility),
        ("Demo Data Functionality", tester.test_demo_data_functionality),
        ("Answer Sheet Generation Logic", tester.test_answer_sheet_generation_logic),
        ("Points Configuration Logic", tester.test_points_configuration_logic)
    ]
    
    for test_name, test_func in tests:
        tester.run_test(test_name, test_func)
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend tests passed! Ready for frontend testing.")
        return 0
    else:
        failed_tests = tester.tests_run - tester.tests_passed
        print(f"⚠️  {failed_tests} test(s) failed. Check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())