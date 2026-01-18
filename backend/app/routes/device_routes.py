from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.controllers.device_controller import get_user_devices, claim_device_logic, update_config_logic, unbind_device_logic
from app.controllers.device_controller import get_device_measurements
from app.models.device import Device

device_bp = Blueprint('devices', __name__, url_prefix='/api/devices')

@device_bp.route('/', methods=['GET'])
@jwt_required()
def list_devices():
    current_user_id = get_jwt_identity()
    devices = get_user_devices(current_user_id)
    return jsonify(devices), 200

@device_bp.route('/claim', methods=['POST'])
@jwt_required()
def claim():
    current_user_id = get_jwt_identity()
    data = request.json
    
    if not data or not data.get('mac_address'):
        return jsonify({"error": "Brak adresu MAC"}), 400

    result = claim_device_logic(current_user_id, data['mac_address'])
    
    if "error" in result:
        # Jeśli błąd dotyczy kradzieży (zajęte konto), zwracamy kod 409 (Conflict)
        if "innego użytkownika" in result['error']:
            return jsonify(result), 409
        # Inne błędy (np. nie znaleziono) -> 404
        return jsonify(result), 404
        
    return jsonify(result), 200

@device_bp.route('/config', methods=['POST'])
@jwt_required()
def config():
    current_user_id = get_jwt_identity()
    data = request.json
    
    res = update_config_logic(
        current_user_id,
        data.get('mac_address'),
        data.get('interval'),
        data.get('threshold')
    )
    
    if "error" in res:
        return jsonify(res), 403 if res['error'] == "Brak uprawnień" else 400
    return jsonify(res), 200

@device_bp.route('/<string:mac_address>/measurements', methods=['GET'])
@jwt_required()
def get_measurements(mac_address):
    current_user_id = get_jwt_identity()
    
    device = Device.query.filter_by(mac_address=mac_address).first()
    if not device:
        return jsonify({"error": "Device not found"}), 404
        
    if str(device.user_id) != str(current_user_id):
         return jsonify({"error": "Unauthorized"}), 403

    limit = request.args.get('limit', 100, type=int)
    
    data = get_device_measurements(device.id, current_user_id, limit)
    
    return jsonify({"success": True, "measurements": data}), 200

@device_bp.route('/<string:mac_address>', methods=['DELETE'])
@jwt_required()
def delete_device(mac_address):
    current_user_id = get_jwt_identity()
    
    # Wywołujemy logikę z kontrolera
    response, status_code = unbind_device_logic(current_user_id, mac_address)
    
    return jsonify(response), status_code