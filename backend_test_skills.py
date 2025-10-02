#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class SkillsModuleBackendTester:
    def __init__(self, base_url="https://behavior-bridge.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.test_user = None
        self.test_partner = None
        self.tests_run = 0
        self.tests_passed = 0

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED {details}")
        else:
            print(f"❌ {name}: FAILED {details}")
        return success

    def test_api_health(self):
        """Test if API is accessible"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            return self.log_test("API Health Check", success, f"Status: {response.status_code}")
        except Exception as e:
            return self.log_test("API Health Check", False, f"Error: {str(e)}")

    def create_test_users(self):
        """Create test users for skills module testing"""
        try:
            # Create first user
            user1_data = {
                "name": f"Skills_User_{datetime.now().strftime('%H%M%S')}",
                "email": f"skills_user_{datetime.now().strftime('%H%M%S')}@test.com"
            }
            
            response1 = requests.post(f"{self.api_url}/users", json=user1_data, timeout=10)
            if response1.status_code != 200:
                return self.log_test("Create Test Users", False, f"User1 creation failed: {response1.status_code}")
            
            self.test_user = response1.json()
            
            # Create second user (partner)
            user2_data = {
                "name": f"Skills_Partner_{datetime.now().strftime('%H%M%S')}",
                "email": f"skills_partner_{datetime.now().strftime('%H%M%S')}@test.com"
            }
            
            response2 = requests.post(f"{self.api_url}/users", json=user2_data, timeout=10)
            if response2.status_code != 200:
                return self.log_test("Create Test Users", False, f"User2 creation failed: {response2.status_code}")
            
            self.test_partner = response2.json()
            
            # Pair the users
            pair_data = {"pairing_code": self.test_partner["pairing_code"]}
            pair_response = requests.post(f"{self.api_url}/users/{self.test_user['id']}/pair", json=pair_data, timeout=10)
            
            if pair_response.status_code != 200:
                return self.log_test("Create Test Users", False, f"Pairing failed: {pair_response.status_code}")
            
            return self.log_test("Create Test Users", True, f"Created and paired users: {self.test_user['name']} & {self.test_partner['name']}")
            
        except Exception as e:
            return self.log_test("Create Test Users", False, f"Error: {str(e)}")

    def test_points_award_endpoint(self):
        """Test the points award endpoint used by Skills Module"""
        if not self.test_user or not self.test_partner:
            return self.log_test("Points Award Endpoint", False, "No test users available")
        
        try:
            # Test awarding points for skills module completion
            award_data = {
                "partner_id": self.test_partner["id"],
                "points": 3,
                "transaction_type": "earned",
                "description": "أكمل وحدة مهارة: مهارة الاستراحة والتهدئة الذاتية"
            }
            
            response = requests.post(
                f"{self.api_url}/points/award?user_id={self.test_user['id']}", 
                json=award_data, 
                timeout=10
            )
            
            success = response.status_code == 200
            if success:
                # Verify partner received points
                partner_response = requests.get(f"{self.api_url}/users/{self.test_partner['id']}", timeout=10)
                if partner_response.status_code == 200:
                    partner_data = partner_response.json()
                    points_received = partner_data.get("points", 0) >= 3
                    return self.log_test("Points Award Endpoint", points_received, 
                                       f"Partner received {partner_data.get('points', 0)} points")
                else:
                    return self.log_test("Points Award Endpoint", False, "Could not verify partner points")
            else:
                return self.log_test("Points Award Endpoint", False, f"Award failed: {response.status_code}")
                
        except Exception as e:
            return self.log_test("Points Award Endpoint", False, f"Error: {str(e)}")

    def test_dashboard_endpoint(self):
        """Test dashboard endpoint that Skills Module users will access"""
        if not self.test_user:
            return self.log_test("Dashboard Endpoint", False, "No test user available")
        
        try:
            response = requests.get(f"{self.api_url}/dashboard/{self.test_user['id']}", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_user = "user" in data
                has_partner = "partner" in data
                return self.log_test("Dashboard Endpoint", has_user and has_partner, 
                                   f"Dashboard data complete: user={has_user}, partner={has_partner}")
            else:
                return self.log_test("Dashboard Endpoint", False, f"Status: {response.status_code}")
                
        except Exception as e:
            return self.log_test("Dashboard Endpoint", False, f"Error: {str(e)}")

    def test_points_history_endpoint(self):
        """Test points history endpoint for tracking skills module completions"""
        if not self.test_user:
            return self.log_test("Points History Endpoint", False, "No test user available")
        
        try:
            response = requests.get(f"{self.api_url}/points/{self.test_user['id']}/history", timeout=10)
            success = response.status_code == 200
            
            if success:
                history = response.json()
                is_list = isinstance(history, list)
                return self.log_test("Points History Endpoint", is_list, 
                                   f"History returned {len(history) if is_list else 0} transactions")
            else:
                return self.log_test("Points History Endpoint", False, f"Status: {response.status_code}")
                
        except Exception as e:
            return self.log_test("Points History Endpoint", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests for Skills Module integration"""
        print("🧪 Starting Skills Module Backend Integration Tests")
        print("=" * 60)
        
        # Test API connectivity
        if not self.test_api_health():
            print("❌ API not accessible, stopping tests")
            return False
        
        # Create test users
        if not self.create_test_users():
            print("❌ Could not create test users, stopping tests")
            return False
        
        # Test Skills Module related endpoints
        self.test_points_award_endpoint()
        self.test_dashboard_endpoint() 
        self.test_points_history_endpoint()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Skills Module Backend Tests Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("✅ All Skills Module backend integration tests PASSED!")
            return True
        else:
            print(f"❌ {self.tests_run - self.tests_passed} tests FAILED")
            return False

def main():
    tester = SkillsModuleBackendTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())