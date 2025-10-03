from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import secrets
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Helper functions for data serialization
import json
import re

def clean_json_string(text):
    """Clean and escape text to prevent JSON syntax errors"""
    if not isinstance(text, str):
        return text
    
    # Remove or escape problematic characters
    text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)  # Remove control characters
    
    # Ensure proper UTF-8 encoding for Arabic text
    try:
        text = text.encode('utf-8').decode('utf-8')
    except:
        text = str(text)
    
    return text

def prepare_for_mongo(data):
    """Comprehensive data preparation for MongoDB insertion"""
    if data is None:
        return None
    
    if isinstance(data, dict):
        prepared = {}
        for key, value in data.items():
            if isinstance(value, datetime):
                prepared[key] = value.isoformat()
            elif isinstance(value, str):
                prepared[key] = clean_json_string(value)
            elif isinstance(value, list):
                prepared[key] = [clean_json_string(item) if isinstance(item, str) else item for item in value]
            elif isinstance(value, dict):
                prepared[key] = prepare_for_mongo(value)
            else:
                prepared[key] = value
        return prepared
    elif isinstance(data, str):
        return clean_json_string(data)
    elif isinstance(data, list):
        return [prepare_for_mongo(item) for item in data]
    else:
        return data

def parse_from_mongo(item):
    """Parse data retrieved from MongoDB"""
    if item is None:
        return None
        
    if isinstance(item, dict):
        parsed = {}
        for key, value in item.items():
            if key == 'created_at' and isinstance(value, str):
                try:
                    parsed[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    parsed[key] = value
            elif key == 'completed_at' and isinstance(value, str) and value:
                try:
                    parsed[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    parsed[key] = value
            else:
                parsed[key] = value
        return parsed
    else:
        return item

# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    partner_id: Optional[str] = None
    pairing_code: Optional[str] = None
    points: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: str

class UserLogin(BaseModel):
    email: str

class PairRequest(BaseModel):
    pairing_code: str

class BehaviorEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    antecedent: str  # A - What happened before
    behavior: str    # B - The behavior itself
    consequence: str # C - What happened after
    behavior_type: str  # "positive" or "negative"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BehaviorCreate(BaseModel):
    antecedent: str
    behavior: str
    consequence: str
    behavior_type: str

class ReinforcementItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    category: str
    cost: int  # Points required to redeem
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReinforcementCreate(BaseModel):
    title: str
    category: str
    cost: int

class PointTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    partner_id: str
    points: int
    transaction_type: str  # "earned" or "spent"
    description: str
    reinforcement_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PointTransactionCreate(BaseModel):
    partner_id: str
    points: int
    transaction_type: str
    description: str
    reinforcement_id: Optional[str] = None

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # "negative_behavior_recipient" or "negative_behavior_offender"
    title: str
    message: str
    action_url: str
    priority_skills: List[str]
    behavior_id: Optional[str] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RepairCycle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    behavior_id: str
    offender_id: str
    recipient_id: str
    status: str  # "pending", "acknowledged", "payment_completed", "learning_completed", "completed"
    offender_acknowledged: bool = False
    compensation_paid: bool = False
    offender_skill_completed: Optional[str] = None
    recipient_skill_completed: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class CommitmentPhrase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    module_id: str
    section_id: str
    phrase: str
    display_on_dashboard: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommitmentPhraseCreate(BaseModel):
    user_id: str
    module_id: str
    section_id: str
    phrase: str
    display_on_dashboard: bool = True

class RepairAction(BaseModel):
    action_type: str  # "acknowledge", "pay_compensation", "complete_skill"
    skill_id: Optional[str] = None

# Authentication helper functions
def generate_pairing_code():
    return ''.join(secrets.choice('0123456789ABCDEF') for _ in range(8))

# User Management Routes
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user_data.dict()
    user_dict["pairing_code"] = generate_pairing_code()
    user_obj = User(**user_dict)
    
    prepared_data = prepare_for_mongo(user_obj.dict())
    await db.users.insert_one(prepared_data)
    return user_obj

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**parse_from_mongo(user))

@api_router.post("/login", response_model=User)
async def login_user(login_data: UserLogin):
    # Find user by email
    user = await db.users.find_one({"email": login_data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**parse_from_mongo(user))

@api_router.post("/users/{user_id}/pair")
async def pair_with_partner(user_id: str, pair_request: PairRequest):
    # Find the user making the request
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Find partner by pairing code
    partner = await db.users.find_one({"pairing_code": pair_request.pairing_code})
    if not partner:
        raise HTTPException(status_code=404, detail="Invalid pairing code")
    
    if partner["id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot pair with yourself")
    
    # Update both users
    await db.users.update_one({"id": user_id}, {"$set": {"partner_id": partner["id"]}})
    await db.users.update_one({"id": partner["id"]}, {"$set": {"partner_id": user_id}})
    
    return {"message": "Successfully paired with partner", "partner_name": partner["name"]}

# A-B-C Behavior Analysis Routes
@api_router.post("/behaviors", response_model=BehaviorEntry)
async def create_behavior_entry(behavior_data: BehaviorCreate, user_id: str):
    try:
        behavior_dict = behavior_data.dict()
        behavior_dict["user_id"] = user_id
        behavior_obj = BehaviorEntry(**behavior_dict)
        
        # Prepare data with comprehensive JSON serialization
        prepared_data = prepare_for_mongo(behavior_obj.dict())
        
        # Insert behavior entry
        result = await db.behaviors.insert_one(prepared_data)
        
        # Award point for positive behavior
        if behavior_data.behavior_type == "positive":
            await db.users.update_one({"id": user_id}, {"$inc": {"points": 1}})
        
        # CRITICAL: Role-based notification system for negative behaviors
        if behavior_data.behavior_type == "negative":
            # Get user info to find partner
            user = await db.users.find_one({"id": user_id})
            if user and user.get("partner_id"):
                partner_id = user["partner_id"]
                
                # Initialize Immediate Repair Cycle
                repair_cycle = RepairCycle(
                    behavior_id=behavior_obj.id,
                    offender_id=partner_id,  # Partner whose behavior was logged
                    recipient_id=user_id,    # User who logged the behavior
                    status="pending"
                )
                
                # Prepare repair cycle data with proper serialization
                prepared_repair = prepare_for_mongo(repair_cycle.dict())
                await db.repair_cycles.insert_one(prepared_repair)
                
                # 1. Notification for the user who submitted the log (recipient of negative behavior)
                recipient_notification = Notification(
                    user_id=user_id,
                    type="negative_behavior_recipient",
                    title="تم تسجيل سلوك أثّر عليك",
                    message="تم تسجيل سلوك أثّر عليك. انتقل الآن إلى أدوات المساعدة وحل الخلافات لمعرفة مهارات مواجهة هذا السلوك والحفاظ على حدودك العاطفية.",
                    action_url="/help-tools",
                    priority_skills=["active_listening", "expressing_needs", "boundary_setting"],
                    behavior_id=behavior_obj.id,
                    is_read=False
                )
                
                # 2. CRITICAL: Mandatory repair cycle notification for offender
                offender_notification = Notification(
                    user_id=partner_id,
                    type="negative_behavior_offender",
                    title="تنبيه سلوك سلبي! - إصلاح فوري مطلوب",
                    message="تنبيه سلوك سلبي! تم تسجيل سلوك منتقد من شريكك. يجب إكمال دورة الإصلاح الفورية: (1) الإقرار بالملاحظة (2) إرسال 3 نقاط تعويض (3) إكمال وحدة تعليمية.",
                    action_url="/repair-cycle",
                    priority_skills=["timeout", "self_soothing", "anger_management"],
                    behavior_id=behavior_obj.id,
                    is_read=False
                )
                
                # Store notifications in database using proper models and serialization
                recipient_prepared = prepare_for_mongo(recipient_notification.dict())
                offender_prepared = prepare_for_mongo(offender_notification.dict())
                
                await db.notifications.insert_one(recipient_prepared)
                await db.notifications.insert_one(offender_prepared)
        
        return behavior_obj
        
    except Exception as e:
        logger.error(f"Error creating behavior entry: {str(e)}")
        logger.error(f"Behavior data: {behavior_data}")
        logger.error(f"User ID: {user_id}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@api_router.get("/behaviors/{user_id}", response_model=List[BehaviorEntry])
async def get_user_behaviors(user_id: str):
    behaviors = await db.behaviors.find({"user_id": user_id}).to_list(1000)
    return [BehaviorEntry(**parse_from_mongo(behavior)) for behavior in behaviors]

@api_router.get("/behaviors/{user_id}/couple", response_model=List[BehaviorEntry])
async def get_couple_behaviors(user_id: str):
    """Get behaviors for both partners in the couple"""
    # Get current user
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get behaviors for both user and partner
    user_ids = [user_id]
    if user.get("partner_id"):
        user_ids.append(user["partner_id"])
    
    behaviors = await db.behaviors.find({"user_id": {"$in": user_ids}}).sort("created_at", -1).to_list(1000)
    return [BehaviorEntry(**parse_from_mongo(behavior)) for behavior in behaviors]

@api_router.get("/behaviors/{user_id}/patterns")
async def analyze_behavior_patterns(user_id: str):
    behaviors = await db.behaviors.find({"user_id": user_id}).to_list(1000)
    
    # Simple pattern analysis
    patterns = {}
    for behavior in behaviors:
        key = f"{behavior['antecedent']} → {behavior['behavior']}"
        if key not in patterns:
            patterns[key] = {"count": 0, "consequences": []}
        patterns[key]["count"] += 1
        patterns[key]["consequences"].append(behavior["consequence"])
    
    # Sort by frequency
    sorted_patterns = sorted(patterns.items(), key=lambda x: x[1]["count"], reverse=True)
    return {"patterns": sorted_patterns[:10]}  # Return top 10 patterns

@api_router.get("/behaviors/{user_id}/couple-patterns")
async def analyze_couple_behavior_patterns(user_id: str):
    """Analyze behavioral patterns for both partners in the couple"""
    # Get current user
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get behaviors for both user and partner
    user_ids = [user_id]
    if user.get("partner_id"):
        user_ids.append(user["partner_id"])
    
    behaviors = await db.behaviors.find({"user_id": {"$in": user_ids}}).to_list(1000)
    
    # Pattern analysis by person
    user_patterns = {}
    partner_patterns = {}
    
    for behavior in behaviors:
        key = f"{behavior['antecedent']} → {behavior['behavior']}"
        
        if behavior["user_id"] == user_id:
            # Current user's patterns
            if key not in user_patterns:
                user_patterns[key] = {"count": 0, "consequences": [], "type": behavior["behavior_type"]}
            user_patterns[key]["count"] += 1
            user_patterns[key]["consequences"].append(behavior["consequence"])
        else:
            # Partner's patterns
            if key not in partner_patterns:
                partner_patterns[key] = {"count": 0, "consequences": [], "type": behavior["behavior_type"]}
            partner_patterns[key]["count"] += 1
            partner_patterns[key]["consequences"].append(behavior["consequence"])
    
    # Sort patterns
    sorted_user_patterns = sorted(user_patterns.items(), key=lambda x: x[1]["count"], reverse=True)[:5]
    sorted_partner_patterns = sorted(partner_patterns.items(), key=lambda x: x[1]["count"], reverse=True)[:5]
    
    return {
        "user_patterns": sorted_user_patterns,
        "partner_patterns": sorted_partner_patterns,
        "total_behaviors": len(behaviors)
    }

# Reinforcement Bank Routes
@api_router.get("/reinforcement-categories")
async def get_reinforcement_categories():
    categories = [
        {"id": "attention", "name": "الاهتمام والتواصل"},
        {"id": "service", "name": "الخدمة والدعم العملي"},
        {"id": "affection", "name": "الحميمية والمودة"},
        {"id": "time", "name": "التضحية بالوقت الخاص"},
        {"id": "recognition", "name": "التقدير العلني"}
    ]
    return {"categories": categories}

@api_router.get("/reinforcement-templates")
async def get_reinforcement_templates():
    templates = [
        {"title": "خمس دقائق \"استماع بلا مقاطعة\"", "category": "attention", "cost": 5},
        {"title": "النقاش دون تصعيد أو رفع للصوت", "category": "attention", "cost": 5},
        {"title": "رسالة مودة مفاجئة (تعبر عن التقدير)", "category": "affection", "cost": 5},
        {"title": "التعبير عن الإعجاب بشيء محدد (شخصية أو مظهر)", "category": "affection", "cost": 5},
        {"title": "المبادرة بتحضير كوب قهوة/شاي لي عندما أكون متعباً", "category": "service", "cost": 5},
        {"title": "القيام بمهمة منزلية نيابة عني دون طلب مسبق", "category": "service", "cost": 5},
        {"title": "ساعتان من الراحة دون مسؤوليات أو طلبات أسرية", "category": "time", "cost": 10},
        {"title": "الخروج في موعد زوجي خاص (Date) مرة هذا الشهر", "category": "time", "cost": 10},
        {"title": "الثناء على مجهوداتي أمام الأهل أو الأصدقاء", "category": "recognition", "cost": 10},
        {"title": "سؤال عن اهتماماتي أو أصدقائي والإنصات لذلك", "category": "recognition", "cost": 5}
    ]
    return {"templates": templates}

@api_router.post("/reinforcements", response_model=ReinforcementItem)
async def create_reinforcement(reinforcement_data: ReinforcementCreate, user_id: str):
    reinforcement_dict = reinforcement_data.dict()
    reinforcement_dict["user_id"] = user_id
    reinforcement_obj = ReinforcementItem(**reinforcement_dict)
    
    prepared_data = prepare_for_mongo(reinforcement_obj.dict())
    await db.reinforcements.insert_one(prepared_data)
    return reinforcement_obj

@api_router.get("/reinforcements/{partner_id}", response_model=List[ReinforcementItem])
async def get_partner_reinforcements(partner_id: str):
    """Get reinforcement items that belong to partner (visible to current user for redemption)"""
    reinforcements = await db.reinforcements.find({"user_id": partner_id, "is_active": True}).to_list(1000)
    return [ReinforcementItem(**parse_from_mongo(reinforcement)) for reinforcement in reinforcements]

@api_router.post("/reinforcements/{reinforcement_id}/redeem")
async def redeem_reinforcement(reinforcement_id: str, user_id: str):
    # Get reinforcement item
    reinforcement = await db.reinforcements.find_one({"id": reinforcement_id})
    if not reinforcement:
        raise HTTPException(status_code=404, detail="Reinforcement not found")
    
    # Get current user
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has enough points
    if user["points"] < reinforcement["cost"]:
        raise HTTPException(status_code=400, detail="Not enough points")
    
    # Deduct points
    await db.users.update_one({"id": user_id}, {"$inc": {"points": -reinforcement["cost"]}})
    
    # Record transaction
    transaction = PointTransaction(
        user_id=user_id,
        partner_id=reinforcement["user_id"],
        points=-reinforcement["cost"],
        transaction_type="spent",
        description=f"Redeemed: {reinforcement['title']}",
        reinforcement_id=reinforcement_id
    )
    
    prepared_data = prepare_for_mongo(transaction.dict())
    await db.point_transactions.insert_one(prepared_data)
    
    return {"message": "Reinforcement redeemed successfully", "remaining_points": user["points"] - reinforcement["cost"]}

# Point Management Routes
@api_router.post("/points/award")
async def award_points(transaction_data: PointTransactionCreate, user_id: str):
    # Award points to partner
    await db.users.update_one({"id": transaction_data.partner_id}, {"$inc": {"points": transaction_data.points}})
    
    # Record transaction
    transaction = PointTransaction(
        user_id=user_id,
        partner_id=transaction_data.partner_id,
        points=transaction_data.points,
        transaction_type=transaction_data.transaction_type,
        description=transaction_data.description
    )
    
    prepared_data = prepare_for_mongo(transaction.dict())
    await db.point_transactions.insert_one(prepared_data)
    
    return {"message": "Points awarded successfully"}

@api_router.get("/points/{user_id}/history", response_model=List[PointTransaction])
async def get_point_history(user_id: str):
    transactions = await db.point_transactions.find({"$or": [{"user_id": user_id}, {"partner_id": user_id}]}).to_list(1000)
    return [PointTransaction(**parse_from_mongo(transaction)) for transaction in transactions]

# Commitment Phrase Routes
@api_router.post("/commitment-phrases")
async def save_commitment_phrase(phrase_data: CommitmentPhraseCreate):
    try:
        phrase_obj = CommitmentPhrase(**phrase_data.dict())
        prepared_data = prepare_for_mongo(phrase_obj.dict())
        await db.commitment_phrases.insert_one(prepared_data)
        return {"message": "Commitment phrase saved successfully", "id": phrase_obj.id}
    except Exception as e:
        logger.error(f"Error saving commitment phrase: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@api_router.get("/commitment-phrases/{user_id}")
async def get_user_commitment_phrases(user_id: str):
    phrases = await db.commitment_phrases.find({"user_id": user_id}).to_list(100)
    return [CommitmentPhrase(**parse_from_mongo(phrase)) for phrase in phrases]

# Repair Cycle Routes
@api_router.get("/repair-cycles/{user_id}")
async def get_user_repair_cycles(user_id: str):
    # Get repair cycles where user is either offender or recipient
    repair_cycles = await db.repair_cycles.find({
        "$or": [{"offender_id": user_id}, {"recipient_id": user_id}]
    }).sort("created_at", -1).to_list(50)
    
    return [RepairCycle(**parse_from_mongo(cycle)) for cycle in repair_cycles]

@api_router.get("/repair-cycles/{user_id}/active")
async def get_active_repair_cycle(user_id: str):
    # Get the most recent active repair cycle for the user
    repair_cycle = await db.repair_cycles.find_one({
        "offender_id": user_id,
        "status": {"$ne": "completed"}
    })
    
    if not repair_cycle:
        return None
        
    return RepairCycle(**parse_from_mongo(repair_cycle))

@api_router.post("/repair-cycles/{cycle_id}/action")
async def perform_repair_action(cycle_id: str, action: RepairAction, user_id: str):
    try:
        # Get the repair cycle
        repair_cycle = await db.repair_cycles.find_one({"id": cycle_id})
        if not repair_cycle:
            raise HTTPException(status_code=404, detail="Repair cycle not found")
        
        # Perform the action based on type
        if action.action_type == "acknowledge":
            await db.repair_cycles.update_one(
                {"id": cycle_id},
                {"$set": {"offender_acknowledged": True, "status": "acknowledged"}}
            )
            return {"message": "Acknowledgment recorded", "next_step": "pay_compensation"}
            
        elif action.action_type == "pay_compensation":
            # Transfer 3 points from offender to recipient
            await db.users.update_one({"id": repair_cycle["offender_id"]}, {"$inc": {"points": -3}})
            await db.users.update_one({"id": repair_cycle["recipient_id"]}, {"$inc": {"points": 3}})
            
            # Record transaction
            transaction = PointTransaction(
                user_id=repair_cycle["offender_id"],
                partner_id=repair_cycle["recipient_id"],
                points=3,
                transaction_type="repair_compensation",
                description="تعويض عن سلوك سلبي (دورة الإصلاح الفورية)"
            )
            
            prepared_data = prepare_for_mongo(transaction.dict())
            await db.point_transactions.insert_one(prepared_data)
            
            await db.repair_cycles.update_one(
                {"id": cycle_id},
                {"$set": {"compensation_paid": True, "status": "payment_completed"}}
            )
            
            # Send confirmation to recipient using proper Notification model
            recipient_confirmation = Notification(
                user_id=repair_cycle["recipient_id"],
                type="repair_confirmation",
                title="تم الإقرار والتعويض",
                message="شريكك أقرّ بالملاحظة وأرسل لك 3 نقاط تعويض كبادرة اعتذار، وبدأ التدريب على مهارة الاستراحة والتهدئة الذاتية.",
                action_url="/help-tools",
                priority_skills=["active_listening", "expressing_needs"],
                behavior_id=repair_cycle["behavior_id"],
                is_read=False
            )
            
            # Properly serialize and insert
            confirmation_prepared = prepare_for_mongo(recipient_confirmation.dict())
            await db.notifications.insert_one(confirmation_prepared)
            
            return {"message": "Compensation paid", "next_step": "complete_skill"}
            
        elif action.action_type == "complete_skill":
            # Mark skill as completed
            current_time = datetime.now(timezone.utc).isoformat()
            await db.repair_cycles.update_one(
                {"id": cycle_id},
                {"$set": {
                    "offender_skill_completed": action.skill_id,
                    "status": "learning_completed",
                    "completed_at": current_time
                }}
            )
            
            return {"message": "Repair cycle completed successfully"}
        
        else:
            raise HTTPException(status_code=400, detail="Invalid action type")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in repair cycle action: {str(e)}")
        logger.error(f"Cycle ID: {cycle_id}, Action: {action}, User ID: {user_id}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Notification Routes
@api_router.get("/notifications/{user_id}", response_model=List[Notification])
async def get_user_notifications(user_id: str):
    notifications = await db.notifications.find({"user_id": user_id}).sort("created_at", -1).to_list(50)
    return [Notification(**parse_from_mongo(notification)) for notification in notifications]

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    await db.notifications.update_one({"id": notification_id}, {"$set": {"is_read": True}})
    return {"message": "Notification marked as read"}

@api_router.get("/notifications/{user_id}/unread-count")
async def get_unread_notification_count(user_id: str):
    count = await db.notifications.count_documents({"user_id": user_id, "is_read": False})
    return {"unread_count": count}

# Dashboard Routes
@api_router.get("/dashboard/{user_id}")
async def get_dashboard(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get partner info
    partner = None
    if user.get("partner_id"):
        partner = await db.users.find_one({"id": user["partner_id"]})
    
    # Get recent behaviors for both partners
    user_ids = [user_id]
    if user.get("partner_id"):
        user_ids.append(user["partner_id"])
    
    recent_behaviors = await db.behaviors.find({"user_id": {"$in": user_ids}}).sort("created_at", -1).to_list(10)
    
    # Get reinforcement bank
    reinforcements = []
    if partner:
        reinforcements = await db.reinforcements.find({"user_id": partner["id"], "is_active": True}).to_list(1000)
    
    # Get unread notifications
    unread_notifications = await db.notifications.find({"user_id": user_id, "is_read": False}).sort("created_at", -1).to_list(10)
    
    return {
        "user": User(**parse_from_mongo(user)),
        "partner": User(**parse_from_mongo(partner)) if partner else None,
        "recent_behaviors": [BehaviorEntry(**parse_from_mongo(behavior)) for behavior in recent_behaviors],
        "available_reinforcements": [ReinforcementItem(**parse_from_mongo(reinforcement)) for reinforcement in reinforcements],
        "unread_notifications": [Notification(**parse_from_mongo(notification)) for notification in unread_notifications]
    }

# Health check
@api_router.get("/")
async def root():
    return {"message": "Mithaq API is running", "status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()