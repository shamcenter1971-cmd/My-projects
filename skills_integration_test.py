#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class SkillsIntegrationTester:
    def __init__(self, base_url="https://behavior-bridge.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.test_user = None
        self.test_partner = None

    def setup_test_users(self):
        """Create and pair test users via API"""
        try:
            print("🔧 Setting up test users via API...")
            
            # Create first user
            user1_data = {
                "name": f"Skills_Test_User_{datetime.now().strftime('%H%M%S')}",
                "email": f"skills_test_{datetime.now().strftime('%H%M%S')}@test.com"
            }
            
            response1 = requests.post(f"{self.api_url}/users", json=user1_data, timeout=10)
            if response1.status_code != 200:
                print(f"❌ Failed to create user 1: {response1.status_code}")
                return False
            
            self.test_user = response1.json()
            print(f"✅ Created user 1: {self.test_user['name']} ({self.test_user['email']})")
            
            # Create second user (partner)
            user2_data = {
                "name": f"Skills_Test_Partner_{datetime.now().strftime('%H%M%S')}",
                "email": f"skills_partner_{datetime.now().strftime('%H%M%S')}@test.com"
            }
            
            response2 = requests.post(f"{self.api_url}/users", json=user2_data, timeout=10)
            if response2.status_code != 200:
                print(f"❌ Failed to create user 2: {response2.status_code}")
                return False
            
            self.test_partner = response2.json()
            print(f"✅ Created user 2: {self.test_partner['name']} ({self.test_partner['email']})")
            
            # Pair the users
            pair_data = {"pairing_code": self.test_partner["pairing_code"]}
            pair_response = requests.post(f"{self.api_url}/users/{self.test_user['id']}/pair", json=pair_data, timeout=10)
            
            if pair_response.status_code != 200:
                print(f"❌ Failed to pair users: {pair_response.status_code}")
                return False
            
            print(f"✅ Successfully paired users with code: {self.test_partner['pairing_code']}")
            return True
            
        except Exception as e:
            print(f"❌ Error setting up users: {str(e)}")
            return False

    def get_user_credentials(self):
        """Return user credentials for frontend login"""
        if self.test_user:
            return {
                "email": self.test_user["email"],
                "name": self.test_user["name"],
                "user_id": self.test_user["id"]
            }
        return None

def main():
    tester = SkillsIntegrationTester()
    
    if tester.setup_test_users():
        credentials = tester.get_user_credentials()
        print(f"\n✅ Test users ready for frontend testing:")
        print(f"   Email: {credentials['email']}")
        print(f"   Name: {credentials['name']}")
        print(f"   User ID: {credentials['user_id']}")
        return 0
    else:
        print("❌ Failed to setup test users")
        return 1

if __name__ == "__main__":
    sys.exit(main())