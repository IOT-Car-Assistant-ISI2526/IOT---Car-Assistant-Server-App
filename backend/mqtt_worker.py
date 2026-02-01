import paho.mqtt.client as mqtt
from app import db
from app.models.device import Device
from app.models.measurement import Measurement

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"📡 MQTT: Połączono z brokerem (Kod: {rc})")
        client.subscribe("user/+/sensor/#")
    else:
        print(f"❌ MQTT: Błąd połączenia, kod: {rc}")

def on_message(client, userdata, msg):
    """
    userdata: To jest nasza instancja aplikacji Flask (app), 
    którą przekazaliśmy w start_worker.
    """
    app = userdata  # Odbieramy obiekt app
    
    try:
        topic = msg.topic
        payload = msg.payload.decode('utf-8')
        
        parts = topic.split('/')
        if len(parts) < 4: return
        
        mac_address = parts[1]
        sensor_type = parts[3]
        
        if payload == "hello": return

        print(f"📨 MQTT Data: {mac_address} [{sensor_type}] -> {payload}")

        with app.app_context():
            # 1. Urządzenie
            device = Device.query.filter_by(mac_address=mac_address).first()
            if not device:
                print(f"MQTT: Nieznane urządzenie: {mac_address}")
                return
            
            # 2. Aktualizacja czasu
            device.last_seen = db.func.now()
            
            # 3. Pomiary
            if ";" in payload:
                try:
                    ts_str, val_str = payload.split(';', 1)

                    current_owner_id = device.user_id 
                    
                    meas = Measurement(
                        device_id=device.id,
                        user_id=current_owner_id,
                        sensor_type=sensor_type,
                        timestamp=int(ts_str),
                        value=float(val_str)
                    )
                    db.session.add(meas)
                    db.session.commit()
                except ValueError:
                    print(f"❌ MQTT: Błąd formatu: {payload}")

    except Exception as e:
        print(f"❌ MQTT Error: {e}")

def start_worker(app):
    """
    Funkcja startująca klienta MQTT.
    Przyjmuje instancję 'app' z run.py.
    """
    broker = app.config['MQTT_BROKER_HOST']
    port = app.config['MQTT_BROKER_PORT']
    
    client = mqtt.Client()
    
    # Przekazujemy 'app' do klienta, aby był dostępny w on_message
    client.user_data_set(app) 
    
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        print(f"🚀 Uruchamianie MQTT Worker ({broker}:{port})...")
        client.connect(broker, port, 60)
        # Uruchamiamy pętlę w nieskończoność (blokuje wątek, w którym jest uruchomiona)
        client.loop_forever()
    except Exception as e:
        print(f"❌ Nie można połączyć z MQTT: {e}")