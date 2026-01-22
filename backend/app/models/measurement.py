from app import db
from datetime import datetime

class Measurement(db.Model):
    __tablename__ = 'measurements'

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.Integer, db.ForeignKey('devices.id'), nullable=False)
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    sensor_type = db.Column(db.String(50), nullable=False)
    value = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.Integer, nullable=False)
    received_at = db.Column(db.DateTime, default=datetime.utcnow)