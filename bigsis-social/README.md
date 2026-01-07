# Big SIS Social 📸 - The Viral Voice

The `bigsis-social` is a specialized lightweight client designed for content creators and social media managers. It focuses on speed and "viral" formatting.

## 🎯 Primary Objectives
1.  **Viral Tone**: Generate catchy, direct, and slightly disruptive content for Instagram (The "Fiche Vérité").
2.  **Lean Client**: Delegating all medical logic, RAG, and validation to the `bigsis-brain` API.
3.  **Previewing**: Providing a simple way to visualize content before publication.

## 🛠 Features

### 🖋 Social Generation
- **Direct Mode**: Generates a social-ready JSON with a catchy title, a viral advice, and a bold verdict.
- **Brain-Powered**: Uses the `SOCIAL_VOICE` prompt layer on top of the Brain's clinical knowledge.

### 🖼 Insta-Viewer
- A specialized local tool (`insta-viewer.html`) to preview how the generated content would look on mobile/feed.

## 🏁 Development

### Requirements
- Python 3.10+
- Access to a running `bigsis-brain` instance.

### Setup
```bash
cd bigsis-social
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

## 🏗 Relationship with the Brain
Unlike the main App which seeks to educate, the Social client seeks to **engage**. It calls the same Brain but asks for a "Social Delivery". This ensures that even "catchy" content is always backed by real science.
