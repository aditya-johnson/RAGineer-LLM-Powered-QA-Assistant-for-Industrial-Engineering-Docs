#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime
from pathlib import Path

class RAGineerAPITester:
    def __init__(self, base_url="https://sop-query-helper.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.session = requests.Session()
        self.session.timeout = 30

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {error}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    test_headers.pop('Content-Type', None)
                    response = self.session.post(url, files=files, data=data, headers=test_headers)
                else:
                    response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text}

            if success:
                self.log_test(name, True, f"Status: {response.status_code}")
                return True, response_data
            else:
                self.log_test(name, False, error=f"Expected {expected_status}, got {response.status_code}. Response: {response_data}")
                return False, response_data

        except Exception as e:
            self.log_test(name, False, error=f"Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        self.run_test("Root Endpoint", "GET", "", 200)
        
        # Test health endpoint
        self.run_test("Health Check", "GET", "health", 200)

    def test_auth_flow(self):
        """Test authentication endpoints"""
        print("\n🔍 Testing Authentication...")
        
        # Test admin login with provided credentials
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@ragineer.com", "password": "admin123"}
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.token = self.admin_token  # Use admin token for subsequent tests
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
        
        # Test get current user
        if self.token:
            self.run_test("Get Current User", "GET", "auth/me", 200)
        
        # Test user registration
        test_user_data = {
            "email": f"test_user_{int(time.time())}@test.com",
            "password": "TestPass123!",
            "name": "Test User",
            "role": "engineer"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        # Test login with invalid credentials
        self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"email": "invalid@test.com", "password": "wrong"}
        )

    def test_user_management(self):
        """Test user management endpoints (admin only)"""
        print("\n🔍 Testing User Management...")
        
        if not self.admin_token:
            print("   Skipping user management tests - no admin token")
            return
        
        # List users
        success, users_response = self.run_test("List Users", "GET", "users", 200)
        
        if success and users_response:
            users = users_response if isinstance(users_response, list) else []
            if users:
                # Test update user role (find a non-admin user)
                test_user = None
                for user in users:
                    if user.get('role') != 'admin' and user.get('email') != 'admin@ragineer.com':
                        test_user = user
                        break
                
                if test_user:
                    self.run_test(
                        "Update User Role",
                        "PUT",
                        f"users/{test_user['id']}",
                        200,
                        data={"role": "viewer"}
                    )

    def test_document_management(self):
        """Test document upload and management"""
        print("\n🔍 Testing Document Management...")
        
        # List documents (should work for all authenticated users)
        success, docs_response = self.run_test("List Documents", "GET", "documents", 200)
        
        # Test document upload (requires admin/engineer role)
        if self.admin_token:
            # Create a test document
            test_content = """
            STANDARD OPERATING PROCEDURE
            
            Title: Safety Protocol for Industrial Equipment
            
            1. SCOPE
            This procedure applies to all personnel operating industrial equipment.
            
            2. SAFETY REQUIREMENTS
            - Always wear appropriate PPE
            - Conduct pre-operation inspection
            - Follow lockout/tagout procedures
            
            3. OPERATION STEPS
            Step 1: Verify equipment is in safe condition
            Step 2: Check all safety systems
            Step 3: Begin operation following manufacturer guidelines
            
            4. EMERGENCY PROCEDURES
            In case of emergency, immediately shut down equipment and notify supervisor.
            """
            
            # Create temporary file for upload
            test_file_path = Path("/tmp/test_sop.txt")
            test_file_path.write_text(test_content)
            
            try:
                with open(test_file_path, 'rb') as f:
                    files = {'file': ('test_sop.txt', f, 'text/plain')}
                    data = {
                        'title': 'Test Safety SOP',
                        'description': 'Test document for API testing',
                        'doc_type': 'sop'
                    }
                    
                    success, upload_response = self.run_test(
                        "Document Upload",
                        "POST",
                        "documents/upload",
                        200,
                        data=data,
                        files=files
                    )
                    
                    if success and 'id' in upload_response:
                        doc_id = upload_response['id']
                        print(f"   Document uploaded with ID: {doc_id}")
                        
                        # Test document deletion (admin only)
                        self.run_test(
                            "Document Delete",
                            "DELETE",
                            f"documents/{doc_id}",
                            200
                        )
            
            finally:
                # Clean up
                if test_file_path.exists():
                    test_file_path.unlink()
        
        # Test filtering documents by type
        self.run_test("Filter Documents by Type", "GET", "documents?doc_type=sop", 200)

    def test_chat_functionality(self):
        """Test chat and RAG functionality"""
        print("\n🔍 Testing Chat Functionality...")
        
        # List chat sessions
        self.run_test("List Chat Sessions", "GET", "chat/sessions", 200)
        
        # Send a chat message
        success, chat_response = self.run_test(
            "Send Chat Message",
            "POST",
            "chat",
            200,
            data={"message": "What are the safety requirements for industrial equipment?"}
        )
        
        if success and 'session_id' in chat_response:
            session_id = chat_response['session_id']
            print(f"   Chat session created: {session_id}")
            
            # Wait a moment for processing
            time.sleep(2)
            
            # Get session messages
            self.run_test(
                "Get Session Messages",
                "GET",
                f"chat/sessions/{session_id}/messages",
                200
            )
            
            # Send follow-up message
            self.run_test(
                "Send Follow-up Message",
                "POST",
                "chat",
                200,
                data={"message": "Can you provide more details about PPE requirements?", "session_id": session_id}
            )
            
            # Delete session
            self.run_test(
                "Delete Chat Session",
                "DELETE",
                f"chat/sessions/{session_id}",
                200
            )

    def test_stats_endpoint(self):
        """Test statistics endpoint"""
        print("\n🔍 Testing Statistics...")
        
        success, stats_response = self.run_test("Get Statistics", "GET", "stats", 200)
        
        if success:
            expected_fields = ['total_documents', 'total_users', 'my_sessions']
            for field in expected_fields:
                if field not in stats_response:
                    self.log_test(f"Stats Field: {field}", False, error=f"Missing field {field}")
                else:
                    self.log_test(f"Stats Field: {field}", True, f"Value: {stats_response[field]}")

    def test_rbac_permissions(self):
        """Test Role-Based Access Control"""
        print("\n🔍 Testing RBAC Permissions...")
        
        # Create a viewer user to test limited permissions
        viewer_data = {
            "email": f"viewer_{int(time.time())}@test.com",
            "password": "ViewerPass123!",
            "name": "Test Viewer",
            "role": "viewer"
        }
        
        success, response = self.run_test(
            "Create Viewer User",
            "POST",
            "auth/register",
            200,
            data=viewer_data
        )
        
        if success and 'access_token' in response:
            viewer_token = response['access_token']
            
            # Test viewer trying to upload document (should fail)
            original_token = self.token
            self.token = viewer_token
            
            test_content = "Test content for permission test"
            test_file_path = Path("/tmp/test_permission.txt")
            test_file_path.write_text(test_content)
            
            try:
                with open(test_file_path, 'rb') as f:
                    files = {'file': ('test_permission.txt', f, 'text/plain')}
                    data = {'title': 'Permission Test', 'doc_type': 'other'}
                    
                    self.run_test(
                        "Viewer Upload (Should Fail)",
                        "POST",
                        "documents/upload",
                        403,  # Should be forbidden
                        data=data,
                        files=files
                    )
            finally:
                if test_file_path.exists():
                    test_file_path.unlink()
                self.token = original_token  # Restore admin token

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting RAGineer API Tests...")
        print(f"Testing against: {self.base_url}")
        
        start_time = time.time()
        
        try:
            self.test_health_check()
            self.test_auth_flow()
            self.test_user_management()
            self.test_document_management()
            self.test_chat_functionality()
            self.test_stats_endpoint()
            self.test_rbac_permissions()
            
        except KeyboardInterrupt:
            print("\n⚠️ Tests interrupted by user")
        except Exception as e:
            print(f"\n💥 Unexpected error: {e}")
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Tests failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        print(f"   Duration: {duration:.2f}s")
        
        # Save detailed results
        results = {
            "summary": {
                "tests_run": self.tests_run,
                "tests_passed": self.tests_passed,
                "success_rate": self.tests_passed/self.tests_run*100 if self.tests_run > 0 else 0,
                "duration": duration,
                "timestamp": datetime.now().isoformat()
            },
            "test_results": self.test_results
        }
        
        results_file = Path("/tmp/ragineer_test_results.json")
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: {results_file}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = RAGineerAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())