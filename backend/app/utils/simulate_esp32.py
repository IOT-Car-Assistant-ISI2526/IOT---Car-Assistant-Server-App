import paho.mqtt.client as mqtt
import time
import random
import threading
import sys

# --- KONFIGURACJA ---
BROKER_HOST = "localhost"  # Upewnij się, że to adres Twojego Mosquitto
BROKER_PORT = 1883

# !!! POPRAWKA TUTAJ !!!
# Musi być "user", bo backend nasłuchuje na "user/+/sensor/#"
USERNAME = "user"          

# Lista symulowanych urządzeń (MAC adresy)
DEVICES = [
    "AA1122334455",
    "BB1122334455",
    "CC1122334455"
]

class SimulatedESP32(threading.Thread):
    def __init__(self, mac_address, username):
        super().__init__()
        self.mac = mac_address
        self.username = username
        self.running = True
        self.client = mqtt.Client(client_id=f"sim_{mac_address}")
        self.client.on_connect = self.on_connect
        
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"[{self.mac}] ✅ Połączono z brokerem")
            self.send_hello()
        else:
            print(f"[{self.mac}] ❌ Błąd połączenia: {rc}")

    def send_hello(self):
        # Topic: user/{mac}/sensor/status
        topic = f"{self.username}/{self.mac}/sensor/status"
        self.client.publish(topic, "hello")
        print(f"[{self.mac}] 👋 Wysłano HELLO (Rejestracja)")
        # Mała pauza, żeby backend zdążył zapisać urządzenie w bazie przed wysłaniem pomiarów
        time.sleep(1) 

    def run(self):
        try:
            print(f"[{self.mac}] ⏳ Łączenie...")
            self.client.connect(BROKER_HOST, BROKER_PORT, 60)
            self.client.loop_start()
            
            # Czekamy chwilę na nawiązanie połączenia, żeby on_connect zdążył zadziałać
            time.sleep(1) 
            
            while self.running:
                # 1. Symulacja ADXL
                val_adxl = random.uniform(0.0, 5.0)
                self.publish_measurement("ADXL345", val_adxl)
                
                # 2. Symulacja MAX_NORMAL
                val_normal = random.uniform(20.0, 30.0)
                self.publish_measurement("MAX6675_NORMAL", val_normal)
                
                # 3. Symulacja MAX_PROFILE
                val_profile = random.uniform(100.0, 200.0)
                self.publish_measurement("MAX6675_PROFILE", val_profile)

                time.sleep(random.uniform(2, 3))
                
        except Exception as e:
            print(f"[{self.mac}] ❌ Błąd wątku: {e}")
        finally:
            self.client.loop_stop()
            self.client.disconnect()

    def publish_measurement(self, sensor_type, value):
        topic = f"{self.username}/{self.mac}/sensor/{sensor_type}"
        timestamp = int(time.time())
        # Backend oczekuje formatu: timestamp;wartość
        payload = f"{timestamp};{value:.2f}"
        
        self.client.publish(topic, payload)
        print(f"[{self.mac}] 📤 {sensor_type.upper()}: {payload}")

    def stop(self):
        self.running = False

if __name__ == "__main__":
    print("🚀 Start symulatora urządzeń ESP32")
    print(f"📡 Broker: {BROKER_HOST}:{BROKER_PORT}")
    print(f"topic root: {USERNAME}/...")
    print("-" * 40)

    threads = []
    
    for mac in DEVICES:
        device = SimulatedESP32(mac, USERNAME)
        device.start()
        threads.append(device)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Zatrzymywanie...")
        for device in threads:
            device.stop()
        for device in threads:
            device.join()
        print("✅ Zakończono.")