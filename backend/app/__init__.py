from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    CORS(app)

    with app.app_context():
        from app.models import user, device, measurement
        db.create_all()

    from app.routes.auth_routes import auth_bp
    from app.routes.device_routes import device_bp
    from app.routes.stats_routes import stats_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(device_bp)
    app.register_blueprint(stats_bp)

    return app