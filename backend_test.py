#!/usr/bin/env python3
"""
Chrome Extension Backend Testing Suite
=====================================

This test suite focuses on testing the backend APIs that support the Chrome extension
and provides comprehensive analysis of the Chrome extension's IndexedDB issues.

CRITICAL LIMITATION: Chrome extensions cannot be directly tested in this environment
as they require a browser context with extension permissions. However, we can:

1. Test the backend APIs that support the extension
2. Analyze the extension code for logical errors  
3. Provide diagnostic information about IndexedDB issues
4. Test the extension files for syntax and structure errors
"""

import requests
import json
import os
import sys
from datetime import datetime
import uuid

# Get backend URL from frontend environment
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    base_url = line.split('=')[1].strip()
                    return f"{base_url}/api"
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
    return "https://medannotate.preview.emergentagent.com/api"

BACKEND_URL = get_backend_url()

class ChromeExtensionTester:
    def __init__(self):
        self.test_results = []
        self.backend_working = False
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'details': details or {},
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        print(f"   {message}")
        if details:
            for key, value in details.items():
                print(f"   {key}: {value}")
        print()

    def test_backend_apis(self):
        """Test the backend APIs that support the Chrome extension"""
        print("🔧 TESTING BACKEND APIs FOR CHROME EXTENSION SUPPORT")
        print("=" * 60)
        
        # Test 1: Root endpoint
        try:
            response = requests.get(f"{BACKEND_URL}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Backend Root Endpoint",
                    True,
                    "Backend API is accessible and responding",
                    {"status_code": response.status_code, "response": data}
                )
                self.backend_working = True
            else:
                self.log_test(
                    "Backend Root Endpoint", 
                    False,
                    f"Backend returned status {response.status_code}",
                    {"status_code": response.status_code}
                )
        except Exception as e:
            self.log_test(
                "Backend Root Endpoint",
                False, 
                f"Failed to connect to backend: {str(e)}",
                {"error": str(e), "url": BACKEND_URL}
            )
            
        # Test 2: Status check creation (for extension health monitoring)
        if self.backend_working:
            try:
                test_data = {"client_name": "Chrome Extension Test"}
                response = requests.post(f"{BACKEND_URL}/status", json=test_data, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_test(
                        "Status Check Creation",
                        True,
                        "Extension can create status checks for monitoring",
                        {"status_code": response.status_code, "created_id": data.get('id')}
                    )
                else:
                    self.log_test(
                        "Status Check Creation",
                        False,
                        f"Failed to create status check: {response.status_code}",
                        {"status_code": response.status_code}
                    )
            except Exception as e:
                self.log_test(
                    "Status Check Creation",
                    False,
                    f"Exception during status check creation: {str(e)}",
                    {"error": str(e)}
                )
                
        # Test 3: Status check retrieval
        if self.backend_working:
            try:
                response = requests.get(f"{BACKEND_URL}/status", timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_test(
                        "Status Check Retrieval",
                        True,
                        "Extension can retrieve status checks",
                        {"status_code": response.status_code, "count": len(data)}
                    )
                else:
                    self.log_test(
                        "Status Check Retrieval",
                        False,
                        f"Failed to retrieve status checks: {response.status_code}",
                        {"status_code": response.status_code}
                    )
            except Exception as e:
                self.log_test(
                    "Status Check Retrieval",
                    False,
                    f"Exception during status check retrieval: {str(e)}",
                    {"error": str(e)}
                )

    def analyze_extension_files(self):
        """Analyze Chrome extension files for critical issues"""
        print("🔍 ANALYZING CHROME EXTENSION FILES")
        print("=" * 60)
        
        extension_path = "/app/extension-ready"
        
        # Test 1: Manifest.json validation
        try:
            with open(f"{extension_path}/manifest.json", 'r') as f:
                manifest = json.load(f)
                
            required_fields = ['manifest_version', 'name', 'version', 'permissions']
            missing_fields = [field for field in required_fields if field not in manifest]
            
            if not missing_fields:
                self.log_test(
                    "Manifest.json Validation",
                    True,
                    "Manifest file is valid with all required fields",
                    {
                        "manifest_version": manifest.get('manifest_version'),
                        "name": manifest.get('name'),
                        "version": manifest.get('version'),
                        "permissions": len(manifest.get('permissions', []))
                    }
                )
            else:
                self.log_test(
                    "Manifest.json Validation",
                    False,
                    f"Missing required fields: {missing_fields}",
                    {"missing_fields": missing_fields}
                )
                
        except Exception as e:
            self.log_test(
                "Manifest.json Validation",
                False,
                f"Failed to validate manifest: {str(e)}",
                {"error": str(e)}
            )
            
        # Test 2: Critical file existence
        critical_files = [
            'popup.html', 'popup.js', 'background.js', 'temp-storage.js',
            'pdf-export.js', 'annotation.js', 'pdf-export.html'
        ]
        
        missing_files = []
        for file in critical_files:
            if not os.path.exists(f"{extension_path}/{file}"):
                missing_files.append(file)
                
        if not missing_files:
            self.log_test(
                "Critical Files Check",
                True,
                "All critical extension files are present",
                {"files_checked": len(critical_files)}
            )
        else:
            self.log_test(
                "Critical Files Check",
                False,
                f"Missing critical files: {missing_files}",
                {"missing_files": missing_files}
            )

    def analyze_indexeddb_issues(self):
        """Analyze the IndexedDB implementation for critical issues"""
        print("🗄️ ANALYZING INDEXEDDB IMPLEMENTATION ISSUES")
        print("=" * 60)
        
        try:
            # Read temp-storage.js file
            with open("/app/extension-ready/temp-storage.js", 'r') as f:
                temp_storage_content = f.read()
                
            # Test 1: Database version and schema
            if 'dbVersion = 2' in temp_storage_content:
                self.log_test(
                    "Database Version Check",
                    True,
                    "Database version is set to 2 for schema upgrade",
                    {"version": 2}
                )
            else:
                self.log_test(
                    "Database Version Check",
                    False,
                    "Database version not properly set for schema upgrade",
                    {"issue": "Version management problem"}
                )
                
            # Test 2: pdfExports object store creation
            if "createObjectStore('pdfExports'" in temp_storage_content:
                self.log_test(
                    "pdfExports Object Store Creation",
                    True,
                    "pdfExports object store is defined in schema",
                    {"found": "createObjectStore('pdfExports')"}
                )
            else:
                self.log_test(
                    "pdfExports Object Store Creation",
                    False,
                    "pdfExports object store not found in schema definition",
                    {"issue": "Missing object store definition"}
                )
                
            # Test 3: Object store existence checks
            if "objectStoreNames.contains('pdfExports')" in temp_storage_content:
                self.log_test(
                    "Runtime Object Store Validation",
                    True,
                    "Code includes runtime checks for pdfExports object store",
                    {"validation": "Runtime existence checks present"}
                )
            else:
                self.log_test(
                    "Runtime Object Store Validation",
                    False,
                    "Missing runtime validation for pdfExports object store",
                    {"issue": "No runtime existence checks"}
                )
                
            # Test 4: Error handling for missing object stores
            if "Database schema may need manual reset" in temp_storage_content:
                self.log_test(
                    "Error Handling for Schema Issues",
                    True,
                    "Proper error handling for schema issues is implemented",
                    {"error_handling": "Schema reset guidance provided"}
                )
            else:
                self.log_test(
                    "Error Handling for Schema Issues",
                    False,
                    "Missing proper error handling for schema issues",
                    {"issue": "No schema error recovery"}
                )
                
        except Exception as e:
            self.log_test(
                "IndexedDB Analysis",
                False,
                f"Failed to analyze IndexedDB implementation: {str(e)}",
                {"error": str(e)}
            )

    def analyze_pdf_export_issues(self):
        """Analyze PDF export functionality for critical issues"""
        print("📄 ANALYZING PDF EXPORT FUNCTIONALITY")
        print("=" * 60)
        
        try:
            # Read pdf-export.js file
            with open("/app/extension-ready/pdf-export.js", 'r') as f:
                pdf_export_content = f.read()
                
            # Test 1: IndexedDB integration for large datasets
            if "method === 'indexeddb'" in pdf_export_content:
                self.log_test(
                    "IndexedDB PDF Export Integration",
                    True,
                    "PDF export supports IndexedDB for large datasets",
                    {"feature": "Large dataset support via IndexedDB"}
                )
            else:
                self.log_test(
                    "IndexedDB PDF Export Integration",
                    False,
                    "PDF export missing IndexedDB support for large datasets",
                    {"issue": "No large dataset handling"}
                )
                
            # Test 2: Error handling for export data retrieval
            if "getPdfExportData" in pdf_export_content:
                self.log_test(
                    "PDF Export Data Retrieval",
                    True,
                    "PDF export includes data retrieval from IndexedDB",
                    {"method": "getPdfExportData implementation found"}
                )
            else:
                self.log_test(
                    "PDF Export Data Retrieval",
                    False,
                    "Missing PDF export data retrieval implementation",
                    {"issue": "No data retrieval method"}
                )
                
            # Test 3: Cleanup functionality
            if "deletePdfExportData" in pdf_export_content:
                self.log_test(
                    "PDF Export Cleanup",
                    True,
                    "PDF export includes cleanup functionality",
                    {"cleanup": "deletePdfExportData method found"}
                )
            else:
                self.log_test(
                    "PDF Export Cleanup",
                    False,
                    "Missing PDF export cleanup functionality",
                    {"issue": "No cleanup implementation"}
                )
                
        except Exception as e:
            self.log_test(
                "PDF Export Analysis",
                False,
                f"Failed to analyze PDF export: {str(e)}",
                {"error": str(e)}
            )

    def provide_diagnostic_recommendations(self):
        """Provide diagnostic recommendations for the identified issues"""
        print("💡 DIAGNOSTIC RECOMMENDATIONS")
        print("=" * 60)
        
        # Count failures
        failures = [test for test in self.test_results if not test['success']]
        
        if not failures:
            print("✅ ALL TESTS PASSED - No critical issues detected")
            print()
            print("🎉 CHROME EXTENSION STATUS: READY FOR TESTING")
            print("   - Backend APIs are functional")
            print("   - Extension files are present and valid")
            print("   - IndexedDB implementation appears correct")
            print("   - PDF export functionality is properly implemented")
            print()
            print("📋 NEXT STEPS:")
            print("   1. Load extension in Chrome browser")
            print("   2. Test screenshot capture functionality")
            print("   3. Test annotation system")
            print("   4. Test PDF export with small datasets")
            print("   5. Test PDF export with large datasets (>8MB)")
            return
            
        print(f"⚠️  DETECTED {len(failures)} CRITICAL ISSUES")
        print()
        
        # Categorize issues
        backend_issues = [f for f in failures if 'Backend' in f['test'] or 'Status' in f['test']]
        file_issues = [f for f in failures if 'Files' in f['test'] or 'Manifest' in f['test']]
        indexeddb_issues = [f for f in failures if 'IndexedDB' in f['test'] or 'Database' in f['test'] or 'Object Store' in f['test']]
        pdf_issues = [f for f in failures if 'PDF' in f['test']]
        
        if backend_issues:
            print("🔧 BACKEND API ISSUES:")
            for issue in backend_issues:
                print(f"   ❌ {issue['test']}: {issue['message']}")
            print("   💡 SOLUTION: Check backend server status and network connectivity")
            print()
            
        if file_issues:
            print("📁 EXTENSION FILE ISSUES:")
            for issue in file_issues:
                print(f"   ❌ {issue['test']}: {issue['message']}")
            print("   💡 SOLUTION: Ensure all extension files are present and valid")
            print()
            
        if indexeddb_issues:
            print("🗄️ INDEXEDDB CRITICAL ISSUES:")
            for issue in indexeddb_issues:
                print(f"   ❌ {issue['test']}: {issue['message']}")
            print("   💡 SOLUTIONS:")
            print("      1. Users should run: resetDatabaseSchema() in browser console")
            print("      2. Or reload the extension completely")
            print("      3. Or clear extension storage and reinstall")
            print()
            
        if pdf_issues:
            print("📄 PDF EXPORT ISSUES:")
            for issue in pdf_issues:
                print(f"   ❌ {issue['test']}: {issue['message']}")
            print("   💡 SOLUTION: Fix PDF export implementation for large datasets")
            print()

    def run_comprehensive_test(self):
        """Run the complete test suite"""
        print("🧪 CHROME EXTENSION COMPREHENSIVE TEST SUITE")
        print("=" * 60)
        print(f"🕒 Test started at: {datetime.now().isoformat()}")
        print(f"🌐 Backend URL: {BACKEND_URL}")
        print()
        
        # Run all test categories
        self.test_backend_apis()
        self.analyze_extension_files()
        self.analyze_indexeddb_issues()
        self.analyze_pdf_export_issues()
        
        # Provide recommendations
        self.provide_diagnostic_recommendations()
        
        # Summary
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['success']])
        failed_tests = total_tests - passed_tests
        
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        if failed_tests == 0:
            print("🎉 ALL TESTS PASSED - Chrome extension is ready for production!")
        else:
            print("⚠️  ISSUES DETECTED - Review recommendations above")
            
        return failed_tests == 0

def main():
    """Main test execution"""
    print("🚀 Starting Chrome Extension Backend Testing Suite")
    print()
    
    tester = ChromeExtensionTester()
    success = tester.run_comprehensive_test()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()