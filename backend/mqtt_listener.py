import paho.mqtt.client as mqtt
import logging
import re
from database import Database
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MQTTListener:
    def __init__(self, broker_host: str = "localhost", broker_port: int = 1883, 
                 db: Optional[Database] = None):
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.db = db or Database()
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect
        self.client.on_subscribe = self.on_subscribe
        self.client.on_log = self.on_log
        
        # Pattern dla topiców: user/mac_address/sensor/sensor_type
        self.topic_pattern = re.compile(r'^([^/]+)/([a-fA-F0-9]{12})/sensor/(.+)$')
        self.connected = False
    
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.connected = True
            logger.info("Successfully connected to MQTT broker!")
            logger.info(f"   Broker: {self.broker_host}:{self.broker_port}")
            logger.info(f"   Connection flags: {flags}")

            topics = [
                ("+/+/sensor/+", 0),
                ("+/+/alerts", 0)
            ]
            
            result, mid = client.subscribe(topics)
            logger.info(f"Subscribed to topics:")
            logger.info(f"   - +/+/sensor/+ (sensor measurements)")
            logger.info(f"   - +/+/alerts (alerts)")
            logger.info(f"   Result code: {result}, Message ID: {mid}")
        else:
            self.connected = False
            error_messages = {
                1: "Connection refused - incorrect protocol version",
                2: "Connection refused - invalid client identifier",
                3: "Connection refused - server unavailable",
                4: "Connection refused - bad username or password",
                5: "Connection refused - not authorised"
            }
            error_msg = error_messages.get(rc, f"Unknown error code: {rc}")
            logger.error(f"Failed to connect to MQTT broker!")
            logger.error(f"   Return code: {rc} - {error_msg}")
            logger.error(f"   Broker: {self.broker_host}:{self.broker_port}")
    
    def on_disconnect(self, client, userdata, rc):
        self.connected = False
        if rc != 0:
            logger.warning("Unexpected MQTT disconnection (code: {})".format(rc))
        else:
            logger.info("Disconnected from MQTT broker")
    
    def on_subscribe(self, client, userdata, mid, granted_qos):
        logger.info(f"Subscription confirmed! Message ID: {mid}, QoS: {granted_qos}")
    
    def on_log(self, client, userdata, level, buf):
        # Możesz włączyć to dla bardziej szczegółowych logów
        # logger.debug(f"MQTT Log: {buf}")
        pass
    
    def on_message(self, client, userdata, msg):
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8')
            
            logger.info(f"Received message on topic: {topic}, payload: {payload}")

            match = self.topic_pattern.match(topic)
            if not match:
                logger.warning(f"Topic doesn't match expected pattern: {topic}")
                return
            
            username = match.group(1)
            mac_address = match.group(2)
            sensor_type = match.group(3).lower()

            if payload == "hello":
                logger.info(f"Received hello from {username}/{mac_address}/{sensor_type}")
                user_id = self.db.get_or_create_user(username)
                self.db.get_or_create_device(user_id, mac_address)
                return

            parts = payload.split(';')
            if len(parts) != 2:
                logger.warning(f"Invalid payload format: {payload}")
                return
            
            timestamp_str, value = parts
            
            try:
                timestamp = int(timestamp_str)
            except ValueError:
                logger.warning(f"Invalid timestamp: {timestamp_str}")
                return

            user_id = self.db.get_or_create_user(username)
            device_id = self.db.get_or_create_device(user_id, mac_address)

            valid_sensor_types = ['adxl', 'max_normal', 'max_profile']
            if sensor_type not in valid_sensor_types:
                logger.warning(f"Unknown sensor type: {sensor_type}")
                return
            
            self.db.insert_measurement(device_id, sensor_type, timestamp, value)
            logger.info(f"Saved measurement: {username}/{mac_address}/{sensor_type} = {value} @ {timestamp}")
            
        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
    
    def start(self):
        try:
            logger.info("=" * 60)
            logger.info(f"Connecting to MQTT broker...")
            logger.info(f"   Host: {self.broker_host}")
            logger.info(f"   Port: {self.broker_port}")
            logger.info("=" * 60)

            self.client.connect(self.broker_host, self.broker_port, keepalive=60)

            self.client.loop_start()

            import time
            time.sleep(1)
            
            if self.connected:
                logger.info("MQTT listener started successfully!")
            else:
                logger.warning("MQTT listener started, but connection status is unknown")
                
        except Exception as e:
            logger.error(f"Failed to start MQTT listener: {e}", exc_info=True)
            raise
    
    def stop(self):
        self.client.loop_stop()
        self.client.disconnect()
        logger.info("MQTT listener stopped")

