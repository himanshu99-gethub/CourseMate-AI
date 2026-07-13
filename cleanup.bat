@echo off
echo Cleaning up Vercel-specific and temporary files...

if exist vercel.json (
    del /f /q vercel.json
    echo Deleted vercel.json
)
if exist .python-version (
    del /f /q .python-version
    echo Deleted .python-version
)
if exist scratch\test_tfidf.py (
    del /f /q scratch\test_tfidf.py
    echo Deleted test_tfidf.py
)

echo Cleanup complete!
echo This script will now delete itself...
del "%~f0"
