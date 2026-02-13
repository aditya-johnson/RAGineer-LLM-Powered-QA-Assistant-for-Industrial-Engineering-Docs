from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import aiofiles
from io import BytesIO

# Document processing
from pypdf import PdfReader
from docx import Document as DocxDocument

# LangChain and FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import OpenAIEmbeddings
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# FAISS storage path
FAISS_INDEX_PATH = ROOT_DIR / "faiss_index"
UPLOADS_PATH = ROOT_DIR / "uploads"
UPLOADS_PATH.mkdir(exist_ok=True)

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'ragineer-super-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI(title="RAGineer API", version="1.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Role definitions with permissions
ROLE_PERMISSIONS = {
    "admin": ["upload_docs", "delete_docs", "manage_users", "query_all", "view_all"],
    "engineer": ["upload_docs", "query_all", "view_all"],
    "technician": ["query_sops", "view_sops"],
    "viewer": ["query_limited", "view_limited"]
}

RoleType = Literal["admin", "engineer", "technician", "viewer"]

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: RoleType = "viewer"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str
    is_active: bool = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[RoleType] = None
    is_active: Optional[bool] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class DocumentBase(BaseModel):
    title: str
    description: Optional[str] = None
    doc_type: Literal["sop", "manual", "compliance", "other"] = "other"

class DocumentResponse(DocumentBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    filename: str
    uploaded_by: str
    uploaded_by_name: str
    created_at: str
    chunk_count: int
    file_size: int

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    sources: Optional[List[dict]] = None
    timestamp: str

class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    session_id: str
    message: ChatMessage
    sources: List[dict]

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="User is deactivated")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def check_permission(user: dict, permission: str):
    role = user.get("role", "viewer")
    if permission not in ROLE_PERMISSIONS.get(role, []):
        raise HTTPException(status_code=403, detail=f"Permission denied: {permission}")

# ==================== VECTOR STORE ====================

class VectorStoreManager:
    def __init__(self):
        self.embeddings = None
        self.vector_store = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
    
    def get_embeddings(self):
        if not self.embeddings:
            self.embeddings = OpenAIEmbeddings(
                api_key=EMERGENT_LLM_KEY,
                base_url="https://integrations.emergentagent.com/v1",
                model="text-embedding-3-small"
            )
        return self.embeddings
    
    async def load_or_create_store(self):
        if self.vector_store:
            return self.vector_store
        
        try:
            if FAISS_INDEX_PATH.exists():
                self.vector_store = FAISS.load_local(
                    str(FAISS_INDEX_PATH),
                    self.get_embeddings(),
                    allow_dangerous_deserialization=True
                )
                logger.info("Loaded existing FAISS index")
            else:
                # Create empty store with a placeholder
                self.vector_store = FAISS.from_texts(
                    ["RAGineer - Industrial Engineering QA System initialized"],
                    self.get_embeddings(),
                    metadatas=[{"doc_id": "system", "chunk_index": 0, "title": "System"}]
                )
                self.vector_store.save_local(str(FAISS_INDEX_PATH))
                logger.info("Created new FAISS index")
        except Exception as e:
            logger.error(f"Error loading/creating FAISS store: {e}")
            self.vector_store = FAISS.from_texts(
                ["RAGineer - Industrial Engineering QA System initialized"],
                self.get_embeddings(),
                metadatas=[{"doc_id": "system", "chunk_index": 0, "title": "System"}]
            )
        
        return self.vector_store
    
    async def add_document(self, doc_id: str, title: str, content: str, doc_type: str):
        chunks = self.text_splitter.split_text(content)
        metadatas = [
            {
                "doc_id": doc_id,
                "title": title,
                "doc_type": doc_type,
                "chunk_index": i
            }
            for i in range(len(chunks))
        ]
        
        store = await self.load_or_create_store()
        store.add_texts(chunks, metadatas)
        store.save_local(str(FAISS_INDEX_PATH))
        
        return len(chunks)
    
    async def search(self, query: str, k: int = 5, doc_types: Optional[List[str]] = None):
        store = await self.load_or_create_store()
        
        if doc_types:
            # Filter by document type
            results = store.similarity_search_with_score(query, k=k*2)
            filtered = [
                (doc, score) for doc, score in results
                if doc.metadata.get("doc_type") in doc_types
            ][:k]
            return filtered
        else:
            return store.similarity_search_with_score(query, k=k)

