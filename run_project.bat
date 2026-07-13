@echo off
echo Starting CourseMate AI...

echo Starting Flask Backend...
start "CourseMate AI Backend" cmd /k "venv\Scripts\python.exe app.py"

echo Starting Next.js Frontend...
start "CourseMate AI Frontend" cmd /k "cd frontend && npm run dev"

echo Both servers started!
pause
