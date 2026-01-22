from app import db
from datetime import datetime

class Device(db.Model):
    __tablename__ = 'devices'

    id = db.Column(db.Integer, primary_key=True)
    mac_address = db.Column(db.String(17), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    friendly_name = db.Column(db.String(50), nullable=True)
    
    # Konfiguracja zdalna
    config_interval = db.Column(db.Integer, default=5000)
    config_threshold = db.Column(db.Float, default=25.0)
    
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)

    # Relacje (kaskadowe usuwanie pomiarów przy usunięciu urządzenia)
    measurements = db.relationship('Measurement', backref='device', lazy='dynamic', cascade="all, delete")