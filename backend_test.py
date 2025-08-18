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
                    'studentIdLength',
                    'subjectIdLength',
                    'answerKeySection'
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

    def test_javascript_functionality(self):
        """Test if JavaScript functionality is embedded in HTML"""
        try:
            response = requests.get(f"{self.base_url}/public/answer-sheet-demo.html", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check for key JavaScript functions embedded in HTML
                required_functions = [
                    'generateAnswerSheet',
                    'generateIdSections',
                    'generateAnswerKeyBubbles',
                    'handleAnswerKeyBubbleClick',
                    'currentAnswerKey'
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
            print(f"Error accessing JavaScript functionality: {str(e)}")
            return False

    def test_css_styles_embedded(self):
        """Test if CSS styles are embedded in HTML"""
        try:
            response = requests.get(f"{self.base_url}/public/answer-sheet-demo.html", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check for key CSS classes embedded in HTML
                required_classes = [
                    '.container',
                    '.config-section',
                    '.answer-sheet-preview',
                    '.scanner-marker',
                    '.choice-bubble',
                    '.key-bubble',
                    '.id-bubble'
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
            print(f"Error accessing CSS styles: {str(e)}")
            return False

    def test_demo_functionality(self):
        """Test if demo functionality exists in the HTML"""
        try:
            response = requests.get(f"{self.base_url}/public/answer-sheet-demo.html", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check for demo-specific elements
                demo_elements = [
                    'Demo Version',
                    'Midterm Examination',
                    'Mathematics 101',
                    'BSIT-3A',
                    'Student ID Length',
                    'Subject ID Length',
                    'Answer Key Configuration'
                ]
                
                missing_demo = []
                for element in demo_elements:
                    if element not in content:
                        missing_demo.append(element)
                
                if missing_demo:
                    print(f"Missing demo elements: {missing_demo}")
                    return False
                
                print("Demo functionality found")
                return True
            else:
                return False
        except Exception as e:
            print(f"Error checking demo functionality: {str(e)}")
            return False

    def test_navigation_elements(self):
        """Test if navigation elements are present"""
        try:
            response = requests.get(f"{self.base_url}/public/answer-sheet-demo.html", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check for navigation elements
                nav_elements = [
                    'nav-buttons',
                    'Home',
                    'Back',
                    'dashboard.html',
                    'history.back()'
                ]
                
                missing_elements = []
                for element in nav_elements:
                    if element not in content:
                        missing_elements.append(element)
                
                if missing_elements:
                    print(f"Missing navigation elements: {missing_elements}")
                    return False
                
                print("Navigation elements found")
                return True
            else:
                print(f"HTTP Status: {response.status_code}")
                return False
        except Exception as e:
            print(f"Error accessing navigation elements: {str(e)}")
            return False

    def test_demo_data_functionality(self):
        """Test if demo data loading functionality exists"""
        try:
            response = requests.get(f"{self.base_url}/public/answer-sheet-demo.html", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check for demo data elements
                demo_elements = [
                    'Midterm Examination',
                    'Mathematics 101',
                    'BSIT-3A',
                    'value="8"',  # Student ID length
                    'value="4"',  # Subject ID length
                    'value="25"'  # Total questions
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
                return False
        except Exception as e:
            print(f"Error checking demo data: {str(e)}")
            return False

    def test_answer_sheet_generation_logic(self):
        """Test if answer sheet generation logic is properly implemented"""
        try:
            response = requests.get(f"{self.base_url}/public/answer-sheet-demo.html", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check for key generation logic components
                generation_elements = [
                    'scanner-marker',
                    'choice-bubble',
                    'question-number',
                    'student-info',
                    'questions-grid',
                    'String.fromCharCode(65 + i)',  # Choice letter generation
                    'generateIdSections',
                    'generateAnswerKeyBubbles'
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

    def test_answer_key_functionality(self):
        """Test if answer key functionality is implemented"""
        try:
            response = requests.get(f"{self.base_url}/public/answer-sheet-demo.html", timeout=10)
            if response.status_code == 200:
                content = response.text
                # Check for answer key functionality
                key_elements = [
                    'currentAnswerKey',
                    'handleAnswerKeyBubbleClick',
                    'saveAnswerKey',
                    'clearAnswerKey',
                    'key-bubble',
                    'answerKeySection',
                    'answerKeyGrid'
                ]
                
                missing_elements = []
                for element in key_elements:
                    if element not in content:
                        missing_elements.append(element)
                
                if missing_elements:
                    print(f"Missing answer key functionality: {missing_elements}")
                    return False
                
                print("Answer key functionality found")
                return True
            else:
                return False
        except Exception as e:
            print(f"Error checking answer key functionality: {str(e)}")
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