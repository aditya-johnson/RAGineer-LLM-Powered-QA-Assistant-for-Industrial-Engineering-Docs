# RAGineer - Product Requirements Document

## Original Problem Statement
RAGineer – LLM-Powered QA Assistant for Industrial Engineering Docs. Develop an industrial-grade QA chatbot that leverages Retrieval-Augmented Generation (RAG) to answer complex technical and procedural questions from engineering manuals, SOPs, and compliance documents.

## User Choices
- **LLM Provider**: OpenAI GPT-5.2 via Emergent LLM Key
- **Vector Database**: FAISS (local, air-gapped ready)
- **Embeddings**: HuggingFace all-MiniLM-L6-v2 (local)
- **Document Upload**: Hybrid - pre-populated + user uploads (PDF, DOCX, TXT)
- **RBAC Roles**: Extended (Admin, Engineer, Technician, Viewer)
- **Frontend**: React with industrial dark theme

## Architecture
```
Frontend (React) → Backend (FastAPI) → MongoDB + FAISS + GPT-5.2
```

## User Personas
1. **Admin**: Full system access, manages users and documents
2. **Engineer**: Uploads documents, queries all docs
3. **Technician**: Queries SOPs only, limited access
4. **Viewer**: Read-only, limited query scope

## Core Requirements (Static)
- [x] JWT-based authentication
- [x] Role-based access control (RBAC)
- [x] Document upload and processing (PDF, DOCX, TXT)
- [x] FAISS vector store for semantic search
- [x] RAG-powered chat with GPT-5.2
- [x] Source citations in responses
- [x] User management (admin only)
- [x] Industrial dark theme UI

## What's Been Implemented

### February 13-14, 2026
- **Backend (FastAPI)**
  - Authentication endpoints (register, login, me)
  - Document management (upload, list, delete)
  - RAG chat with FAISS + GPT-5.2
  - User management (CRUD)
  - Stats endpoint
  - RBAC middleware

- **Frontend (React)**
  - Login/Register page with industrial theme
  - Chat interface with suggestion prompts
  - Documents page with upload modal
  - Admin page for user management
  - Settings page
  - Sidebar navigation with role-based visibility

- **Infrastructure**
  - MongoDB for document/user storage
  - FAISS index persistence
  - HuggingFace embeddings (local, air-gapped)

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] RAG chat functionality
- [x] Document upload and indexing
- [x] Authentication and authorization

### P1 (High Priority)
- [ ] Bulk document upload
- [ ] Document preview/viewer
- [ ] Chat history export
- [ ] Advanced search filters

### P2 (Medium Priority)
- [ ] Document version control
- [ ] Audit logging
- [ ] Analytics dashboard
- [ ] PDF generation for reports

### P3 (Nice to Have)
- [ ] Multi-language support
- [ ] Voice input for queries
- [ ] Mobile-responsive optimizations
- [ ] Integration with external document sources

## Next Tasks
1. Add more sample documents for demo purposes
2. Implement document preview feature
3. Add analytics for most queried topics
4. Implement bulk document upload
5. Add audit logging for compliance
