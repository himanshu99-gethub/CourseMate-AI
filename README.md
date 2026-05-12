# CourseMate AI

A Flask-based AI-powered educational assistant that helps students learn better through interactive chat, note-taking, quiz generation, and personalized recommendations.

## Features

- **AI Chat**: Interact with an AI-powered chatbot for instant answers and learning support
- **Dashboard**: View your learning activity and history at a glance
- **Notes**: Create, organize, and manage your study notes
- **Quiz Generator**: Automatically generate quizzes from your course materials
- **Recommendations**: Get personalized learning recommendations based on your activity
- **History Tracking**: Keep track of all your learning activities

## Project Structure

```
CourseMate AI/
├── app.py                 # Main Flask application
├── utils.py              # Utility functions and AI engine
├── Procfile              # Deployment configuration
├── static/               # Static assets
│   ├── css/
│   │   └── style.css     # Application styles
│   └── js/
│       └── main.js       # Client-side JavaScript
├── templates/            # HTML templates
│   ├── base.html         # Base template
│   ├── chat.html         # Chat interface
│   ├── dashboard.html    # Dashboard view
│   ├── notes.html        # Notes interface
│   ├── quiz.html         # Quiz interface
│   └── recommendations.html  # Recommendations view
└── instance/             # Instance-specific files
```

## Requirements

- Python 3.7+
- Flask
- Flask-SQLAlchemy
- SQLite (included with Python)

## Installation

1. **Clone or download the project**
   ```bash
   cd "CourseMate AI"
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```
   
   Or manually install:
   ```bash
   pip install flask flask-sqlalchemy
   ```

3. **Initialize the database**
   ```bash
   python scratch/init_db.py
   ```

## Running the Application

1. **Start the Flask development server**
   ```bash
   python app.py
   ```

2. **Access the application**
   Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

3. **Stop the server**
   Press `Ctrl+C` in the terminal

## Deployment

The project includes a `Procfile` for easy deployment to platforms like Heroku:
```bash
heroku create your-app-name
git push heroku main
```

## Database

- **Type**: SQLite
- **Location**: `instance/database.db`
- **Models**: 
  - `History`: Stores user activities (chat, notes, quiz, recommendations)

## API Endpoints

- `GET /` - Redirects to dashboard
- `GET /dashboard` - Main dashboard
- `GET /chat` - Chat interface
- `GET /notes` - Notes interface
- `GET /quiz` - Quiz interface
- `GET /recommendations` - Recommendations interface

## Usage

1. **Dashboard**: Start here to see your learning activity overview
2. **Chat**: Ask the AI assistant questions about any topic
3. **Notes**: Create and manage your study notes
4. **Quiz**: Generate quizzes to test your knowledge
5. **Recommendations**: Get personalized learning suggestions

## Configuration

Edit `app.py` to modify:
- `SECRET_KEY`: Change the Flask secret key for production
- `SQLALCHEMY_DATABASE_URI`: Modify the database location
- Port and host settings

## Development

### Helper Scripts
- `scratch/init_db.py` - Initialize the database
- `scratch/check_db.py` - Check database contents

### Utilities
- `utils.py` - Contains the AI engine and helper functions

## License

This project is for educational purposes.

## Support

For issues or questions, please refer to the main application files or the project documentation.

---

**Last Updated**: May 2026
