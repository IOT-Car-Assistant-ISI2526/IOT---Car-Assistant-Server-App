from app import db
from app.models.user import User
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token

def register_logic(username, password):
    if User.query.filter_by(username=username).first():
        return {"error": "Użytkownik już istnieje"}, 409
    
    hashed = generate_password_hash(password)
    new_user = User(username=username, password_hash=hashed)
    db.session.add(new_user)
    db.session.commit()
    
    return {"message": "Zarejestrowano pomyślnie"}, 201

def login_logic(username, password):
    user = User.query.filter_by(username=username).first()
    
    if user and check_password_hash(user.password_hash, password):
        # Identity w tokenie to ID użytkownika (jako string)
        token = create_access_token(identity=str(user.id))
        return {"access_token": token, "user_id": user.id, "username": user.username}, 200
        
    return {"error": "Błędne dane logowania"}, 401