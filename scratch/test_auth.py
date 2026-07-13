import sys
import os

# Add root folder to path so we can import app and db
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db, User, History

print("Starting backend authentication checks...")

# Use application context to test database queries
with app.app_context():
    # Clean up test user if exists
    test_email = "test.student@coursemate.ai"
    existing = User.query.filter_by(email=test_email).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        print("Removed existing test user")

    # Test client
    client = app.test_client()

    # 1. Verify that accessing history without token returns 401
    res = client.get('/api/history')
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("SUCCESS: Endpoint /api/history is protected (401 Unauthorized)")

    # 2. Register a new user
    reg_payload = {
        "name": "Test Student",
        "email": test_email,
        "password": "securepassword123"
    }
    res = client.post('/api/auth/register', json=reg_payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert data["status"] == "success"
    token = data["token"]
    user_id = data["user"]["id"]
    print(f"SUCCESS: Registered new user with ID {user_id} and Token {token}")

    # 3. Try to register same email again (should fail)
    res = client.post('/api/auth/register', json=reg_payload)
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    print("SUCCESS: Registry duplication blocked correctly")

    # 4. Login with registered user
    login_payload = {
        "email": test_email,
        "password": "securepassword123"
    }
    res = client.post('/api/auth/login', json=login_payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert data["status"] == "success"
    assert data["token"] == token
    print("SUCCESS: Logged in successfully with Email/Password")

    # 5. Login with invalid password (should fail)
    bad_login = {
        "email": test_email,
        "password": "wrongpassword"
    }
    res = client.post('/api/auth/login', json=bad_login)
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    print("SUCCESS: Invalid login credentials rejected")

    # 6. Test Demo Google Sign-In
    google_payload = {
        "is_demo": True
    }
    res = client.post('/api/auth/google', json=google_payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert data["status"] == "success"
    assert data["user"]["email"] == "demo.student@coursemate.ai"
    print("SUCCESS: Demo Google Sign-In processed correctly")

    # 7. Access history with Bearer token
    headers = {
        "Authorization": f"Bearer {token}"
    }
    res = client.get('/api/history', headers=headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert "history" in data
    print("SUCCESS: Accessed history endpoint successfully with Bearer Token")

    print("\nAll backend authentication tests passed successfully! 🚀")
