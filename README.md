# ThreatBrief
### AI-Powered Vulnerability Intelligence

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.dot.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-AI-orange?style=for-the-badge)

ThreatBrief is a modern Threat Intelligence platform that filters the global noise of vulnerabilities into actionable, personalized intelligence. By mapping your specific technology stack to real-time CVE data, it provides AI-summarized risk analysis, exploit probability scores, and active exploitation alerts.

---

##  Tech Stack

### Frontend
- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS v4 & Shadcn UI
- **Animations**: Framer Motion
- **Visuals**: Recharts (Risk Scoring) & Lucide React (Icons)

### Backend
- **API**: FastAPI (Python 3.10+)
- **Database**: SQLite with SQLAlchemy ORM
- **Intelligence Pipeline**: Asyncio Background Tasks
- **News Ingestion**: Feedparser (RSS)

### Intelligence Sources
- **NVD API**: Real-time CVE 2.0 vulnerability feed.
- **CISA KEV**: Automated matching against Known Exploited Vulnerabilities.
- **FIRST EPSS**: Exploit Prediction Scoring System for probability analysis.
- **Groq LLM**: Llama 3.3 for high-speed technical summaries and sentiment analysis.

---

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# Unix/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```
Create a `.env` file in the `backend/` directory:
```env
GROQ_API_KEY=your_api_key_here
```
Run the server:
```bash
uvicorn main:app --reload --port 8001
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## Project Approach: The VulIntel Engine

ThreatBrief's intelligence engine, **VulIntel**, follows a strict logic pipeline to ensure high data density and relevance:

1. **90-Day Recency Window**: The engine exclusively fetches and processes vulnerabilities published within the last 90 days. This avoids legacy bloat and focuses on the "Active Window" of exploitation.
2. **50-Item Database Retention**: To maintain ultra-low latency, the system implements a strict retention policy, keeping only the top 50 most relevant vulnerabilities per user tech-pivot in the local cache.
3. **Tech-Stack Pivoting**: A hybrid matching system that combines:
   - **Precise Matching**: Deterministic CPE (Common Platform Enumeration) string alignment.
   - **Semantic Matching**: Keyword-based description pivoting for emerging tech not yet indexed by official CPEs.

---

## Architecture

### Background Fetching Pipeline
The backend runs a persistent background worker (`asyncio`) that polls the NVD and CISA feeds every 30 minutes. New CVEs are automatically enriched with EPSS scores and queued for AI summarization if they match any active user's tech stack.

### SQLite Database Structure
- **Users**: Persistent profiles storing tech stack metadata (JSON-encoded CPE lists).
- **Vulnerabilities**: Raw data from NVD, CISA KEV flags, and EPSS exploitation probabilities.
- **Threat Summaries**: Cached Groq LLM outputs including severity ranks and affected technology lists.
- **News Articles**: Cyber-news feed ingested from RSS sources, prioritized by tech stack relevance.

---

## Author
**Harshit Bhardwaj**  
Computer Science Undergraduate  
*Building systems that turn data into defense.*
