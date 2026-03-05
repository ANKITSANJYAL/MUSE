# Project Muse (Obviously Vibe Coded)

**Project Muse** is a real-time multimodal creative agent designed to help creators storyboard and visualize ideas instantly. It leverages the power of Gemini 2.0 Flash for low-latency voice/vision interactions and Imagen 3 for high-quality on-demand visual generation.

---

##  Key Features

- **Real-time Multimodal Interaction**: Talk to "Muse" (your creative director) via raw PCM audio streaming.
- **Dynamic Storyboarding**: Muse understands your creative vision and triggers `IMAGEN_PROMPT` tags in real-time.
- **Instant Visualization**: Integration with Vertex AI Imagen 3 creates visuals as you speak.
- **Low-Latency Loop**: Built on Gemini 2.0 Flash Live for near-instant response times.

---

## Architecture

- **Frontend**: Next.js (TypeScript) + Tailwind CSS + WebSockets for real-time audio/vision.
- **Backend**: FastAPI (Python) + Google GenAI SDK (Gemini Live & Imagen).
- **Deployment**: Google Cloud Run + Terraform for Infrastructure as Code.

---

##  Quick Start

### 1. Prerequisites

- Google Cloud Project with Billing enabled.
- Python 3.10+ and Node.js 18+.
- Authenticated via `gcloud auth application-default login`.

### 2. Setup

```bash
# Clone the repository
git clone <repo-url>
cd MUSE

# Setup Backend
cd backend
python -m venv venv
source venv/bin/activate  # Or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env  # Configure your Project ID and Location

# Setup Frontend
cd ../frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to start creating!

---

## 📖 Sub-module Documentation

- [Frontend Details](frontend/README.md)
- [Backend Details](backend/README.md)
- [Infrastructure (Terraform)](infra/README.md)
