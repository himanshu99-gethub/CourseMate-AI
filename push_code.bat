@echo off
echo Building Next.js Frontend...
cd frontend
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Frontend build failed!
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo Adding files to Git...
git add .

echo Committing files...
git commit -m "Configure real Google Sign-In and remove demo login"

echo Pushing to GitHub (will trigger Render build)...
git push

echo Done! Render will automatically deploy the updated application.
pause
