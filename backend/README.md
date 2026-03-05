# ⚙️ Muse Backend

The backend for Project Muse is a **FastAPI** application that orchestrates the real-time interaction between the user, Gemini 2.0 Flash Live, and Vertex AI Imagen 3.

## 🛠️ Setup

1. **Prerequisites**:
   - Python 3.10+
   - Google Cloud Project with Vertex AI APIs enabled.
   - [Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc) configured:
     ```bash
     gcloud auth application-default login
     ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment**:
   Create a `.env` file in this directory (based on `app/config.py`):
   ```env
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_CLOUD_LOCATION=us-central1
   ```

4. **Run the Server**:
   ```bash
   python -m app.main
   ```
   The server will start on `http://localhost:8000`.

## 🧠 Key Modules

- `app/gemini_live.py`: Manages the bidirectional WebSocket stream with Gemini 2.0 Flash Live.
- `app/imagen.py`: Handles high-quality image generation requests via Vertex AI Imagen 3.
- `app/websocket_handler.py`: Routes audio and vision data between the client and AI models.
- `app/config.py`: Centralized configuration using Pydantic Settings.

## 📦 Containerization

A `Dockerfile` is provided for deploying the backend to **Google Cloud Run**. Ensure your Cloud Run service has the necessary IAM permissions (`Vertex AI User`) and environment variables set.
