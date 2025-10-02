#!/usr/bin/env python3
"""
Backend API Test for Critical Partner Behavior Synchronization Bug Fix
Tests the new couple behavior endpoints and cross-partner visibility
"""

import requests
import sys
import json
from datetime import datetime

class CouplesSyncTester:
    def __init__(self, base_url="https://behavior-bridge.preview.emergentagent.com"):
        self.base_url = base_url
        self.api = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.partner_a = None
        self.partner_b = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        return success

    def create_test_user(self, name, email):
        """Create a test user"""
        try:
            response = requests.post(f"{self.api}/users", json={
                "name": name,
                "email": email
            })
            if response.status_code == 201:
                return response.json()
            else:
                print(f"Failed to create user {name}: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Error creating user {name}: {str(e)}")
            return None

    def pair_users(self, user_a, user_b):
        """Pair two users together"""
        try:
            response = requests.post(f"{self.api}/users/{user_a['id']}/pair", json={
                "pairing_code": user_b["pairing_code"]
            })
            return response.status_code == 200
        except Exception as e:
            print(f"Error pairing users: {str(e)}")
            return False

    def create_behavior(self, user_id, antecedent, behavior, consequence, behavior_type="positive"):
        """Create a behavior entry for a user"""
        try:
            response = requests.post(f"{self.api}/behaviors?user_id={user_id}", json={
                "antecedent": antecedent,
                "behavior": behavior,
                "consequence": consequence,
                "behavior_type": behavior_type
            })
            if response.status_code == 201:
                return response.json()
            else:
                print(f"Failed to create behavior: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Error creating behavior: {str(e)}")
            return None

    def get_individual_behaviors(self, user_id):
        """Get individual behaviors (old endpoint)"""
        try:
            response = requests.get(f"{self.api}/behaviors/{user_id}")
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"Error getting individual behaviors: {str(e)}")
            return []

    def get_couple_behaviors(self, user_id):
        """Get couple behaviors (new endpoint)"""
        try:
            response = requests.get(f"{self.api}/behaviors/{user_id}/couple")
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"Error getting couple behaviors: {str(e)}")
            return []

    def get_couple_patterns(self, user_id):
        """Get couple patterns (new endpoint)"""
        try:
            response = requests.get(f"{self.api}/behaviors/{user_id}/couple-patterns")
            if response.status_code == 200:
                return response.json()
            return {}
        except Exception as e:
            print(f"Error getting couple patterns: {str(e)}")
            return {}

    def test_setup_couple(self):
        """Set up a test couple"""
        print("\n🔧 Setting up test couple...")
        
        # Create Partner A
        timestamp = datetime.now().strftime("%H%M%S")
        self.partner_a = self.create_test_user(
            f"Partner A {timestamp}", 
            f"partner_a_{timestamp}@test.com"
        )
        
        # Create Partner B  
        self.partner_b = self.create_test_user(
            f"Partner B {timestamp}", 
            f"partner_b_{timestamp}@test.com"
        )
        
        if not self.partner_a or not self.partner_b:
            return self.log_test("Create test users", False, "Failed to create users")
        
        # Pair them together
        paired = self.pair_users(self.partner_a, self.partner_b)
        return self.log_test("Pair test users", paired, "Failed to pair users")

    def test_individual_behavior_creation(self):
        """Test that individual behavior creation still works"""
        print("\n📝 Testing individual behavior creation...")
        
        # Partner A creates a behavior
        behavior_a = self.create_behavior(
            self.partner_a["id"],
            "Partner asked for help with dishes",
            "I helped immediately with a smile", 
            "Partner thanked me and we had a nice conversation",
            "positive"
        )
        
        # Partner B creates a behavior
        behavior_b = self.create_behavior(
            self.partner_b["id"],
            "I was running late for work",
            "I got frustrated and raised my voice",
            "Partner felt hurt and withdrew",
            "negative"
        )
        
        success_a = self.log_test("Partner A behavior creation", behavior_a is not None)
        success_b = self.log_test("Partner B behavior creation", behavior_b is not None)
        
        return success_a and success_b

    def test_couple_behavior_visibility(self):
        """CRITICAL TEST: Test that both partners can see each other's behaviors"""
        print("\n👥 Testing CRITICAL partner behavior synchronization...")
        
        # Get couple behaviors from Partner A's perspective
        couple_behaviors_a = self.get_couple_behaviors(self.partner_a["id"])
        
        # Get couple behaviors from Partner B's perspective  
        couple_behaviors_b = self.get_couple_behaviors(self.partner_b["id"])
        
        # Both should see the same behaviors
        same_count = len(couple_behaviors_a) == len(couple_behaviors_b)
        self.log_test("Both partners see same number of behaviors", same_count, 
                     f"A sees {len(couple_behaviors_a)}, B sees {len(couple_behaviors_b)}")
        
        # Should see at least 2 behaviors (one from each partner)
        sufficient_behaviors = len(couple_behaviors_a) >= 2
        self.log_test("Couple behaviors contain both partners' entries", sufficient_behaviors,
                     f"Only {len(couple_behaviors_a)} behaviors found, expected at least 2")
        
        # Check that behaviors from both partners are present
        user_ids_in_behaviors = set(b["user_id"] for b in couple_behaviors_a)
        both_partners_present = (self.partner_a["id"] in user_ids_in_behaviors and 
                               self.partner_b["id"] in user_ids_in_behaviors)
        self.log_test("Behaviors from both partners are visible", both_partners_present,
                     f"User IDs found: {user_ids_in_behaviors}")
        
        # Test chronological ordering (newest first)
        if len(couple_behaviors_a) > 1:
            dates = [datetime.fromisoformat(b["created_at"].replace('Z', '+00:00')) for b in couple_behaviors_a]
            is_chronological = all(dates[i] >= dates[i+1] for i in range(len(dates)-1))
            self.log_test("Behaviors are in chronological order (newest first)", is_chronological)
        
        return same_count and sufficient_behaviors and both_partners_present

    def test_individual_vs_couple_endpoints(self):
        """Test difference between individual and couple endpoints"""
        print("\n🔍 Testing individual vs couple endpoint differences...")
        
        # Get individual behaviors for Partner A (should only see their own)
        individual_a = self.get_individual_behaviors(self.partner_a["id"])
        
        # Get couple behaviors for Partner A (should see both partners')
        couple_a = self.get_couple_behaviors(self.partner_a["id"])
        
        # Individual should be subset of couple
        individual_count = len(individual_a)
        couple_count = len(couple_a)
        
        more_in_couple = couple_count >= individual_count
        self.log_test("Couple endpoint shows more/equal behaviors than individual", more_in_couple,
                     f"Individual: {individual_count}, Couple: {couple_count}")
        
        # Individual should only contain Partner A's behaviors
        individual_user_ids = set(b["user_id"] for b in individual_a)
        only_own_behaviors = individual_user_ids == {self.partner_a["id"]} or len(individual_user_ids) == 0
        self.log_test("Individual endpoint only shows own behaviors", only_own_behaviors,
                     f"Individual user IDs: {individual_user_ids}")
        
        return more_in_couple and only_own_behaviors

    def test_couple_patterns_endpoint(self):
        """Test the new couple patterns endpoint"""
        print("\n📊 Testing couple patterns analysis...")
        
        patterns = self.get_couple_patterns(self.partner_a["id"])
        
        has_structure = "user_patterns" in patterns and "partner_patterns" in patterns
        self.log_test("Couple patterns endpoint returns correct structure", has_structure)
        
        has_total = "total_behaviors" in patterns
        self.log_test("Couple patterns includes total behavior count", has_total)
        
        if has_structure and has_total:
            total_behaviors = patterns["total_behaviors"]
            expected_total = len(self.get_couple_behaviors(self.partner_a["id"]))
            correct_total = total_behaviors == expected_total
            self.log_test("Couple patterns total matches couple behaviors count", correct_total,
                         f"Patterns total: {total_behaviors}, Expected: {expected_total}")
            return correct_total
        
        return has_structure and has_total

    def test_cross_partner_behavior_creation(self):
        """Test creating more behaviors and verifying cross-visibility"""
        print("\n🔄 Testing cross-partner behavior creation and visibility...")
        
        # Partner B creates another behavior
        behavior_b2 = self.create_behavior(
            self.partner_b["id"],
            "Partner was stressed about work",
            "I listened without giving advice",
            "Partner felt heard and relaxed",
            "positive"
        )
        
        # Partner A creates another behavior
        behavior_a2 = self.create_behavior(
            self.partner_a["id"],
            "We disagreed about weekend plans",
            "I suggested a compromise solution",
            "We found a plan that worked for both",
            "positive"
        )
        
        created_successfully = behavior_a2 is not None and behavior_b2 is not None
        self.log_test("Additional behaviors created successfully", created_successfully)
        
        if not created_successfully:
            return False
        
        # Now check if Partner A can see Partner B's new behavior
        couple_behaviors_a = self.get_couple_behaviors(self.partner_a["id"])
        partner_b_behaviors_visible_to_a = [b for b in couple_behaviors_a if b["user_id"] == self.partner_b["id"]]
        
        # Now check if Partner B can see Partner A's new behavior  
        couple_behaviors_b = self.get_couple_behaviors(self.partner_b["id"])
        partner_a_behaviors_visible_to_b = [b for b in couple_behaviors_b if b["user_id"] == self.partner_a["id"]]
        
        a_sees_b = len(partner_b_behaviors_visible_to_a) >= 2  # Should see both B's behaviors
        b_sees_a = len(partner_a_behaviors_visible_to_b) >= 2  # Should see both A's behaviors
        
        self.log_test("Partner A can see Partner B's behaviors", a_sees_b,
                     f"A sees {len(partner_b_behaviors_visible_to_a)} of B's behaviors")
        self.log_test("Partner B can see Partner A's behaviors", b_sees_a,
                     f"B sees {len(partner_a_behaviors_visible_to_b)} of A's behaviors")
        
        return a_sees_b and b_sees_a

    def run_all_tests(self):
        """Run all synchronization tests"""
        print("🧪 Starting Critical Partner Behavior Synchronization Tests")
        print("=" * 60)
        
        # Setup
        if not self.test_setup_couple():
            print("❌ Failed to set up test couple. Stopping tests.")
            return False
        
        # Core functionality tests
        self.test_individual_behavior_creation()
        self.test_couple_behavior_visibility()
        self.test_individual_vs_couple_endpoints()
        self.test_couple_patterns_endpoint()
        self.test_cross_partner_behavior_creation()
        
        # Final results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED - Partner synchronization is working!")
            return True
        else:
            print("⚠️  SOME TESTS FAILED - Partner synchronization has issues")
            return False

def main():
    tester = CouplesSyncTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())