"""
Prosty skrypt do testowania połączenia z brokerem MQTT
"""
import paho.mqtt.client as mqtt
import time
import sys

BROKER_HOST = "10.219.44.41"
BROKER_PORT = 1883

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"✅ Połączono z brokerem {BROKER_HOST}:{BROKER_PORT}")
        
        # Subskrybuj testowy temat
        topics = [
            ("+/+/sensor/+", 0),
            ("+/+/alerts", 0)
        ]
        result, mid = client.subscribe(topics)
        print(f"📡 Subskrybowano tematy: {topics}")
        print(f"   Result: {result}, Message ID: {mid}")
        
        # Opublikuj testową wiadomość
        test_topic = "test/connection/check"
        client.publish(test_topic, "Test message", qos=0)
        print(f"📤 Opublikowano testową wiadomość na: {test_topic}")
    else:
        print(f"❌ Błąd połączenia! Kod: {rc}")
        sys.exit(1)

def on_message(client, userdata, msg):
    print(f"📨 Otrzymano wiadomość:")
    print(f"   Topic: {msg.topic}")
    print(f"   Payload: {msg.payload.decode('utf-8')}")

def on_subscribe(client, userdata, mid, granted_qos):
    print(f"✅ Potwierdzono subskrypcję! MID: {mid}, QoS: {granted_qos}")

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"⚠️ Nieoczekiwane rozłączenie (kod: {rc})")
    else:
        print("🔌 Rozłączono z brokerem")

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 Test połączenia MQTT")
    print(f"   Broker: {BROKER_HOST}:{BROKER_PORT}")
    print("=" * 60)
    
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_subscribe = on_subscribe
    client.on_disconnect = on_disconnect
    
    try:
        print(f"\n🔌 Łączenie z brokerem...")
        client.connect(BROKER_HOST, BROKER_PORT, 60)
        client.loop_start()
        
        print("\n⏳ Czekanie 5 sekund na wiadomości...")
        time.sleep(5)
        
        print("\n✅ Test zakończony. Naciśnij Ctrl+C aby wyjść.")
        print("💡 W MQTTX opublikuj wiadomość na temacie:")
        print("   - user/aabbccddeeff/sensor/adxl")
        print("   - user/aabbccddeeff/sensor/max_normal")
        print("   - user/aabbccddeeff/sensor/max_profile")
        
        # Czekaj w pętli
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n\n👋 Zamykanie...")
        client.loop_stop()
        client.disconnect()
    except Exception as e:
        print(f"\n❌ Błąd: {e}")
        sys.exit(1)

