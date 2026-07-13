import os
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
import hashlib
import base64
from utils import ai_engine

base_dir = os.path.dirname(os.path.abspath(__file__))
static_folder = os.path.join(base_dir, 'frontend/out')

app = Flask(__name__, static_folder=static_folder, static_url_path='')
app.config['SECRET_KEY'] = 'coursemate_ai_secret_key_123'

is_vercel = os.getenv('VERCEL') == '1' or os.getenv('AWS_LAMBDA_FUNCTION_NAME') is not None
if is_vercel:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////tmp/database.db'
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# User-specific in-memory cache for RAG: {user_id: {"current_text": "...", "topic": "..."}}
document_store = {}

# --- Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(100), nullable=True) # None for Google users
    google_id = db.Column(db.String(100), unique=True, nullable=True)

class History(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # nullable for backwards compatibility
    type = db.Column(db.String(20), nullable=False) # 'chat', 'notes', 'quiz', 'recommendation'
    topic = db.Column(db.String(200))
    content = db.Column(db.Text, nullable=False) # JSON format for structured data
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# Ensure database tables are created and migrate schema
with app.app_context():
    db.create_all()
    # Safely alter table to add user_id for existing databases
    try:
        conn = db.engine.connect()
        conn.execute(db.text("ALTER TABLE history ADD COLUMN user_id INTEGER REFERENCES user(id)"))
        conn.commit()
        print("Migration: Added user_id to History table")
    except Exception as e:
        print("Migration: History table already migrated or SQLite version doesn't support it")

# --- Global Error Handlers (always return JSON, never HTML) ---
@app.errorhandler(404)
def not_found(e):
    return jsonify({'status': 'error', 'message': 'Endpoint not found'}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'status': 'error', 'message': 'Method not allowed'}), 405

@app.errorhandler(500)
def internal_error(e):
    db.session.rollback()
    return jsonify({'status': 'error', 'message': f'Internal server error: {str(e)}'}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    db.session.rollback()
    import traceback
    print(f"Unhandled exception: {traceback.format_exc()}")
    return jsonify({'status': 'error', 'message': str(e)}), 500

def get_current_user():
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            user_id = int(token)
            return User.query.get(user_id)
        except:
            return None
    return None

# --- Serve Static Next.js Frontend ---

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')
# --- Auth Endpoints ---

@app.route('/api/auth/config', methods=['GET'])
def auth_config():
    return jsonify({
        'google_client_id': os.getenv('GOOGLE_CLIENT_ID', '')
    })

@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    
    if not name or not email or not password:
        return jsonify({'status': 'error', 'message': 'Missing fields'}), 400
        
    email = email.strip().lower()
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'status': 'error', 'message': 'User with this email already exists'}), 400
        
    # Standard SHA-256 password hash (lightweight & dependency-free)
    password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
    
    try:
        new_user = User(name=name, email=email, password_hash=password_hash)
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'token': str(new_user.id),
            'user': {
                'id': new_user.id,
                'name': new_user.name,
                'email': new_user.email
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'status': 'error', 'message': 'Missing email or password'}), 400
        
    email = email.strip().lower()
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'status': 'error', 'message': 'Invalid email or password'}), 400
        
    password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
    if user.password_hash != password_hash:
        return jsonify({'status': 'error', 'message': 'Invalid email or password'}), 400
        
    return jsonify({
        'status': 'success',
        'token': str(user.id),
        'user': {
            'id': user.id,
            'name': user.name,
            'email': user.email
        }
    })