vector_manager = VectorStoreManager()

# ==================== DOCUMENT PROCESSING ====================

def extract_text_from_pdf(file_content: bytes) -> str:
    reader = PdfReader(BytesIO(file_content))
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

def extract_text_from_docx(file_content: bytes) -> str:
    doc = DocxDocument(BytesIO(file_content))
    text = ""
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text

def extract_text_from_txt(file_content: bytes) -> str:
    return file_content.decode('utf-8', errors='ignore')

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "password_hash": hash_password(user.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user.email, user.role)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user.email,
            name=user.name,
            role=user.role,
            created_at=user_doc["created_at"],
            is_active=True
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    token = create_token(user["id"], user["email"], user["role"])
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            created_at=user["created_at"],
            is_active=user.get("is_active", True)
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        created_at=current_user["created_at"],
        is_active=current_user.get("is_active", True)
    )

# ==================== USER MANAGEMENT ====================

@api_router.get("/users", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "manage_users")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, update: UserUpdate, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "manage_users")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return UserResponse(**updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "manage_users")
    
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted"}

# ==================== DOCUMENT ENDPOINTS ====================

@api_router.post("/documents/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: str = "",
    description: str = "",
    doc_type: str = "other",
    current_user: dict = Depends(get_current_user)
):
    check_permission(current_user, "upload_docs")
    
    # Validate file type
    allowed_extensions = [".pdf", ".docx", ".txt"]
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type not supported. Allowed: {allowed_extensions}")
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Extract text
    try:
        if file_ext == ".pdf":
            text_content = extract_text_from_pdf(content)
        elif file_ext == ".docx":
            text_content = extract_text_from_docx(content)
        else:
            text_content = extract_text_from_txt(content)
    except Exception as e:
        logger.error(f"Error extracting text: {e}")
        raise HTTPException(status_code=400, detail="Could not extract text from file")
    
    if not text_content.strip():
        raise HTTPException(status_code=400, detail="No text content found in file")
    
    # Create document record
    doc_id = str(uuid.uuid4())
    doc_title = title if title else Path(file.filename).stem
    
    # Add to vector store
    chunk_count = await vector_manager.add_document(doc_id, doc_title, text_content, doc_type)
    
    # Save file
    file_path = UPLOADS_PATH / f"{doc_id}{file_ext}"
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Save to MongoDB
    doc_record = {
        "id": doc_id,
        "title": doc_title,
        "description": description,
        "doc_type": doc_type,
        "filename": file.filename,
        "file_path": str(file_path),
        "uploaded_by": current_user["id"],
        "uploaded_by_name": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "chunk_count": chunk_count,
        "file_size": file_size
    }
    
    await db.documents.insert_one(doc_record)
    
    return DocumentResponse(**doc_record)

