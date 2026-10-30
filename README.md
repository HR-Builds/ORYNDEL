# ORYNDEL - AI-Powered E-Commerce Intelligence Platform

<p align="center">
  <strong>Smarter Commerce. Intelligent Decisions.</strong>
</p>

<p align="center">
  An AI-powered e-commerce platform built to bring intelligent automation, product insights, and agent-based workflows into modern online retail.
</p>

---

## Overview

**ORYNDEL** is a full-stack e-commerce intelligence platform that combines modern web technologies with AI-powered agents to help improve shopping experiences and simplify business operations.

The platform brings together product discovery, customer management, and intelligent automation in one system. Its agent-based architecture is designed to support specific e-commerce tasks through focused AI workflows.

ORYNDEL is an ongoing development project focused on exploring practical applications of AI in real-world commerce.

## Key Features

### AI Agent System

ORYNDEL includes specialized AI agents designed for different e-commerce workflows:

- **Product Recommendation Agent** — Finds relevant products based on customer search queries.
- **Pricing Auditor Agent** — Analyzes product pricing against competitor information to identify potential pricing differences.
- **Refund & Escalation Agent** — Supports refund request handling and review workflows.
- **Fraud Detection Agent** — Provides a foundation for identifying potentially suspicious activity.
- **SEO Onboarding Agent** — Supports product and store SEO onboarding workflows.

### E-Commerce Management

- Product catalogue management
- Customer registration and authentication
- Email-based OTP verification
- Admin dashboard
- Order and customer management
- Role-based access and protected API routes

### AI-Powered Intelligence

- LLM-powered workflows
- Competitor research through web search
- Context-aware product recommendations
- Automated agent execution and run tracking
- Human review workflows for sensitive operations

## Technology Stack

| Layer | Technologies |
|---|---|
| Backend | Python, FastAPI |
| Frontend | React, Vite, JavaScript |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Database Migrations | Alembic |
| AI Framework | LangChain, LangGraph |
| LLM Integration | Groq |
| Web Research | Tavily |
| Authentication | JWT, password hashing |
| Email | SMTP, OTP verification |
| API Documentation | Swagger / OpenAPI |
| Deployment | Vercel |

## Architecture

ORYNDEL follows a frontend-and-backend architecture.

```text
                 ORYNDEL PLATFORM
                        |
          +-------------+-------------+
          |                           |
     React Frontend              FastAPI Backend
          |                           |
          |                    Authentication
          |                           |
          |                    Business Logic
          |                           |
          |                    Agent Workflows
          |                           |
          |             +-------------+-------------+
          |             |             |             |
          |        Recommendation  Pricing      Refund &
          |           Agent         Agent      Escalation
          |             |             |             |
          |             +-------------+-------------+
          |                           |
          |                     PostgreSQL
          |                           |
          +---------------------------+
```

## Project Structure

```text
ORYNDEL/
│
├── alembic/
│   └── versions/
│
├── app/
│   ├── agents/
│   ├── api/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── config.py
│   ├── database.py
│   └── main.py
│
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── pages/
│       └── styles/
│
├── requirements.txt
├── alembic.ini
└── README.md
```

*Note: This is a simplified overview of the project structure.*

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Python 3.11+
- Node.js
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/HR-Builds/ORYNDEL.git
cd ORYNDEL
```

### 2. Backend Setup

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
.\venv\Scripts\Activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Environment Configuration

Create a `.env` file in the backend project root and configure the required environment variables.

Typical configuration includes:

```env
DATABASE_URL=your_postgresql_connection_string

SECRET_KEY=your_secret_key

GROQ_API_KEY=your_groq_api_key

TAVILY_API_KEY=your_tavily_api_key

FRONTEND_URL=http://localhost:5173
```

Configure your SMTP credentials and other required settings according to the application configuration.

**Security:** Never commit your `.env` file or expose API keys, database credentials, or secret keys.

### 4. Database Migrations

Apply database migrations:

```bash
python -m alembic upgrade head
```

Make sure `DATABASE_URL` points to the intended development database before running migrations.

### 5. Start the Backend

```bash
uvicorn app.main:app --reload
```

Backend:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

### 6. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Start the development server:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## API Documentation

ORYNDEL uses FastAPI's automatic OpenAPI documentation.

Once the backend is running, explore the available endpoints at:

`http://localhost:8000/docs`

## Project Goals

ORYNDEL is being developed with a focus on:

- Building practical AI agents for e-commerce operations.
- Improving product discovery through intelligent recommendations.
- Exploring competitor-aware pricing analysis.
- Reducing repetitive administrative workflows.
- Combining traditional backend engineering with agentic AI systems.

## Current Development Status

ORYNDEL is actively evolving. Features and workflows are being developed, tested, and improved as the platform grows.

Some agent capabilities may require external API credentials and additional configuration.

## Developer

**Hassan Rashid**


---

<p align="center">
  <strong>ORYNDEL</strong><br/>
  Smarter Commerce. Intelligent Decisions.
</p>