@app.route('/api/auth/google', methods=['POST'])
def auth_google():
    data = request.json
    credential = data.get('credential')
    is_demo = data.get('is_demo', False)
    
    if is_demo:
        demo_email = "demo.student@coursemate.ai"
        user = User.query.filter_by(email=demo_email).first()
        if not user:
            try:
                user = User(name="Demo Student", email=demo_email, google_id="demo-google-id-123")
                db.session.add(user)
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                return jsonify({'status': 'error', 'message': str(e)}), 500
        return jsonify({
            'status': 'success',
            'token': str(user.id),
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email
            }
        })
        
    if not credential:
        return jsonify({'status': 'error', 'message': 'Missing Google credential'}), 400
        
    try:
        parts = credential.split('.')
        if len(parts) != 3:
            return jsonify({'status': 'error', 'message': 'Malformed credential'}), 400
            
        payload = parts[1]
        payload += '=' * (-len(payload) % 4)
        decoded_bytes = base64.urlsafe_b64decode(payload)
        payload_data = json.loads(decoded_bytes.decode('utf-8'))
        
        google_id = payload_data.get('sub')
        email = payload_data.get('email', '').strip().lower()
        name = payload_data.get('name', 'Google User')
        
        if not google_id or not email:
            return jsonify({'status': 'error', 'message': 'Failed to resolve user info from Google'}), 400
            
        user = User.query.filter((User.google_id == google_id) | (User.email == email)).first()
        
        if not user:
            user = User(name=name, email=email, google_id=google_id)
            db.session.add(user)
            db.session.commit()
        elif not user.google_id:
            user.google_id = google_id
            db.session.commit()
            
        return jsonify({
            'status': 'success',
            'token': str(user.id),
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email
            }
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Google authentication failed: {str(e)}'}), 400

# --- API Endpoints ---

@app.route('/api/history', methods=['GET', 'DELETE'])
def api_history():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401

    if request.method == 'DELETE':
        try:
            # Delete only current user's history
            History.query.filter_by(user_id=current_user.id).delete()
            db.session.commit()
            # Reset user-specific document cache
            if current_user.id in document_store:
                del document_store[current_user.id]
            return jsonify({'status': 'success', 'message': 'All chat history cleared'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'status': 'error', 'message': str(e)}), 500

    # Retrieve only current user's history
    history_items = History.query.filter_by(user_id=current_user.id).order_by(History.timestamp.desc()).all()
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
    current_user = get_current_user()
    if not current_user:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401

    try:
        # Get item and ensure it belongs to the current user
        item = History.query.filter_by(id=item_id, user_id=current_user.id).first()
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
    current_user = get_current_user()
    if not current_user:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401

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
        new_entry = History(user_id=current_user.id, type=mode, content=json.dumps({'query': message, 'response': response_text}))
        db.session.add(new_entry)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Database sync error: {e}")
    
    return jsonify({'response': response_text})


@app.route('/api/generate-notes', methods=['POST'])
def generate_notes():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401

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

        new_entry = History(user_id=current_user.id, type='notes', topic=display_topic, content=notes_content)
        db.session.add(new_entry)
        db.session.commit()
        
        # Cache for RAG operations (user isolated)
        document_store[current_user.id] = {
            "current_text": extracted_text if extracted_text else notes_content,
            "topic": display_topic
        }
        
    except Exception as e:
        print(f"Notes generation error: {e}")
        db.session.rollback()
        notes_content = f"# Sync Error\n\nUnable to reach the neural manuscript engine for '{display_topic}'. Please check your subject matter and try again."
    
    return jsonify({'notes': notes_content})


@app.route('/api/document-status', methods=['GET'])
def document_status():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401

    user_doc = document_store.get(current_user.id, {"current_text": "", "topic": ""})
    return jsonify({
        'has_document': bool(user_doc["current_text"]),
        'topic': user_doc.get("topic", "")
    })


@app.route('/api/rag-chat', methods=['POST'])
def rag_chat():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401

    data = request.json
    query = data.get('query')
    
    user_doc = document_store.get(current_user.id, {"current_text": "", "topic": ""})
    if not user_doc["current_text"]:
        return jsonify({'response': "No document context found. Please generate or upload notes first."})
        
    response = ai_engine.perform_rag(query, user_doc["current_text"])
    return jsonify({'response': response})


@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401

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
        new_entry = History(user_id=current_user.id, type='quiz', topic=topic, content=json.dumps(quiz_data))
        db.session.add(new_entry)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Quiz storage error: {e}")
    
    return jsonify({'quiz': quiz_data})


@app.route('/api/recommend', methods=['POST'])
def recommend():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 401

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
        new_entry = History(user_id=current_user.id, type='recommendation', topic=goal, content=roadmap)
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
