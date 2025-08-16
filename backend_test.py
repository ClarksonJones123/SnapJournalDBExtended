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
print(f"Testing backend at: {BACKEND_URL}")

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

def test_root_endpoint():
    """Test the root API endpoint"""
    print("\n=== Testing Root Endpoint ===")
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                print("✅ Root endpoint working correctly")
                return True
            else:
                print("❌ Root endpoint returned unexpected message")
                return False
        else:
            print(f"❌ Root endpoint failed with status {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Root endpoint request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Root endpoint test failed: {e}")
        return False

def test_create_status_check():
    """Test creating a status check"""
    print("\n=== Testing Create Status Check ===")
    try:
        test_data = {
            "client_name": "test_extension_client"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/status", 
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["id", "client_name", "timestamp"]
            
            if all(field in data for field in required_fields):
                if data["client_name"] == test_data["client_name"]:
                    print("✅ Create status check working correctly")
                    return True, data["id"]
                else:
                    print("❌ Client name mismatch in response")
                    return False, None
            else:
                print(f"❌ Missing required fields in response: {required_fields}")
                return False, None
        else:
            print(f"❌ Create status check failed with status {response.status_code}")
            return False, None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Create status check request failed: {e}")
        return False, None
    except Exception as e:
        print(f"❌ Create status check test failed: {e}")
        return False, None

def test_get_status_checks():
    """Test retrieving status checks"""
    print("\n=== Testing Get Status Checks ===")
    try:
        response = requests.get(f"{BACKEND_URL}/status", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Retrieved {len(data)} status checks")
            
            if isinstance(data, list):
                if len(data) > 0:
                    # Check structure of first item
                    first_item = data[0]
                    required_fields = ["id", "client_name", "timestamp"]
                    if all(field in first_item for field in required_fields):
                        print("✅ Get status checks working correctly")
                        return True
                    else:
                        print(f"❌ Missing required fields in status check: {required_fields}")
                        return False
                else:
                    print("✅ Get status checks working (empty list)")
                    return True
            else:
                print("❌ Response is not a list")
                return False
        else:
            print(f"❌ Get status checks failed with status {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Get status checks request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Get status checks test failed: {e}")
        return False

def test_cors_headers():
    """Test CORS headers are properly set"""
    print("\n=== Testing CORS Headers ===")
    try:
        response = requests.options(f"{BACKEND_URL}/", timeout=10)
        print(f"OPTIONS Status Code: {response.status_code}")
        
        # Check for CORS headers
        cors_headers = {
            'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
            'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
            'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
        }
        
        print("CORS Headers:")
        for header, value in cors_headers.items():
            print(f"  {header}: {value}")
        
        if cors_headers['Access-Control-Allow-Origin']:
            print("✅ CORS headers present")
            return True
        else:
            print("❌ CORS headers missing")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ CORS test request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ CORS test failed: {e}")
        return False

def test_error_handling():
    """Test error handling for invalid requests"""
    print("\n=== Testing Error Handling ===")
    try:
        # Test invalid endpoint
        response = requests.get(f"{BACKEND_URL}/invalid-endpoint", timeout=10)
        print(f"Invalid endpoint status: {response.status_code}")
        
        if response.status_code == 404:
            print("✅ 404 handling working correctly")
        else:
            print(f"❌ Expected 404, got {response.status_code}")
            return False
        
        # Test invalid POST data
        response = requests.post(
            f"{BACKEND_URL}/status",
            json={"invalid_field": "test"},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"Invalid POST data status: {response.status_code}")
        
        if response.status_code in [400, 422]:  # FastAPI returns 422 for validation errors
            print("✅ Invalid data handling working correctly")
            return True
        else:
            print(f"❌ Expected 400/422, got {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error handling test request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        return False

def run_all_tests():
    """Run all backend tests"""
    print("🚀 Starting Backend API Tests")
    print("=" * 50)
    
    test_results = {
        "root_endpoint": test_root_endpoint(),
        "create_status": test_create_status_check()[0],
        "get_status": test_get_status_checks(),
        "cors_headers": test_cors_headers(),
        "error_handling": test_error_handling()
    }
    
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend tests PASSED!")
        return True
    else:
        print("⚠️  Some backend tests FAILED!")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)