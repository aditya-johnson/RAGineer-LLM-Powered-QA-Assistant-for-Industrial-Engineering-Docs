# RAGineer - Industrial-Grade LLM-Powered QA Assistant

<div align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-amber" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/Python-3.11+-blue" alt="Python">
  <img src="https://img.shields.io/badge/React-19.0-61DAFB" alt="React">
</div>

## 🏭 Overview

**RAGineer** is an enterprise-ready Question-Answering system designed for industrial engineering environments. It leverages Retrieval-Augmented Generation (RAG) to provide accurate, context-aware answers from engineering manuals, Standard Operating Procedures (SOPs), and compliance documents.

Built with security in mind, RAGineer implements Role-Based Access Control (RBAC) to ensure proper access levels across different user roles in industrial settings.

---

## ✨ Key Features

### 🔍 RAG-Powered Intelligence
- **Semantic Search**: Uses FAISS vector database for lightning-fast similarity search across documents
- **Contextual Responses**: GPT-5.2 generates accurate answers based on retrieved document context
- **Source Citations**: Every response includes references to source documents

### 📄 Document Management
- **Multi-Format Support**: Upload PDF, DOCX, and TXT files
- **Automatic Chunking**: Documents are intelligently split for optimal retrieval
- **Document Classification**: Categorize documents as SOPs, Manuals, Compliance, or Other
- **Full-Text Indexing**: All uploaded documents are automatically indexed for search

### 🔐 Enterprise Security (RBAC)
| Role | Permissions |
|------|-------------|
| **Admin** | Full access: upload/delete docs, manage users, query all documents |
| **Engineer** | Upload documents, query all documents, view all documents |
| **Technician** | Query SOPs only, limited document access |
| **Viewer** | Read-only access, limited query scope |

### 🎨 Industrial-Grade UI
- Dark theme optimized for control room environments
- High contrast for excellent readability
- JetBrains Mono typography for technical precision
- Responsive design for various screen sizes

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         RAGineer System                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   React UI   │───▶│  FastAPI     │───▶│   MongoDB    │      │
│  │  (Frontend)  │    │  (Backend)   │    │  (Database)  │      │
│  └──────────────┘    └──────┬───────┘    └──────────────┘      │
│                             │                                    │
│                             ▼                                    │
│                    ┌──────────────┐                             │
│                    │    FAISS     │                             │
│                    │(Vector Store)│                             │
│                    └──────┬───────┘                             │
│                           │                                      │
│                           ▼                                      │
│                    ┌──────────────┐                             │
│                    │  OpenAI API  │                             │
│                    │  (GPT-5.2)   │                             │
│                    └──────────────┘                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 19, Tailwind CSS, Shadcn/UI, Phosphor Icons |
| **Backend** | FastAPI, Python 3.11+, LangChain |
| **Database** | MongoDB (document storage), FAISS (vector search) |
| **LLM** | OpenAI GPT-5.2 via Emergent LLM Key |
| **Embeddings** | HuggingFace all-MiniLM-L6-v2 (local, air-gapped ready) |
| **Authentication** | JWT (JSON Web Tokens) |

---

## 📁 Project Structure

```
/app
├── backend/
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   ├── .env               # Environment variables
│   ├── uploads/           # Uploaded document storage
│   └── faiss_index/       # FAISS vector store persistence
│
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main React application
│   │   ├── App.css        # Application styles
│   │   ├── index.css      # Global styles (Tailwind)
│   │   ├── components/
│   │   │   ├── ui/        # Shadcn UI components
│   │   │   ├── Sidebar.js
│   │   │   └── ProtectedLayout.js
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── ChatPage.js
│   │   │   ├── DocumentsPage.js
│   │   │   ├── AdminPage.js
│   │   │   └── SettingsPage.js
│   │   ├── contexts/
│   │   │   └── AuthContext.js
│   │   └── lib/
│   │       └── api.js     # API client
│   ├── package.json
│   └── tailwind.config.js
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB 6.0+
- Yarn package manager

### Environment Variables

#### Backend (`/app/backend/.env`)
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="ragineer_db"
CORS_ORIGINS="*"
JWT_SECRET="your-secure-secret-key"
EMERGENT_LLM_KEY="your-emergent-llm-key"
```

#### Frontend (`/app/frontend/.env`)
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ragineer
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   yarn install
   ```

4. **Start MongoDB**
   ```bash
   mongod --dbpath /data/db
   ```

5. **Start the backend**
   ```bash
   cd backend
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

6. **Start the frontend**
   ```bash
   cd frontend
   yarn start
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8001/api

---

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Engineer",
  "role": "engineer"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Engineer",
    "role": "engineer"
  }
}
```

### Document Endpoints

