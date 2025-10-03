#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Mithaq Repair Cycle System
Tests the CRITICAL Immediate Repair Cycle functionality including:
- Automatic repair cycle initiation on negative behavior
- 3-step mandatory repair process (acknowledge, pay, learn)
- Repair cycle endpoints and notifications
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class RepairCycleAPITester:
    def __init__(self, base_url="https://marriage-help.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.test_users = []
        self.repair_cycle_id = None
        self.behavior_id = None
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
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    def setup_test_users(self):
        """Create and pair test users for repair cycle testing"""
        timestamp = datetime.now().strftime('%H%M%S')
        
        # Create User 1 (will be the offender)
        user1_data = {
            "name": f"أحمد الإصلاح {timestamp}",
            "email": f"offender_{timestamp}@repair.test"
        }
        
        success, data, status = self.make_request('POST', 'users', user1_data)
        
        if success and status == 200:
            self.test_users.append(data)
            
            # Create User 2 (will be the recipient)
            user2_data = {
                "name": f"فاطمة المتضررة {timestamp}",
                "email": f"recipient_{timestamp}@repair.test"
            }
            
            success2, data2, status2 = self.make_request('POST', 'users', user2_data)
            
            if success2 and status2 == 200:
                self.test_users.append(data2)
                
                # Pair the users
                pair_data = {"pairing_code": data2['pairing_code']}
                success3, data3, status3 = self.make_request('POST', f'users/{data["id"]}/pair', pair_data)
                
                if success3 and status3 == 200:
                    self.test_users[0]['partner_id'] = data2['id']
                    self.test_users[1]['partner_id'] = data['id']
                    self.log_test("Test Users Setup", True, f"Created and paired users: {data['name']} & {data2['name']}")
                    return True
                else:
                    self.log_test("Test Users Setup", False, f"Failed to pair users - Status: {status3}")
                    return False
            else:
                self.log_test("Test Users Setup", False, f"Failed to create second user - Status: {status2}")
                return False
        else:
            self.log_test("Test Users Setup", False, f"Failed to create first user - Status: {status}")
            return False

    def test_negative_behavior_triggers_repair_cycle(self):
        """Test that logging negative behavior automatically creates repair cycle"""
        if len(self.test_users) < 2:
            self.log_test("Repair Cycle Trigger", False, "Need paired users for this test")
            return False
            
        # User 2 (recipient) logs negative behavior about User 1 (offender)
        recipient_id = self.test_users[1]['id']
        
        negative_behavior = {
            "antecedent": "طلبت منه المساعدة في ترتيب المنزل",
            "behavior": "رفض بطريقة عدوانية ورفع صوته علي",
            "consequence": "شعرت بالإهانة وانسحبت من الغرفة",
            "behavior_type": "negative"
        }
        
        success, data, status = self.make_request('POST', f'behaviors?user_id={recipient_id}', negative_behavior)
        
        if success and status == 200:
            self.behavior_id = data['id']
            self.log_test("Negative Behavior Creation", True, f"Created negative behavior entry: {data['id']}")
            
            # Check if repair cycle was automatically created
            offender_id = self.test_users[0]['id']
            success2, data2, status2 = self.make_request('GET', f'repair-cycles/{offender_id}/active')
            
            if success2 and status2 == 200 and data2:
                self.repair_cycle_id = data2['id']
                self.log_test("Automatic Repair Cycle Creation", True, f"Repair cycle automatically created: {data2['id']}")
                return True
            else:
                self.log_test("Automatic Repair Cycle Creation", False, f"No repair cycle created - Status: {status2}, Data: {data2}")
                return False
        else:
            self.log_test("Negative Behavior Creation", False, f"Failed to create negative behavior - Status: {status}")
            return False

    def test_repair_cycle_notifications(self):
        """Test that repair cycle creates proper notifications for both users"""
        if not self.repair_cycle_id:
            self.log_test("Repair Cycle Notifications", False, "No repair cycle available")
            return False
            
        # Check offender notifications (mandatory repair cycle)
        offender_id = self.test_users[0]['id']
        success, data, status = self.make_request('GET', f'notifications/{offender_id}')
        
        if success and status == 200 and len(data) > 0:
            # Look for repair cycle notification
            repair_notification = None
            for notif in data:
                if notif.get('type') == 'negative_behavior_offender':
                    repair_notification = notif
                    break
            
            if repair_notification:
                self.log_test("Offender Repair Notification", True, f"Found repair cycle notification: {repair_notification['title']}")
                
                # Check recipient notifications
                recipient_id = self.test_users[1]['id']
                success2, data2, status2 = self.make_request('GET', f'notifications/{recipient_id}')
                
                if success2 and status2 == 200:
                    recipient_notification = None
                    for notif in data2:
                        if notif.get('type') == 'negative_behavior_recipient':
                            recipient_notification = notif
                            break
                    
                    if recipient_notification:
                        self.log_test("Recipient Help Notification", True, f"Found help tools notification: {recipient_notification['title']}")
                        return True
                    else:
                        self.log_test("Recipient Help Notification", False, "No recipient notification found")
                        return False
                else:
                    self.log_test("Recipient Help Notification", False, f"Failed to get recipient notifications - Status: {status2}")
                    return False
            else:
                self.log_test("Offender Repair Notification", False, "No repair cycle notification found")
                return False
        else:
            self.log_test("Offender Repair Notification", False, f"Failed to get offender notifications - Status: {status}")
            return False

    def test_repair_step_1_acknowledge(self):
        """Test Step 1: Offender acknowledgment"""
        if not self.repair_cycle_id:
            self.log_test("Repair Step 1 - Acknowledge", False, "No repair cycle available")
            return False
            
        offender_id = self.test_users[0]['id']
        
        # Perform acknowledgment action
        action_data = {
            "action_type": "acknowledge"
        }
        
        success, data, status = self.make_request('POST', f'repair-cycles/{self.repair_cycle_id}/action?user_id={offender_id}', action_data)
        
        if success and status == 200 and data.get('next_step') == 'pay_compensation':
            self.log_test("Repair Step 1 - Acknowledge", True, f"Acknowledgment successful: {data['message']}")
            return True
        else:
            self.log_test("Repair Step 1 - Acknowledge", False, f"Acknowledgment failed - Status: {status}, Data: {data}")
            return False

    def test_repair_step_2_compensation(self):
        """Test Step 2: Compensation payment (3 points transfer)"""
        if not self.repair_cycle_id:
            self.log_test("Repair Step 2 - Compensation", False, "No repair cycle available")
            return False
            
        offender_id = self.test_users[0]['id']
        recipient_id = self.test_users[1]['id']
        
        # Get initial points for both users
        success_off, off_data, _ = self.make_request('GET', f'users/{offender_id}')
        success_rec, rec_data, _ = self.make_request('GET', f'users/{recipient_id}')
        
        if success_off and success_rec:
            initial_offender_points = off_data.get('points', 0)
            initial_recipient_points = rec_data.get('points', 0)
            
            # Perform compensation action
            action_data = {
                "action_type": "pay_compensation"
            }
            
            success, data, status = self.make_request('POST', f'repair-cycles/{self.repair_cycle_id}/action?user_id={offender_id}', action_data)
            
            if success and status == 200 and data.get('next_step') == 'complete_skill':
                # Verify points transfer
                success_off2, off_data2, _ = self.make_request('GET', f'users/{offender_id}')
                success_rec2, rec_data2, _ = self.make_request('GET', f'users/{recipient_id}')
                
                if success_off2 and success_rec2:
                    final_offender_points = off_data2.get('points', 0)
                    final_recipient_points = rec_data2.get('points', 0)
                    
                    points_deducted = initial_offender_points - final_offender_points
                    points_added = final_recipient_points - initial_recipient_points
                    
                    if points_deducted == 3 and points_added == 3:
                        self.log_test("Repair Step 2 - Compensation", True, f"3 points successfully transferred from offender to recipient")
                        return True
                    else:
                        self.log_test("Repair Step 2 - Compensation", False, f"Points transfer incorrect: -{points_deducted}, +{points_added}")
                        return False
                else:
                    self.log_test("Repair Step 2 - Compensation", False, "Failed to verify points after compensation")
                    return False
            else:
                self.log_test("Repair Step 2 - Compensation", False, f"Compensation failed - Status: {status}, Data: {data}")
                return False
        else:
            self.log_test("Repair Step 2 - Compensation", False, "Failed to get initial user points")
            return False

    def test_repair_step_3_skill_completion(self):
        """Test Step 3: Mandatory skill completion"""
        if not self.repair_cycle_id:
            self.log_test("Repair Step 3 - Skill Completion", False, "No repair cycle available")
            return False
            
        offender_id = self.test_users[0]['id']
        
        # Perform skill completion action
        action_data = {
            "action_type": "complete_skill",
            "skill_id": "timeout"
        }
        
        success, data, status = self.make_request('POST', f'repair-cycles/{self.repair_cycle_id}/action?user_id={offender_id}', action_data)
        
        if success and status == 200:
            # Verify repair cycle is completed
            success2, data2, status2 = self.make_request('GET', f'repair-cycles/{offender_id}/active')
            
            # Should return None or empty since repair cycle is completed
            if success2 and (not data2 or data2.get('status') == 'learning_completed'):
                self.log_test("Repair Step 3 - Skill Completion", True, f"Repair cycle completed successfully")
                return True
            else:
                self.log_test("Repair Step 3 - Skill Completion", False, f"Repair cycle not properly completed - Data: {data2}")
                return False
        else:
            self.log_test("Repair Step 3 - Skill Completion", False, f"Skill completion failed - Status: {status}, Data: {data}")
            return False

    def test_repair_cycle_history(self):
        """Test getting repair cycle history"""
        if not self.test_users:
            self.log_test("Repair Cycle History", False, "No test users available")
            return False
            
        offender_id = self.test_users[0]['id']
        success, data, status = self.make_request('GET', f'repair-cycles/{offender_id}')
        
        if success and status == 200 and isinstance(data, list) and len(data) > 0:
            self.log_test("Repair Cycle History", True, f"Retrieved {len(data)} repair cycles")
            return True
        else:
            self.log_test("Repair Cycle History", False, f"Failed to retrieve repair cycle history - Status: {status}")
            return False

    def test_recipient_confirmation_notification(self):
        """Test that recipient gets confirmation notification after compensation"""
        if not self.test_users:
            self.log_test("Recipient Confirmation", False, "No test users available")
            return False
            
        recipient_id = self.test_users[1]['id']
        success, data, status = self.make_request('GET', f'notifications/{recipient_id}')
        
        if success and status == 200:
            # Look for repair confirmation notification
            confirmation_found = False
            for notif in data:
                if notif.get('type') == 'repair_confirmation':
                    confirmation_found = True
                    break
            
            if confirmation_found:
                self.log_test("Recipient Confirmation", True, "Found repair confirmation notification")
                return True
            else:
                self.log_test("Recipient Confirmation", False, "No repair confirmation notification found")
                return False
        else:
            self.log_test("Recipient Confirmation", False, f"Failed to get recipient notifications - Status: {status}")
            return False

    def run_all_repair_cycle_tests(self):
        """Run all repair cycle tests"""
        print("🚀 Starting Mithaq Repair Cycle System Testing...")
        print("=" * 70)
        
        # Setup
        if not self.setup_test_users():
            print("❌ Failed to setup test users. Stopping tests.")
            return False
        
        # Test repair cycle initiation
        if not self.test_negative_behavior_triggers_repair_cycle():
            print("❌ Repair cycle initiation failed. Stopping tests.")
            return False
        
        # Test notifications
        self.test_repair_cycle_notifications()
        
        # Test 3-step repair process
        self.test_repair_step_1_acknowledge()
        self.test_repair_step_2_compensation()
        self.test_repair_step_3_skill_completion()
        
        # Test additional features
        self.test_repair_cycle_history()
        self.test_recipient_confirmation_notification()
        
        # Print Results
        print("\n" + "=" * 70)
        print(f"📊 Repair Cycle Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All repair cycle tests passed! System is working correctly.")
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
            "repair_cycle_id": self.repair_cycle_id,
            "behavior_id": self.behavior_id,
            "test_users_created": len(self.test_users)
        }

def main():
    """Main test execution"""
    tester = RepairCycleAPITester()
    
    try:
        success = tester.run_all_repair_cycle_tests()
        
        # Save detailed results
        summary = tester.get_test_summary()
        with open('/app/repair_cycle_test_results.json', 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"❌ Repair cycle test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())