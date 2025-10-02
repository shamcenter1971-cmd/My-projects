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
def prepare_for_mongo(data):
    if isinstance(data.get('created_at'), datetime):
        data['created_at'] = data['created_at'].isoformat()
    return data

def parse_from_mongo(item):
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
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
    behavior_dict = behavior_data.dict()
    behavior_dict["user_id"] = user_id
    behavior_obj = BehaviorEntry(**behavior_dict)
    
    prepared_data = prepare_for_mongo(behavior_obj.dict())
    await db.behaviors.insert_one(prepared_data)
    
    # Award point for positive behavior
    if behavior_data.behavior_type == "positive":
        await db.users.update_one({"id": user_id}, {"$inc": {"points": 1}})
    
    return behavior_obj

@api_router.get("/behaviors/{user_id}", response_model=List[BehaviorEntry])
async def get_user_behaviors(user_id: str):
    behaviors = await db.behaviors.find({"user_id": user_id}).to_list(1000)
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
    
    # Get recent behaviors
    recent_behaviors = await db.behaviors.find({"user_id": user_id}).sort("created_at", -1).to_list(5)
    
    # Get reinforcement bank
    reinforcements = []
    if partner:
        reinforcements = await db.reinforcements.find({"user_id": partner["id"], "is_active": True}).to_list(1000)
    
    return {
        "user": User(**parse_from_mongo(user)),
        "partner": User(**parse_from_mongo(partner)) if partner else None,
        "recent_behaviors": [BehaviorEntry(**parse_from_mongo(behavior)) for behavior in recent_behaviors],
        "available_reinforcements": [ReinforcementItem(**parse_from_mongo(reinforcement)) for reinforcement in reinforcements]
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