#### Upload Document
```http
POST /api/documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
title: "Safety Procedures Manual"
description: "Plant safety guidelines"
doc_type: "manual"  # sop | manual | compliance | other
```

#### List Documents
```http
GET /api/documents?doc_type=sop
Authorization: Bearer <token>
```

#### Delete Document
```http
DELETE /api/documents/{doc_id}
Authorization: Bearer <token>
```

### Chat Endpoints

#### Send Message (RAG Query)
```http
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "What are the safety procedures for hydraulic systems?",
  "session_id": "optional-session-uuid"
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "message": {
    "role": "assistant",
    "content": "Based on the Safety Procedures Manual...",
    "sources": [
      {
        "doc_id": "uuid",
        "title": "Safety Procedures Manual",
        "doc_type": "manual",
        "relevance_score": 0.92
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "sources": [...]
}
```

#### List Chat Sessions
```http
GET /api/chat/sessions
Authorization: Bearer <token>
```

#### Get Session Messages
```http
GET /api/chat/sessions/{session_id}/messages
Authorization: Bearer <token>
```

### User Management Endpoints (Admin Only)

#### List Users
```http
GET /api/users
Authorization: Bearer <admin-token>
```

#### Update User
```http
PUT /api/users/{user_id}
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "role": "technician",
  "is_active": true
}
```

#### Delete User
```http
DELETE /api/users/{user_id}
Authorization: Bearer <admin-token>
```

### Statistics Endpoint

```http
GET /api/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_documents": 15,
  "total_users": 8,
  "my_sessions": 12,
  "doc_types": {
    "sop": 5,
    "manual": 6,
    "compliance": 3,
    "other": 1
  }
}
```

---

## 🎯 Usage Guide

### 1. Initial Setup

1. Register an admin account (first user)
2. Login with admin credentials
3. Navigate to the Documents page

### 2. Uploading Documents

1. Click "UPLOAD DOCUMENT" button
2. Select a PDF, DOCX, or TXT file
3. Provide a title and optional description
4. Select the document type:
   - **SOP**: Standard Operating Procedures
   - **Manual**: Technical/maintenance manuals
   - **Compliance**: Regulatory documents
   - **Other**: Miscellaneous documents
5. Click "UPLOAD & INDEX"

The system will automatically:
- Extract text from the document
- Split it into searchable chunks
- Create vector embeddings
- Index in FAISS for semantic search

### 3. Querying Documents

1. Navigate to the Chat page
2. Type your question in natural language
3. Press Enter or click the send button
4. View the AI-generated response with source citations

**Example queries:**
- "What are the lockout/tagout procedures for conveyor systems?"
- "Explain the maintenance schedule for hydraulic pumps"
- "What PPE is required for welding operations?"
- "Summarize the emergency evacuation procedures"

### 4. Managing Users (Admin)

1. Navigate to the Admin page
2. View all registered users
3. Change user roles using the dropdown
4. Toggle user active status
5. Delete users if necessary

---

## 🔒 Security Considerations

### Authentication
- JWT tokens with 24-hour expiration
- Passwords hashed using bcrypt
- Token validation on every protected request

### Authorization (RBAC)
- Role-based permission checking
- Middleware enforcement on all sensitive endpoints
- Document filtering based on user role

### Best Practices
- Keep `JWT_SECRET` secure and unique per environment
- Rotate `EMERGENT_LLM_KEY` periodically
- Use HTTPS in production
- Implement rate limiting for API endpoints
- Regular backup of MongoDB and FAISS index

---

## 🛠️ Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
yarn test
```

### Code Style
- Backend: Black, isort, flake8
- Frontend: ESLint, Prettier

### Building for Production
```bash
# Frontend build
cd frontend
yarn build

# Backend runs with uvicorn in production mode
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
```

---

## 📊 Performance Optimization

### FAISS Index
- Uses `IndexFlatL2` for exact search (can switch to `IndexIVFFlat` for larger datasets)
- Index persisted to disk for fast startup
- Incremental updates supported

### Document Processing
- Chunk size: 1000 characters with 200 overlap
- Optimal for technical documentation retrieval
- Adjustable based on document type

### Caching
- Vector store loaded once and kept in memory
- Embeddings model singleton pattern
- Session-based chat history

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [LangChain](https://langchain.com/) - LLM orchestration framework
- [FAISS](https://github.com/facebookresearch/faiss) - Vector similarity search
- [OpenAI](https://openai.com/) - GPT-5.2 language model
- [Shadcn/UI](https://ui.shadcn.com/) - React component library
- [Phosphor Icons](https://phosphoricons.com/) - Icon library

---

<div align="center">
  <p><strong>RAGineer</strong> - Industrial-Grade QA Intelligence</p>
  <p>Built with ❤️ for Industrial Engineering Teams</p>
</div>
