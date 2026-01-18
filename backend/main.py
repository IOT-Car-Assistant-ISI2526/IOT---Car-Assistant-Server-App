import logging
import signal
import sys
import time
from threading import Thread
from flask import Flask
from app import app, db, get_mqtt_client
from mqtt_listener import MQTTListener

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

MQTT_BROKER_HOST = "10.219.44.41"
MQTT_BROKER_PORT = 1883

mqtt_listener = None
flask_thread = None


def signal_handler(sig, frame):
    logger.info("Shutting down...")
    if mqtt_listener:
        mqtt_listener.stop()
    try:
        client = get_mqtt_client()
        client.loop_stop()
        client.disconnect()
    except:
        pass
    sys.exit(0)


def run_flask():
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)


if __name__ == '__main__':
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger.info("Initializing IOT Server...")

    logger.info("Initializing database...")
    db.init_database()
    logger.info("Database initialized")

    logger.info(f"Starting MQTT listener (broker: {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT})...")
    mqtt_listener = MQTTListener(MQTT_BROKER_HOST, MQTT_BROKER_PORT, db)
    mqtt_listener.start()

    import time
    time.sleep(2)
    
    if mqtt_listener.connected:
        logger.info("MQTT listener is ready and listening!")
    else:
        logger.warning("MQTT listener may not be connected - check broker availability")

    logger.info("Starting Flask API server...")
    flask_thread = Thread(target=run_flask, daemon=True)
    flask_thread.start()

    logger.info("IOT Server started successfully!")
    logger.info("API available at: http://localhost:5000")
    logger.info("MQTT listener active on broker: {}:{}".format(MQTT_BROKER_HOST, MQTT_BROKER_PORT))

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(None, None)