@api_router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(
    doc_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    role = current_user["role"]
    
    # Filter based on role
    query = {}
    if role == "technician":
        query["doc_type"] = "sop"
    elif role == "viewer":
        query["doc_type"] = {"$in": ["sop", "manual"]}
    elif doc_type:
        query["doc_type"] = doc_type
    
    docs = await db.documents.find(query, {"_id": 0}).to_list(1000)
    return [DocumentResponse(**d) for d in docs]

@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    check_permission(current_user, "delete_docs")
    
    doc = await db.documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file
    file_path = Path(doc.get("file_path", ""))
    if file_path.exists():
        file_path.unlink()
    
    # Delete from MongoDB
    await db.documents.delete_one({"id": doc_id})
    
    return {"message": "Document deleted"}

# ==================== CHAT ENDPOINTS ====================

@api_router.get("/chat/sessions", response_model=List[ChatSessionResponse])
async def list_chat_sessions(current_user: dict = Depends(get_current_user)):
    sessions = await db.chat_sessions.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    return [ChatSessionResponse(**s) for s in sessions]

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    
    # Determine allowed doc types based on role
    doc_types = None
    if role == "technician":
        doc_types = ["sop"]
    elif role == "viewer":
        doc_types = ["sop", "manual"]
    
    # Search for relevant documents
    search_results = await vector_manager.search(request.message, k=5, doc_types=doc_types)
    
    # Prepare context from search results
    context_parts = []
    sources = []
    seen_docs = set()
    
    for doc, score in search_results:
        if doc.metadata.get("doc_id") == "system":
            continue
        
        doc_id = doc.metadata.get("doc_id")
        if doc_id not in seen_docs:
            seen_docs.add(doc_id)
            # Get document info
            doc_info = await db.documents.find_one({"id": doc_id}, {"_id": 0})
            if doc_info:
                sources.append({
                    "doc_id": doc_id,
                    "title": doc_info.get("title", "Unknown"),
                    "doc_type": doc_info.get("doc_type", "other"),
                    "relevance_score": float(1 / (1 + score))
                })
        
        context_parts.append(f"[From: {doc.metadata.get('title', 'Unknown')}]\n{doc.page_content}")
    
    context = "\n\n---\n\n".join(context_parts) if context_parts else "No relevant documents found."
    
    # Create or get session
    session_id = request.session_id
    if not session_id:
        session_id = str(uuid.uuid4())
        session_doc = {
            "id": session_id,
            "user_id": current_user["id"],
            "title": request.message[:50] + "..." if len(request.message) > 50 else request.message,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "message_count": 0
        }
        await db.chat_sessions.insert_one(session_doc)
    
    # Save user message
    user_msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "user",
        "content": request.message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(user_msg)
    
    # Generate response using LLM
    system_prompt = """You are RAGineer, an expert industrial engineering QA assistant. 
You help engineers, technicians, and operators find information in technical documentation including SOPs, manuals, and compliance documents.

Guidelines:
- Provide precise, technical answers based on the provided context
- Always cite which document your answer comes from
- If the context doesn't contain relevant information, clearly state that
- Use proper technical terminology
- Format responses clearly with bullet points or numbered steps when appropriate
- Highlight safety-critical information when relevant

Context from documents:
{context}"""

    try:
        chat_llm = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"rag_{session_id}_{uuid.uuid4().hex[:8]}",
            system_message=system_prompt.format(context=context)
        )
        chat_llm.with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=request.message)
        response_text = await chat_llm.send_message(user_message)
    except Exception as e:
        logger.error(f"LLM error: {e}")
        response_text = f"I found relevant information in the following documents: {', '.join([s['title'] for s in sources])}. However, I encountered an error generating a detailed response. Please try again."
    
    # Save assistant message
    assistant_msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "assistant",
        "content": response_text,
        "sources": sources,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(assistant_msg)
    
    # Update session
    await db.chat_sessions.update_one(
        {"id": session_id},
        {
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            "$inc": {"message_count": 2}
        }
    )
    
    return ChatResponse(
        session_id=session_id,
        message=ChatMessage(
            role="assistant",
            content=response_text,
            sources=sources,
            timestamp=assistant_msg["timestamp"]
        ),
        sources=sources
    )

@api_router.get("/chat/sessions/{session_id}/messages", response_model=List[ChatMessage])
async def get_session_messages(session_id: str, current_user: dict = Depends(get_current_user)):
    # Verify session belongs to user
    session = await db.chat_sessions.find_one(
        {"id": session_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = await db.chat_messages.find(
        {"session_id": session_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    
    return [ChatMessage(**m) for m in messages]

@api_router.delete("/chat/sessions/{session_id}")
async def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    session = await db.chat_sessions.find_one(
        {"id": session_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await db.chat_messages.delete_many({"session_id": session_id})
    await db.chat_sessions.delete_one({"id": session_id})
    
    return {"message": "Session deleted"}

# ==================== STATS ENDPOINT ====================

@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    doc_count = await db.documents.count_documents({})
    user_count = await db.users.count_documents({})
    session_count = await db.chat_sessions.count_documents({"user_id": current_user["id"]})
    
    # Get doc type breakdown
    pipeline = [
        {"$group": {"_id": "$doc_type", "count": {"$sum": 1}}}
    ]
    doc_types = await db.documents.aggregate(pipeline).to_list(100)
    
    return {
        "total_documents": doc_count,
        "total_users": user_count,
        "my_sessions": session_count,
        "doc_types": {d["_id"]: d["count"] for d in doc_types}
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "RAGineer API is running", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
