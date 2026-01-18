from app import db
from app.models.device import Device
from app.utils.mqtt_helper import publish_config_update
from app.models.measurement import Measurement

def get_user_devices(user_id):
    devices = Device.query.filter_by(user_id=user_id).all()
    return [{
        "mac_address": d.mac_address,
        "last_seen": d.last_seen,
        "config_interval": d.config_interval,
        "config_threshold": d.config_threshold
    } for d in devices]

def claim_device_logic(user_id, mac_address):
    device = Device.query.filter_by(mac_address=mac_address).first()
    
    if not device:
        return {"error": "Urządzenie nieznane. Podłącz je najpierw do zasilania i połącz z internetem."}
    
    if device.user_id is not None:
        if str(device.user_id) == str(user_id):
            return {"message": "To urządzenie jest już przypisane do Ciebie.", "mac_address": mac_address}
        
        return {"error": "⛔ BŁĄD: To urządzenie jest już przypisane do innego użytkownika!"}

    device.user_id = user_id
    
    device.ownership_start_date = db.func.now() 
    
    db.session.commit()
    return {"message": "✅ Sukces! Urządzenie przypisane do Twojego konta.", "mac_address": mac_address}

def update_config_logic(user_id, mac_address, interval, threshold):
    device = Device.query.filter_by(mac_address=mac_address).first()
    
    if not device:
        return {"error": "Urządzenie nie znalezione"}, 404
        
    # Autoryzacja: czy to moje urządzenie?
    if str(device.user_id) != str(user_id):
        return {"error": "Brak uprawnień do tego urządzenia"}, 403
        
    # Aktualizacja w bazie
    if interval is not None: device.config_interval = interval
    if threshold is not None: device.config_threshold = threshold
    db.session.commit()
    
    # Wysłanie do ESP32
    publish_config_update(mac_address, device.config_interval, device.config_threshold)
    
    return {"message": "Konfiguracja zaktualizowana i wysłana"}

def get_device_measurements(device_id, requesting_user_id, limit=100):
    """
    Pobiera pomiary dla urządzenia, ALE tylko te, które należą do pytającego użytkownika.
    """
    measurements = Measurement.query.filter_by(
        device_id=device_id, 
        user_id=requesting_user_id  # <--- ŚCISŁY FILTR
    ).order_by(Measurement.timestamp.desc()).limit(limit).all()
    
    return [{
        "timestamp": m.timestamp,
        "value": m.value,
        "sensor_type": m.sensor_type,
        "received_at": m.received_at
    } for m in measurements]
    
def unbind_device_logic(user_id, mac_address):
    # 1. Znajdź urządzenie
    device = Device.query.filter_by(mac_address=mac_address).first()
    
    if not device:
        return {"error": "Urządzenie nie znalezione"}, 404
        
    # 2. ZABEZPIECZENIE: Czy ten użytkownik jest właścicielem?
    # Konwertujemy na stringi, żeby uniknąć problemów typów (int vs str)
    if str(device.user_id) != str(user_id):
        return {"error": "Nie masz uprawnień do usunięcia tego urządzenia!"}, 403
        
    # 3. ZWOLNIENIE URZĄDZENIA
    device.user_id = None
    # Opcjonalnie: wyczyść nazwę, żeby nowy użytkownik ustawił swoją
    device.friendly_name = None 
    
    db.session.commit()
    
    return {"message": "Urządzenie zostało odłączone. Teraz inny użytkownik może je dodać."}, 200