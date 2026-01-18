from flask import Flask, jsonify, request
from flask_cors import CORS
import paho.mqtt.client as mqtt
import logging
from database import Database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

db = Database()

MQTT_BROKER_HOST = "10.219.44.41"
MQTT_BROKER_PORT = 1883

mqtt_client = None


def get_mqtt_client():

    global mqtt_client
    if mqtt_client is None:
        mqtt_client = mqtt.Client()
        try:
            mqtt_client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, 60)
            mqtt_client.loop_start()
        except Exception as e:
            logger.error(f"Failed to connect MQTT client: {e}")
            raise
    return mqtt_client


@app.route('/api/devices', methods=['GET'])
def get_devices():

    try:
        devices = db.get_devices()
        return jsonify({"success": True, "devices": devices})
    except Exception as e:
        logger.error(f"Error getting devices: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/devices/<int:device_id>/measurements', methods=['GET'])
def get_measurements(device_id: int):

    sensor_type = request.args.get('sensor_type', 'adxl')
    limit = int(request.args.get('limit', 100))

    try:
        measurements = db.get_measurements(device_id, sensor_type, limit)
        return jsonify({
            "success": True,
            "device_id": device_id,
            "sensor_type": sensor_type,
            "measurements": measurements
        })
    except Exception as e:
        logger.error(f"Error getting measurements: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/devices/<int:device_id>/alert', methods=['POST'])
def send_alert(device_id: int):

    try:
        data = request.get_json()
        mac_address = data.get('mac_address')
        message = data.get('message', 'BUZZ')

        if not mac_address:
            return jsonify({"success": False, "error": "mac_address is required"}), 400

        topic = f"user/{mac_address}/alerts"

        client = get_mqtt_client()
        result = client.publish(topic, message, qos=0)

        if result.rc == mqtt.MQTT_ERR_SUCCESS:

            db.insert_alert(device_id, message)
            logger.info(f"Sent alert to {topic}: {message}")
            return jsonify({
                "success": True,
                "topic": topic,
                "message": message
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Failed to publish message: {result.rc}"
            }), 500

    except Exception as e:
        logger.error(f"Error sending alert: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/devices/send-alert', methods=['POST'])
def send_alert_by_mac():

    try:
        data = request.get_json()
        mac_address = data.get('mac_address')
        message = data.get('message', 'BUZZ')

        if not mac_address:
            return jsonify({"success": False, "error": "mac_address is required"}), 400

        topic = f"user/{mac_address}/alerts"

        client = get_mqtt_client()
        result = client.publish(topic, message, qos=0)

        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            logger.info(f"Sent alert to {topic}: {message}")
            return jsonify({
                "success": True,
                "topic": topic,
                "message": message
            })
        else:
            return jsonify({
                "success": False,
                "error": f"Failed to publish message: {result.rc}"
            }), 500

    except Exception as e:
        logger.error(f"Error sending alert: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():

    return jsonify({"status": "ok"})


if __name__ == '__main__':
    logger.info("Starting Flask API server...")
    app.run(host='0.0.0.0', port=5000, debug=True)
