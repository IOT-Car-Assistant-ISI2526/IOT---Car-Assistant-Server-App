import paho.mqtt.client as mqtt
import json
from flask import current_app

def publish_config_update(mac_address, interval, threshold):
    """Wysyła konfigurację do urządzenia przez MQTT (nieblokująco)"""
    broker = current_app.config['MQTT_BROKER_HOST']
    port = current_app.config['MQTT_BROKER_PORT']
    
    topic = f"user/{mac_address}/config"
    payload = json.dumps({
        "interval": interval,
        "threshold": threshold
    })
    
    try:
        # Tworzymy jednorazowego klienta do wysłania wiadomości
        client = mqtt.Client()
        client.connect(broker, port, 60)
        client.publish(topic, payload, qos=1)
        client.disconnect()
        return True
    except Exception as e:
        print(f"Błąd wysyłania MQTT config: {e}")
        return False