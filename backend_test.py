#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Mithaq Arabic Couples Counseling App
Tests all endpoints including user management, pairing, behavior analysis, and reinforcement system
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class MithaqAPITester:
    def __init__(self, base_url="https://marriage-help.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.test_users = []
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
        
        result = {
            "test_name": name,
            "status": status,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status} - {name}: {details}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, params=params)
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_health_check(self):
        """Test API health check"""
        success, data, status = self.make_request('GET', '')
        expected_message = "Mithaq API is running"
        
        if success and data.get('message') == expected_message:
            self.log_test("Health Check", True, f"API is running - Status: {status}")
            return True
        else:
            self.log_test("Health Check", False, f"API health check failed - Status: {status}, Data: {data}")
            return False

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        
        # Test User 1
        user1_data = {
            "name": f"أحمد محمد {timestamp}",
            "email": f"ahmed_{timestamp}@test.com"
        }
        
        success, data, status = self.make_request('POST', 'users', user1_data)
        
        if success and status == 200 and 'id' in data and 'pairing_code' in data:
            self.test_users.append(data)
            self.log_test("User Registration 1", True, f"User created with ID: {data['id']}, Pairing Code: {data['pairing_code']}")
            
            # Test User 2
            user2_data = {
                "name": f"فاطمة أحمد {timestamp}",
                "email": f"fatima_{timestamp}@test.com"
            }
            
            success2, data2, status2 = self.make_request('POST', 'users', user2_data)
            
            if success2 and status2 == 200 and 'id' in data2 and 'pairing_code' in data2:
                self.test_users.append(data2)
                self.log_test("User Registration 2", True, f"User created with ID: {data2['id']}, Pairing Code: {data2['pairing_code']}")
                return True
            else:
                self.log_test("User Registration 2", False, f"Failed to create second user - Status: {status2}, Data: {data2}")
                return False
        else:
            self.log_test("User Registration 1", False, f"Failed to create first user - Status: {status}, Data: {data}")
            return False

    def test_duplicate_email_registration(self):
        """Test that duplicate email registration fails"""
        if not self.test_users:
            self.log_test("Duplicate Email Test", False, "No test users available")
            return False
            
        duplicate_data = {
            "name": "محاولة تكرار",
            "email": self.test_users[0]['email']
        }
        
        success, data, status = self.make_request('POST', 'users', duplicate_data)
        
        if not success and status == 400:
            self.log_test("Duplicate Email Prevention", True, "Correctly prevented duplicate email registration")
            return True
        else:
            self.log_test("Duplicate Email Prevention", False, f"Should have failed with 400, got Status: {status}")
            return False

    def test_user_retrieval(self):
        """Test retrieving user by ID"""
        if not self.test_users:
            self.log_test("User Retrieval", False, "No test users available")
            return False
            
        user_id = self.test_users[0]['id']
        success, data, status = self.make_request('GET', f'users/{user_id}')
        
        if success and status == 200 and data.get('id') == user_id:
            self.log_test("User Retrieval", True, f"Successfully retrieved user: {data['name']}")
            return True
        else:
            self.log_test("User Retrieval", False, f"Failed to retrieve user - Status: {status}, Data: {data}")
            return False

    def test_user_login_success(self):
        """Test successful user login with existing email"""
        if not self.test_users:
            self.log_test("User Login Success", False, "No test users available")
            return False
            
        # Use the first registered user's email for login
        login_data = {
            "email": self.test_users[0]['email']
        }
        
        success, data, status = self.make_request('POST', 'login', login_data)
        
        if success and status == 200 and data.get('email') == login_data['email']:
            self.log_test("User Login Success", True, f"Successfully logged in user: {data['name']} with email: {data['email']}")
            return True
        else:
            self.log_test("User Login Success", False, f"Failed to login user - Status: {status}, Data: {data}")
            return False

    def test_user_login_invalid_email(self):
        """Test login with non-existent email"""
        login_data = {
            "email": "nonexistent@test.com"
        }
        
        success, data, status = self.make_request('POST', 'login', login_data)
        
        if not success and status == 404:
            self.log_test("User Login Invalid Email", True, "Correctly rejected login with non-existent email")
            return True
        else:
            self.log_test("User Login Invalid Email", False, f"Should have failed with 404, got Status: {status}, Data: {data}")
            return False

    def test_user_pairing(self):
        """Test pairing two users"""
        if len(self.test_users) < 2:
            self.log_test("User Pairing", False, "Need at least 2 users for pairing test")
            return False
            
        user1 = self.test_users[0]
        user2 = self.test_users[1]
        
        # Pair user1 with user2's code
        pair_data = {"pairing_code": user2['pairing_code']}
        success, data, status = self.make_request('POST', f'users/{user1["id"]}/pair', pair_data)
        
        if success and status == 200 and 'partner_name' in data:
            self.log_test("User Pairing", True, f"Successfully paired {user1['name']} with {data['partner_name']}")
            
            # Update user objects with partner info
            self.test_users[0]['partner_id'] = user2['id']
            self.test_users[1]['partner_id'] = user1['id']
            return True
        else:
            self.log_test("User Pairing", False, f"Failed to pair users - Status: {status}, Data: {data}")
            return False

    def test_invalid_pairing_code(self):
        """Test pairing with invalid code"""
        if not self.test_users:
            self.log_test("Invalid Pairing Code", False, "No test users available")
            return False
            
        invalid_pair_data = {"pairing_code": "INVALID1"}
        success, data, status = self.make_request('POST', f'users/{self.test_users[0]["id"]}/pair', invalid_pair_data)
        
        if not success and status == 404:
            self.log_test("Invalid Pairing Code", True, "Correctly rejected invalid pairing code")
            return True
        else:
            self.log_test("Invalid Pairing Code", False, f"Should have failed with 404, got Status: {status}")
            return False

    def test_behavior_entry_creation(self):
        """Test creating behavior entries"""
        if not self.test_users:
            self.log_test("Behavior Entry Creation", False, "No test users available")
            return False
            
        user_id = self.test_users[0]['id']
        
        # Test positive behavior
        positive_behavior = {
            "antecedent": "طلبت المساعدة في ترتيب المنزل",
            "behavior": "شكرني وساعدني فوراً بابتسامة",
            "consequence": "شعرت بالسعادة وتحسن الجو بيننا",
            "behavior_type": "positive"
        }
        
        success, data, status = self.make_request('POST', f'behaviors?user_id={user_id}', positive_behavior)
        
        if success and status == 200 and data.get('behavior_type') == 'positive':
            self.log_test("Positive Behavior Entry", True, f"Created positive behavior entry: {data['id']}")
            
            # Test negative behavior
            negative_behavior = {
                "antecedent": "تأخر شريكي عن الموعد المحدد",
                "behavior": "غضبت ورفعت صوتي عليه",
                "consequence": "توتر الجو وانسحب من النقاش",
                "behavior_type": "negative"
            }
            
            success2, data2, status2 = self.make_request('POST', f'behaviors?user_id={user_id}', negative_behavior)
            
            if success2 and status2 == 200 and data2.get('behavior_type') == 'negative':
                self.log_test("Negative Behavior Entry", True, f"Created negative behavior entry: {data2['id']}")
                return True
            else:
                self.log_test("Negative Behavior Entry", False, f"Failed to create negative behavior - Status: {status2}")
                return False
        else:
            self.log_test("Positive Behavior Entry", False, f"Failed to create positive behavior - Status: {status}")
            return False

    def test_behavior_retrieval(self):
        """Test retrieving user behaviors"""
        if not self.test_users:
            self.log_test("Behavior Retrieval", False, "No test users available")
            return False
            
        user_id = self.test_users[0]['id']
        success, data, status = self.make_request('GET', f'behaviors/{user_id}')
        
        if success and status == 200 and isinstance(data, list):
            self.log_test("Behavior Retrieval", True, f"Retrieved {len(data)} behaviors for user")
            return True
        else:
            self.log_test("Behavior Retrieval", False, f"Failed to retrieve behaviors - Status: {status}")
            return False

    def test_behavior_patterns(self):
        """Test behavior pattern analysis"""
        if not self.test_users:
            self.log_test("Behavior Patterns", False, "No test users available")
            return False
            
        user_id = self.test_users[0]['id']
        success, data, status = self.make_request('GET', f'behaviors/{user_id}/patterns')
        
        if success and status == 200 and 'patterns' in data:
            self.log_test("Behavior Patterns", True, f"Retrieved behavior patterns: {len(data['patterns'])} patterns found")
            return True
        else:
            self.log_test("Behavior Patterns", False, f"Failed to retrieve patterns - Status: {status}")
            return False

    def test_reinforcement_categories(self):
        """Test getting reinforcement categories"""
        success, data, status = self.make_request('GET', 'reinforcement-categories')
        
        if success and status == 200 and 'categories' in data and len(data['categories']) > 0:
            self.log_test("Reinforcement Categories", True, f"Retrieved {len(data['categories'])} categories")
            return True
        else:
            self.log_test("Reinforcement Categories", False, f"Failed to retrieve categories - Status: {status}")
            return False

    def test_reinforcement_templates(self):
        """Test getting reinforcement templates - BETA FEATURE: Expanded Rewards System"""
        success, data, status = self.make_request('GET', 'reinforcement-templates')
        
        if success and status == 200 and 'templates' in data and len(data['templates']) > 0:
            templates = data['templates']
            
            # BETA TEST: Verify we have exactly 10 specific Arabic rewards
            expected_rewards = [
                {"title": "كلمة شكر محددة ومركزة", "cost": 5},
                {"title": "عناق لمدة 30 ثانية", "cost": 10},
                {"title": "استلام مهمة صغيرة من واجبات الشريك", "cost": 15},
                {"title": "اختيار الموسيقى أو قائمة التشغيل للمنزل", "cost": 20},
                {"title": "20 دقيقة انتباه كامل وغير مقسوم", "cost": 25},
                {"title": "شراء طعام جاهز بدلاً من الطبخ", "cost": 30},
                {"title": "مساج مريح لمدة 20 دقيقة", "cost": 35},
                {"title": "هدية رمزية صغيرة (يتم شراؤها في أقرب فرصة)", "cost": 50},
                {"title": "تجهيز عشاء فاخر في المنزل أو خارجه", "cost": 75},
                {"title": "أمسية رومانسية مخطط لها بالكامل (Date Night)", "cost": 100}
            ]
            
            if len(templates) == 10:
                # Check if all expected rewards are present with correct costs
                found_rewards = 0
                for expected in expected_rewards:
                    for template in templates:
                        if expected["title"] in template["title"] and template["cost"] == expected["cost"]:
                            found_rewards += 1
                            break
                
                if found_rewards == 10:
                    self.log_test("BETA: Expanded Rewards System", True, f"All 10 specific Arabic rewards found with correct costs (5-100 points)")
                    return True
                else:
                    self.log_test("BETA: Expanded Rewards System", False, f"Only {found_rewards}/10 expected rewards found with correct costs")
                    return False
            else:
                self.log_test("BETA: Expanded Rewards System", False, f"Expected 10 rewards, got {len(templates)}")
                return False
        else:
            self.log_test("Reinforcement Templates", False, f"Failed to retrieve templates - Status: {status}")
            return False

    def test_reinforcement_creation(self):
        """Test creating personal reinforcement items"""
        if not self.test_users:
            self.log_test("Reinforcement Creation", False, "No test users available")
            return False
            
        user_id = self.test_users[0]['id']
        reinforcement_data = {
            "title": "خمس دقائق استماع بلا مقاطعة",
            "category": "attention",
            "cost": 5
        }
        
        success, data, status = self.make_request('POST', f'reinforcements?user_id={user_id}', reinforcement_data)
        
        if success and status == 200 and data.get('title') == reinforcement_data['title']:
            self.log_test("Reinforcement Creation", True, f"Created reinforcement: {data['id']}")
            return True
        else:
            self.log_test("Reinforcement Creation", False, f"Failed to create reinforcement - Status: {status}")
            return False

    def test_partner_reinforcements(self):
        """Test getting partner's reinforcements"""
        if len(self.test_users) < 2:
            self.log_test("Partner Reinforcements", False, "Need paired users for this test")
            return False
            
        partner_id = self.test_users[1]['id']
        success, data, status = self.make_request('GET', f'reinforcements/{partner_id}')
        
        if success and status == 200 and isinstance(data, list):
            self.log_test("Partner Reinforcements", True, f"Retrieved {len(data)} partner reinforcements")
            return True
        else:
            self.log_test("Partner Reinforcements", False, f"Failed to retrieve partner reinforcements - Status: {status}")
            return False

    def test_point_awarding(self):
        """Test awarding points to partner"""
        if len(self.test_users) < 2:
            self.log_test("Point Awarding", False, "Need paired users for this test")
            return False
            
        user_id = self.test_users[0]['id']
        partner_id = self.test_users[1]['id']
        
        point_data = {
            "partner_id": partner_id,
            "points": 3,
            "transaction_type": "earned",
            "description": "سلوك إيجابي ممتاز في التواصل"
        }
        
        success, data, status = self.make_request('POST', f'points/award?user_id={user_id}', point_data)
        
        if success and status == 200:
            self.log_test("Point Awarding", True, "Successfully awarded points to partner")
            return True
        else:
            self.log_test("Point Awarding", False, f"Failed to award points - Status: {status}")
            return False

    def test_point_history(self):
        """Test getting point transaction history"""
        if not self.test_users:
            self.log_test("Point History", False, "No test users available")
            return False
            
        user_id = self.test_users[0]['id']
        success, data, status = self.make_request('GET', f'points/{user_id}/history')
        
        if success and status == 200 and isinstance(data, list):
            self.log_test("Point History", True, f"Retrieved {len(data)} point transactions")
            return True
        else:
            self.log_test("Point History", False, f"Failed to retrieve point history - Status: {status}")
            return False

    def test_dashboard(self):
        """Test dashboard data retrieval"""
        if not self.test_users:
            self.log_test("Dashboard", False, "No test users available")
            return False
            
        user_id = self.test_users[0]['id']
        success, data, status = self.make_request('GET', f'dashboard/{user_id}')
        
        if success and status == 200 and 'user' in data:
            self.log_test("Dashboard", True, f"Retrieved dashboard data for user: {data['user']['name']}")
            return True
        else:
            self.log_test("Dashboard", False, f"Failed to retrieve dashboard - Status: {status}")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Mithaq API Testing...")
        print("=" * 60)
        
        # Core API Tests
        if not self.test_health_check():
            print("❌ API is not responding. Stopping tests.")
            return False
            
        # User Management Tests
        self.test_user_registration()
        self.test_duplicate_email_registration()
        self.test_user_retrieval()
        
        # Login Tests (NEW)
        self.test_user_login_success()
        self.test_user_login_invalid_email()
        
        self.test_user_pairing()
        self.test_invalid_pairing_code()
        
        # Behavior Analysis Tests
        self.test_behavior_entry_creation()
        self.test_behavior_retrieval()
        self.test_behavior_patterns()
        
        # Reinforcement System Tests
        self.test_reinforcement_categories()
        self.test_reinforcement_templates()
        self.test_reinforcement_creation()
        self.test_partner_reinforcements()
        
        # Point System Tests
        self.test_point_awarding()
        self.test_point_history()
        
        # Dashboard Tests
        self.test_dashboard()
        
        # Print Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! API is working correctly.")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed. Check the details above.")
            return False

    def get_test_summary(self):
        """Get detailed test summary"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run)*100 if self.tests_run > 0 else 0,
            "test_details": self.test_results,
            "test_users_created": len(self.test_users)
        }

def main():
    """Main test execution"""
    tester = MithaqAPITester()
    
    try:
        success = tester.run_all_tests()
        
        # Save detailed results
        summary = tester.get_test_summary()
        with open('/app/backend_test_results.json', 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())