import os
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
from utils import ai_engine

app = Flask(__name__, static_folder='frontend/out', static_url_path='')
app.config['SECRET_KEY'] = 'coursemate_ai_secret_key_123'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Simple in-memory cache for RAG
document_store = {"current_text": "", "topic": ""}

# --- Models ---
class History(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(20), nullable=False) # 'chat', 'notes', 'quiz', 'recommendation'
    topic = db.Column(db.String(200))
    content = db.Column(db.Text, nullable=False) # JSON format for structured data
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# Ensure database tables are created (especially when running under Gunicorn on Render)
with app.app_context():
    db.create_all()

# --- Serve Static Next.js Frontend ---

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# --- API Endpoints ---

@app.route('/api/history', methods=['GET', 'DELETE'])
def api_history():
    if request.method == 'DELETE':
        try:
            History.query.delete()
            db.session.commit()
            # Reset in-memory cached documents as well
            document_store["current_text"] = ""
            document_store["topic"] = ""
            return jsonify({'status': 'success', 'message': 'All chat history cleared'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'status': 'error', 'message': str(e)}), 500

    history_items = History.query.order_by(History.timestamp.desc()).all()
    history_list = []
    for item in history_items:
        history_list.append({
            'id': item.id,
            'type': item.type,
            'topic': item.topic,
            'content': item.content,
            'timestamp': item.timestamp.isoformat() if item.timestamp else None
        })
    return jsonify({'history': history_list})


