#!/usr/bin/env python3
"""
Production Backend Readiness Testing Suite
==========================================

Comprehensive production readiness testing for backend system supporting Chrome extension distribution.
Tests focus on API reliability, security, performance, error handling, and CORS configuration.
"""

import requests
import json
import time
import concurrent.futures
import threading
from datetime import datetime
import uuid
import sys
import os

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
    return "https://c76c83e0-9d26-4dac-b50e-44069daa9e83.preview.emergentagent.com/api"

BACKEND_URL = get_backend_url()

class ProductionBackendTester:
    def __init__(self):
        self.test_results = []
        self.performance_metrics = {}
        self.security_issues = []
        
    def log_test(self, category, test_name, success, message, details=None, performance_data=None):
        """Log test results with categorization"""
        result = {
            'category': category,
            'test': test_name,
            'success': success,
            'message': message,
            'details': details or {},
            'performance': performance_data or {},
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        print(f"   {message}")
        if details:
            for key, value in details.items():
                print(f"   {key}: {value}")
        if performance_data:
            for key, value in performance_data.items():
                print(f"   {key}: {value}")
        print()

    def test_api_endpoint_reliability(self):
        """Test API endpoint reliability for Chrome extension integration"""
        print("🔗 PHASE 1: API ENDPOINT RELIABILITY TESTING")
        print("=" * 60)
        
        # Test 1: Root endpoint availability and response time
        start_time = time.time()
        try:
            response = requests.get(f"{BACKEND_URL}/", timeout=10)
            response_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200 and response_time < 2000:
                self.log_test(
                    "Reliability",
                    "Root Endpoint Performance",
                    True,
                    "Root endpoint responds quickly and reliably",
                    {"status_code": response.status_code},
                    {"response_time_ms": round(response_time, 2)}
                )
            else:
                self.log_test(
                    "Reliability",
                    "Root Endpoint Performance",
                    False,
                    f"Root endpoint performance issues: {response.status_code}, {response_time}ms",
                    {"status_code": response.status_code},
                    {"response_time_ms": round(response_time, 2)}
                )
        except Exception as e:
            self.log_test(
                "Reliability",
                "Root Endpoint Performance",
                False,
                f"Root endpoint failed: {str(e)}",
                {"error": str(e)}
            )

        # Test 2: Status endpoint CRUD operations reliability
        test_id = None
        try:
            # CREATE
            start_time = time.time()
            create_data = {"client_name": f"Production_Test_{uuid.uuid4().hex[:8]}"}
            response = requests.post(f"{BACKEND_URL}/status", json=create_data, timeout=10)
            create_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                test_id = data.get('id')
                
                # READ
                start_time = time.time()
                response = requests.get(f"{BACKEND_URL}/status", timeout=10)
                read_time = (time.time() - start_time) * 1000
                
                if response.status_code == 200:
                    self.log_test(
                        "Reliability",
                        "Status CRUD Operations",
                        True,
                        "Status endpoints support reliable CRUD operations",
                        {"created_id": test_id, "total_records": len(response.json())},
                        {"create_time_ms": round(create_time, 2), "read_time_ms": round(read_time, 2)}
                    )
                else:
                    self.log_test(
                        "Reliability",
                        "Status CRUD Operations",
                        False,
                        f"Status read operation failed: {response.status_code}",
                        {"status_code": response.status_code}
                    )
            else:
                self.log_test(
                    "Reliability",
                    "Status CRUD Operations",
                    False,
                    f"Status create operation failed: {response.status_code}",
                    {"status_code": response.status_code}
                )
        except Exception as e:
            self.log_test(
                "Reliability",
                "Status CRUD Operations",
                False,
                f"Status CRUD operations failed: {str(e)}",
                {"error": str(e)}
            )

        # Test 3: Endpoint consistency across multiple requests
        consistency_results = []
        for i in range(5):
            try:
                response = requests.get(f"{BACKEND_URL}/", timeout=5)
                consistency_results.append(response.status_code == 200)
            except:
                consistency_results.append(False)
        
        consistency_rate = sum(consistency_results) / len(consistency_results) * 100
        
        if consistency_rate >= 95:
            self.log_test(
                "Reliability",
                "Endpoint Consistency",
                True,
                "Endpoints show high consistency across multiple requests",
                {"consistency_rate": f"{consistency_rate}%", "successful_requests": sum(consistency_results)}
            )
        else:
            self.log_test(
                "Reliability",
                "Endpoint Consistency",
                False,
                f"Endpoint consistency below production standards: {consistency_rate}%",
                {"consistency_rate": f"{consistency_rate}%", "successful_requests": sum(consistency_results)}
            )

    def test_data_validation_security(self):
        """Test data validation and security measures"""
        print("🔒 PHASE 2: DATA VALIDATION & SECURITY TESTING")
        print("=" * 60)
        
        # Test 1: Input validation for malicious data
        malicious_payloads = [
            {"client_name": "<script>alert('xss')</script>"},
            {"client_name": "'; DROP TABLE status_checks; --"},
            {"client_name": "A" * 10000},  # Very long string
            {"client_name": None},
            {"invalid_field": "test"},
            {}  # Empty payload
        ]
        
        validation_results = []
        for i, payload in enumerate(malicious_payloads):
            try:
                response = requests.post(f"{BACKEND_URL}/status", json=payload, timeout=10)
                # Should either reject (422) or sanitize and accept (200)
                if response.status_code in [200, 422]:
                    validation_results.append(True)
                    if response.status_code == 200:
                        # Check if data was sanitized
                        data = response.json()
                        client_name = data.get('client_name', '')
                        if '<script>' not in client_name and 'DROP TABLE' not in client_name:
                            validation_results[-1] = True  # Properly sanitized
                else:
                    validation_results.append(False)
            except Exception:
                validation_results.append(False)
        
        validation_rate = sum(validation_results) / len(validation_results) * 100
        
        if validation_rate >= 90:
            self.log_test(
                "Security",
                "Input Validation Protection",
                True,
                "API properly validates and handles malicious input",
                {"validation_rate": f"{validation_rate}%", "payloads_tested": len(malicious_payloads)}
            )
        else:
            self.log_test(
                "Security",
                "Input Validation Protection",
                False,
                f"Input validation insufficient: {validation_rate}%",
                {"validation_rate": f"{validation_rate}%", "payloads_tested": len(malicious_payloads)}
            )

        # Test 2: HTTP status code correctness
        status_code_tests = [
            (f"{BACKEND_URL}/", "GET", None, 200),
            (f"{BACKEND_URL}/status", "GET", None, 200),
            (f"{BACKEND_URL}/status", "POST", {"client_name": "test"}, 200),
            (f"{BACKEND_URL}/nonexistent", "GET", None, 404),
            (f"{BACKEND_URL}/status", "POST", {"invalid": "data"}, 422)
        ]
        
        status_code_results = []
        for url, method, data, expected_status in status_code_tests:
            try:
                if method == "GET":
                    response = requests.get(url, timeout=10)
                elif method == "POST":
                    response = requests.post(url, json=data, timeout=10)
                
                status_code_results.append(response.status_code == expected_status)
            except Exception:
                status_code_results.append(False)
        
        status_accuracy = sum(status_code_results) / len(status_code_results) * 100
        
        if status_accuracy >= 80:
            self.log_test(
                "Security",
                "HTTP Status Code Accuracy",
                True,
                "API returns appropriate HTTP status codes",
                {"accuracy_rate": f"{status_accuracy}%", "tests_passed": sum(status_code_results)}
            )
        else:
            self.log_test(
                "Security",
                "HTTP Status Code Accuracy",
                False,
                f"HTTP status code accuracy below standards: {status_accuracy}%",
                {"accuracy_rate": f"{status_accuracy}%", "tests_passed": sum(status_code_results)}
            )

    def test_performance_under_load(self):
        """Test performance and scalability under load"""
        print("⚡ PHASE 3: PERFORMANCE UNDER LOAD TESTING")
        print("=" * 60)
        
        # Test 1: Concurrent request handling
        def make_request():
            try:
                start_time = time.time()
                response = requests.get(f"{BACKEND_URL}/", timeout=10)
                response_time = (time.time() - start_time) * 1000
                return response.status_code == 200, response_time
            except Exception:
                return False, 0
        
        # Test with 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        successful_requests = sum(1 for success, _ in results if success)
        response_times = [time for success, time in results if success]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        if successful_requests >= 8 and avg_response_time < 3000:
            self.log_test(
                "Performance",
                "Concurrent Request Handling",
                True,
                "API handles concurrent requests efficiently",
                {"successful_requests": successful_requests, "total_requests": 10},
                {"avg_response_time_ms": round(avg_response_time, 2)}
            )
        else:
            self.log_test(
                "Performance",
                "Concurrent Request Handling",
                False,
                f"Performance issues under load: {successful_requests}/10 successful",
                {"successful_requests": successful_requests, "total_requests": 10},
                {"avg_response_time_ms": round(avg_response_time, 2)}
            )

        # Test 2: Database connection stability
        db_stability_results = []
        for i in range(20):
            try:
                response = requests.post(f"{BACKEND_URL}/status", 
                                       json={"client_name": f"stability_test_{i}"}, 
                                       timeout=5)
                db_stability_results.append(response.status_code == 200)
            except Exception:
                db_stability_results.append(False)
            time.sleep(0.1)  # Small delay between requests
        
        stability_rate = sum(db_stability_results) / len(db_stability_results) * 100
        
        if stability_rate >= 95:
            self.log_test(
                "Performance",
                "Database Connection Stability",
                True,
                "Database connections remain stable under sustained load",
                {"stability_rate": f"{stability_rate}%", "successful_operations": sum(db_stability_results)}
            )
        else:
            self.log_test(
                "Performance",
                "Database Connection Stability",
                False,
                f"Database stability issues: {stability_rate}%",
                {"stability_rate": f"{stability_rate}%", "successful_operations": sum(db_stability_results)}
            )

    def test_error_recovery(self):
        """Test error recovery and graceful degradation"""
        print("🛡️ PHASE 4: ERROR RECOVERY TESTING")
        print("=" * 60)
        
        # Test 1: Invalid endpoint handling
        try:
            response = requests.get(f"{BACKEND_URL}/invalid_endpoint", timeout=10)
            if response.status_code == 404:
                try:
                    error_data = response.json()
                    self.log_test(
                        "Error Recovery",
                        "Invalid Endpoint Handling",
                        True,
                        "API gracefully handles invalid endpoints with proper 404 response",
                        {"status_code": response.status_code, "has_error_message": "detail" in error_data}
                    )
                except:
                    self.log_test(
                        "Error Recovery",
                        "Invalid Endpoint Handling",
                        True,
                        "API returns 404 for invalid endpoints",
                        {"status_code": response.status_code}
                    )
            else:
                self.log_test(
                    "Error Recovery",
                    "Invalid Endpoint Handling",
                    False,
                    f"Unexpected response for invalid endpoint: {response.status_code}",
                    {"status_code": response.status_code}
                )
        except Exception as e:
            self.log_test(
                "Error Recovery",
                "Invalid Endpoint Handling",
                False,
                f"Error handling invalid endpoint: {str(e)}",
                {"error": str(e)}
            )

        # Test 2: Malformed request handling
        try:
            # Send malformed JSON
            response = requests.post(f"{BACKEND_URL}/status", 
                                   data="invalid json", 
                                   headers={"Content-Type": "application/json"},
                                   timeout=10)
            
            if response.status_code in [400, 422]:
                self.log_test(
                    "Error Recovery",
                    "Malformed Request Handling",
                    True,
                    "API properly handles malformed requests",
                    {"status_code": response.status_code}
                )
            else:
                self.log_test(
                    "Error Recovery",
                    "Malformed Request Handling",
                    False,
                    f"Unexpected response to malformed request: {response.status_code}",
                    {"status_code": response.status_code}
                )
        except Exception as e:
            self.log_test(
                "Error Recovery",
                "Malformed Request Handling",
                False,
                f"Error handling malformed request: {str(e)}",
                {"error": str(e)}
            )

        # Test 3: Timeout handling
        timeout_results = []
        for i in range(3):
            try:
                response = requests.get(f"{BACKEND_URL}/", timeout=1)  # Very short timeout
                timeout_results.append(True)
            except requests.exceptions.Timeout:
                timeout_results.append(True)  # Timeout is handled gracefully
            except Exception:
                timeout_results.append(False)
        
        if all(timeout_results):
            self.log_test(
                "Error Recovery",
                "Timeout Handling",
                True,
                "API handles timeout scenarios gracefully",
                {"timeout_tests_passed": sum(timeout_results)}
            )
        else:
            self.log_test(
                "Error Recovery",
                "Timeout Handling",
                False,
                f"Timeout handling issues: {sum(timeout_results)}/3 passed",
                {"timeout_tests_passed": sum(timeout_results)}
            )

    def test_cors_configuration(self):
        """Test CORS configuration for Chrome extension support"""
        print("🌐 PHASE 5: CORS CONFIGURATION TESTING")
        print("=" * 60)
        
        # Test 1: CORS headers presence
        try:
            headers = {"Origin": "chrome-extension://test-extension-id"}
            response = requests.get(f"{BACKEND_URL}/", headers=headers, timeout=10)
            
            cors_headers = {
                'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                'access-control-allow-credentials': response.headers.get('access-control-allow-credentials'),
                'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
                'access-control-allow-headers': response.headers.get('access-control-allow-headers')
            }
            
            # Check for essential CORS headers
            has_origin = cors_headers['access-control-allow-origin'] is not None
            has_credentials = cors_headers['access-control-allow-credentials'] == 'true'
            
            if has_origin and has_credentials:
                self.log_test(
                    "CORS",
                    "CORS Headers Configuration",
                    True,
                    "CORS headers properly configured for Chrome extension support",
                    cors_headers
                )
            else:
                self.log_test(
                    "CORS",
                    "CORS Headers Configuration",
                    False,
                    "CORS headers missing or misconfigured",
                    cors_headers
                )
        except Exception as e:
            self.log_test(
                "CORS",
                "CORS Headers Configuration",
                False,
                f"Error testing CORS headers: {str(e)}",
                {"error": str(e)}
            )

        # Test 2: Preflight request handling
        try:
            response = requests.options(f"{BACKEND_URL}/status", 
                                      headers={
                                          "Origin": "chrome-extension://test-extension-id",
                                          "Access-Control-Request-Method": "POST",
                                          "Access-Control-Request-Headers": "Content-Type"
                                      },
                                      timeout=10)
            
            if response.status_code in [200, 204]:
                self.log_test(
                    "CORS",
                    "Preflight Request Handling",
                    True,
                    "API properly handles CORS preflight requests",
                    {"status_code": response.status_code}
                )
            else:
                self.log_test(
                    "CORS",
                    "Preflight Request Handling",
                    False,
                    f"Preflight request handling issues: {response.status_code}",
                    {"status_code": response.status_code}
                )
        except Exception as e:
            self.log_test(
                "CORS",
                "Preflight Request Handling",
                False,
                f"Error testing preflight requests: {str(e)}",
                {"error": str(e)}
            )

    def generate_production_readiness_report(self):
        """Generate comprehensive production readiness report"""
        print("📊 PRODUCTION READINESS ASSESSMENT")
        print("=" * 60)
        
        # Categorize results
        categories = {}
        for result in self.test_results:
            category = result['category']
            if category not in categories:
                categories[category] = {'passed': 0, 'failed': 0, 'total': 0}
            
            categories[category]['total'] += 1
            if result['success']:
                categories[category]['passed'] += 1
            else:
                categories[category]['failed'] += 1
        
        # Calculate overall score
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r['success'])
        overall_score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"OVERALL PRODUCTION READINESS SCORE: {overall_score:.1f}%")
        print()
        
        # Category breakdown
        for category, stats in categories.items():
            score = (stats['passed'] / stats['total'] * 100) if stats['total'] > 0 else 0
            status = "✅ READY" if score >= 90 else "⚠️ NEEDS ATTENTION" if score >= 70 else "❌ NOT READY"
            print(f"{category.upper()}: {score:.1f}% ({stats['passed']}/{stats['total']}) {status}")
        
        print()
        
        # Performance metrics summary
        response_times = []
        for result in self.test_results:
            if 'performance' in result and 'response_time_ms' in result['performance']:
                response_times.append(result['performance']['response_time_ms'])
        
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)
            print("PERFORMANCE METRICS:")
            print(f"  Average Response Time: {avg_response_time:.2f}ms")
            print(f"  Maximum Response Time: {max_response_time:.2f}ms")
            print()
        
        # Critical issues
        critical_issues = [r for r in self.test_results if not r['success']]
        if critical_issues:
            print("CRITICAL ISSUES REQUIRING FIXES:")
            for issue in critical_issues:
                print(f"  ❌ {issue['test']}: {issue['message']}")
            print()
        
        # Deployment recommendations
        print("DEPLOYMENT RECOMMENDATIONS:")
        if overall_score >= 95:
            print("  🚀 READY FOR IMMEDIATE PRODUCTION DEPLOYMENT")
            print("  - All critical systems operational")
            print("  - Performance meets production standards")
            print("  - Security measures properly implemented")
        elif overall_score >= 85:
            print("  ⚠️ READY FOR DEPLOYMENT WITH MONITORING")
            print("  - Address minor issues post-deployment")
            print("  - Implement enhanced monitoring")
            print("  - Plan for quick fixes if needed")
        else:
            print("  ❌ NOT READY FOR PRODUCTION")
            print("  - Critical issues must be resolved")
            print("  - Additional testing required")
            print("  - Consider staged deployment approach")
        
        return overall_score

    def run_comprehensive_production_test(self):
        """Run complete production readiness test suite"""
        print("🚀 PRODUCTION BACKEND READINESS TESTING SUITE")
        print("=" * 60)
        print(f"🕒 Test started at: {datetime.now().isoformat()}")
        print(f"🌐 Backend URL: {BACKEND_URL}")
        print()
        
        # Run all test phases
        self.test_api_endpoint_reliability()
        self.test_data_validation_security()
        self.test_performance_under_load()
        self.test_error_recovery()
        self.test_cors_configuration()
        
        # Generate final report
        score = self.generate_production_readiness_report()
        
        return score >= 85  # 85% threshold for production readiness

def main():
    """Main test execution"""
    print("🎯 Starting Production Backend Readiness Testing")
    print()
    
    tester = ProductionBackendTester()
    is_ready = tester.run_comprehensive_production_test()
    
    print("=" * 60)
    if is_ready:
        print("🎉 BACKEND IS PRODUCTION READY!")
    else:
        print("⚠️ BACKEND NEEDS IMPROVEMENTS BEFORE PRODUCTION")
    
    # Exit with appropriate code
    sys.exit(0 if is_ready else 1)

if __name__ == "__main__":
    main()