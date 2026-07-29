# 🧠 QueryMind

> **AI Second Brain + Digital Twin + Life Operating System**

An AI-driven Personal Knowledge Management and Retrieval System that enables users to upload, organize, and intelligently interact with their personal documents using RAG, Semantic Search, and Memory Intelligence.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS v3, shadcn/ui, Framer Motion |
| **Backend** | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 |
| **Database** | PostgreSQL (Supabase) |
| **Vector DB** | Qdrant (Docker dev / Cloud prod) |
| **AI/LLM** | Google Gemini API, LangChain, Sentence Transformers (BGE-Small) |
| **OCR** | Tesseract OCR, PyMuPDF, python-docx |
| **Auth** | Supabase Auth |
| **Storage** | Local (dev) / Supabase Storage (prod) |
| **Deployment** | Vercel (frontend), Render (backend) |

---

## 📁 Project Structure

```
querymind/
├── frontend/          # Next.js 14 + TypeScript
├── backend/           # FastAPI + Python
├── docker-compose.yml # PostgreSQL + Qdrant (dev)
├── .gitignore
├── .env.example
└── README.md
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker Desktop
- Git

### 1. Clone the repo
```bash
git clone https://github.com/Priyansh840/QueryMind.git
cd QueryMind
```

### 2. Start databases (Docker)
```bash
docker-compose up -d
```

### 3. Setup Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

### 5. Open in browser
- Frontend: http://localhost:3000
- Backend API Docs: http://localhost:8000/docs
- Qdrant Dashboard: http://localhost:6333/dashboard

---

## 📌 MVP Features (V1.0)

- ✅ Authentication (Supabase Auth)
- ✅ Dashboard
- ✅ Knowledge Vault (Upload PDF, DOCX, Images, TXT, MD)
- ✅ AI Chat with RAG (Citations, Conversation History)
- ✅ Semantic Search
- ✅ Memory Engine + Memory Inspector
- ✅ Timeline
- ✅ Smart Tagging
- ✅ Weekly Reflection

---

## 👥 Team

| Name | Role |
|------|------|
| Priyansh | Full Stack + AI |
| Praneet Shukla | AI + Full Stack |
| | |
| | |

---

## 📄 License

This project is for educational purposes — SSIPMT, Raipur (7th Sem, CSE).