@app.route('/api/history/<int:item_id>', methods=['DELETE'])
def delete_history_item(item_id):
    try:
        item = History.query.get(item_id)
        if not item:
            return jsonify({'status': 'error', 'message': 'Item not found'}), 404
        db.session.delete(item)
        db.session.commit()
        return jsonify({'status': 'success', 'message': f'History item {item_id} deleted'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/chat', methods=['POST'])
def api_chat():
    data = request.json
    message = data.get('message')
    mode = data.get('mode', 'general')
    
    # Map modes to specialized system prompts
    contexts = {
        'notes': "You are CourseMate Notes AI, a premium academic synthesizer. Help the user summarize documents, define key concepts, and structure study guides in clean Markdown.",
        'tutor': "You are CourseMate Tutor AI. You are a friendly teacher. Explain complex topics, offer step-by-step guides, define concepts, and answer Q&As.",
        'quiz': "You are CourseMate Quiz AI. Generate interactive MCQs, grade the user's answers, and explain correct/wrong choices to test understanding.",
        'pathfinder': "You are CourseMate Pathfinder AI. You are a professional career advisor. Help users build roadmaps, recommend courses, evaluate skills, and design career steps."
    }
    
    system_instruction = contexts.get(mode, "You are a helpful education assistant.")
    response_text = ai_engine.get_ai_response(message, context=system_instruction)
    
    try:
        new_entry = History(type=mode, content=json.dumps({'query': message, 'response': response_text}))
        db.session.add(new_entry)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Database sync error: {e}")
    
    return jsonify({'response': response_text})

@app.route('/api/generate-notes', methods=['POST'])
def generate_notes():
    topic = request.form.get('topic')
    file = request.files.get('file')
    
    source_text = ""
    display_topic = topic or "Uploaded Document"
    
    level = request.form.get('level', 'Intermediate')
    mode = request.form.get('mode', 'Standard')
    
    extracted_text = ""
    if file:
        extracted_text = ai_engine.extract_text_from_file(file)
        if not topic:
            display_topic = file.filename
    
    # User's specifically requested prompt template
    prompt_template = f"""
    Generate structured study notes.

    Topic: {topic if topic else display_topic}

    Content:
    {extracted_text if extracted_text else "Base the notes on internal academic knowledge regarding the topic."}

    Include:
    - Introduction
    - Definitions
    - Key Concepts
    - Examples
    - Short Revision Points
    - Important Questions

    Level: {level}
    Mode: {mode}
    """
    
    system_instruction = "You are CourseMate AI, a premium academic synthesizer. Construct the response with high-end Markdown formatting."
    
    try:
        notes_content = ai_engine.get_ai_response(prompt_template, context=system_instruction)
        
        if not notes_content or len(notes_content) < 50:
            raise ValueError("Insufficient AI response for notes")

        new_entry = History(type='notes', topic=display_topic, content=notes_content)
        db.session.add(new_entry)
        db.session.commit()
        
        # Cache for RAG operations
        document_store["current_text"] = extracted_text if extracted_text else notes_content
        document_store["topic"] = display_topic
        
    except Exception as e:
        print(f"Notes generation error: {e}")
        db.session.rollback()
        notes_content = f"# Sync Error\n\nUnable to reach the neural manuscript engine for '{display_topic}'. Please check your subject matter and try again."
    
    return jsonify({'notes': notes_content})

@app.route('/api/document-status', methods=['GET'])
def document_status():
    return jsonify({
        'has_document': bool(document_store["current_text"]),
        'topic': document_store.get("topic", "")
    })

@app.route('/api/rag-chat', methods=['POST'])
def rag_chat():
    data = request.json
    query = data.get('query')
    
    if not document_store["current_text"]:
        return jsonify({'response': "No document context found. Please generate or upload notes first."})
        
    response = ai_engine.perform_rag(query, document_store["current_text"])
    return jsonify({'response': response})

@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    data = request.json
    topic = data.get('topic')
    num_questions = data.get('num_questions', 10)
    
    # Forceful prompt for specified number of questions
    system_context = f"Output strictly as a JSON array of {num_questions} high-quality MCQ objects. " \
                     "Each object format: {\"question\": \"...\", \"options\": [\"a\", \"b\", \"c\", \"d\"], \"answer\": \"correct value\"}. " \
                     "Cover the topic comprehensively with varied difficulty. No introductory text."
    
    quiz_response = ai_engine.get_ai_response(topic, context=system_context)
    
    try:
        # Robust JSON extraction
        import re
        # Remove any markdown code blocks if present
        clean_response = re.sub(r'```json\s*|\s*```', '', quiz_response).strip()
        
        json_match = re.search(r'\[.*\]', clean_response, re.DOTALL)
        if json_match:
            quiz_data = json.loads(json_match.group())
        else:
            quiz_data = json.loads(clean_response)
    except Exception as e:
        print(f"Quiz parsing failure: {e}")
        # Multi-question fallback with requested number
        quiz_data = []
        for i in range(num_questions):
            quiz_data.append({
                "question": f"Key concept {i+1} in {topic}: What is its primary focus?",
                "options": ["Theoretical Analysis", "Practical Application", "Historical Context", "Systemic Integration"],
                "answer": "Practical Application"
            })
    
    try:
        new_entry = History(type='quiz', topic=topic, content=json.dumps(quiz_data))
        db.session.add(new_entry)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Quiz storage error: {e}")
    
    return jsonify({'quiz': quiz_data})

@app.route('/api/recommend', methods=['POST'])
def recommend():
    data = request.json
    interests = data.get('interests')
    level = data.get('level', 'Beginner')
    goal = data.get('goal')
    time = data.get('time')
    
    prompt = f"""
    Act as a career advisor AI.

    User Interests: {interests}
    Skill Level: {level}
    Goal: {goal}
    Time Availability: {time}

    Generate:

    1. Best Career Path
    2. Step-by-step Roadmap
    3. Required Skills
    4. Recommended Courses
    5. Career Opportunities
    6. Project Ideas

    Make it structured, professional, and easy to understand using refined Markdown.
    """
    
    system_instruction = "You are the CourseMate Pathfinding AI. Synthesize a professional career roadmap based on user telemetry."
    
    roadmap = ai_engine.get_ai_response(prompt, context=system_instruction)
    
    try:
        new_entry = History(type='recommendation', topic=goal, content=roadmap)
        db.session.add(new_entry)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Roadmap storage error: {e}")
        
    return jsonify({'roadmap': roadmap})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug, use_reloader=False)
