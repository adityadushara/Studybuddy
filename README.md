# StudyBuddy - AI Study Assistant

An AI-powered study assistant that helps students learn more effectively. Upload your notes or documents and get AI-generated summaries, flashcards, quizzes, and an interactive chat to deepen your understanding.

## Features

- **Document Upload** — Upload PDFs and get AI-powered analysis
- **AI Chat** — Ask questions about your uploaded documents
- **Flashcards** — Auto-generated flashcards from your study material
- **Quizzes** — Test your knowledge with AI-generated quizzes
- **Study Timer** — Pomodoro-style study timer to stay focused
- **Goal Tracking** — Set and track your study goals
- **Dashboard** — Overview of your study progress

## Tech Stack

### Frontend (`asa-fe`)
- **Next.js 14** (React 18)
- **TypeScript**
- **Tailwind CSS** with shadcn/ui (Radix UI primitives)
- **Axios** for API communication

### Backend (`asa-be`)
- **FastAPI** (Python)
- **SQLAlchemy** with async SQLite (aiosqlite)
- **Google Gemini AI** for content generation
- **JWT Authentication** (python-jose + passlib)
- **PyPDF** for PDF text extraction

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Google Gemini API key

### Backend Setup

```bash
cd asa-be

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Create a .env file with:
# DATABASE_URL=sqlite+aiosqlite:///./studybuddy.db
# SECRET_KEY=your-super-secret-jwt-key
# ALGORITHM=HS256
# ACCESS_TOKEN_EXPIRE_MINUTES=60
# REFRESH_TOKEN_EXPIRE_DAYS=30
# GEMINI_API_KEY=your-gemini-api-key
# ALLOWED_ORIGINS=http://localhost:3000

# Run the server
python run.py
```

The API will be available at `http://localhost:8000`.

### Frontend Setup

```bash
cd asa-fe

# Install dependencies
npm install

# Configure environment variables
# Create a .env.local file with:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Run the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

## Project Structure

```
├── asa-be/                 # Backend (FastAPI)
│   ├── app/
│   │   ├── routers/        # API route handlers
│   │   ├── services/       # Business logic (AI, auth, PDF)
│   │   ├── models.py       # SQLAlchemy models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── database.py     # Database configuration
│   │   └── main.py         # FastAPI app entry point
│   ├── requirements.txt
│   └── run.py
│
├── asa-fe/                 # Frontend (Next.js)
│   ├── app/
│   │   ├── (auth)/         # Auth pages (login, register)
│   │   ├── (dashboard)/    # Dashboard pages
│   │   └── (standalone)/   # Document/notes pages
│   ├── components/         # Reusable UI components
│   ├── lib/                # Utilities and API client
│   └── package.json
│
└── README.md
```

## Deployment

### Backend on Render

1. Go to [render.com](https://render.com) and create a new **Web Service**
2. Connect your GitHub repo (`adityadushara/StudyBuddy`)
3. Set the **Root Directory** to `asa-be`
4. Render will detect the `Procfile` automatically
5. Add environment variables:
   - `DATABASE_URL` — use the Internal Database URL from a Render PostgreSQL instance
   - `SECRET_KEY` — a secure random string
   - `GEMINI_API_KEY` — your Google Gemini API key
   - `ALLOWED_ORIGINS` — your Vercel frontend URL (e.g. `https://your-app.vercel.app`)
   - `ALGORITHM` — `HS256`
   - `ACCESS_TOKEN_EXPIRE_MINUTES` — `60`
   - `REFRESH_TOKEN_EXPIRE_DAYS` — `30`

### Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and import the GitHub repo
2. Set the **Root Directory** to `asa-fe`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` — your Render backend URL (e.g. `https://studybuddy-api.onrender.com`)
4. Deploy — Vercel will auto-detect Next.js

## License

This project is for educational purposes.
