from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.controllers.device_controller import get_user_devices, claim_device_logic, update_config_logic, unbind_device_logic
from app.controllers.device_controller import get_device_measurements, update_device_friendly_name
from app.models.device import Device
from datetime import datetime
import logging

device_bp = Blueprint('devices', __name__, url_prefix='/api/devices')

@device_bp.route('/', methods=['GET'])
@jwt_required()
def list_devices():
    current_user_id = get_jwt_identity()
    devices = get_user_devices(current_user_id)
    return jsonify(devices), 200

@device_bp.route('/<string:mac_address>', methods=['PUT'])
@jwt_required()
def update_device_name_endpoint(mac_address):
    """
    Endpoint API: PUT /api/devices/<MAC>
    """
    current_user_id = get_jwt_identity()
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "Brak danych JSON"}), 400
        
    new_name = data.get('friendly_name')

    try:
        updated_device_dict = update_device_friendly_name(
            mac_address=mac_address,
            user_id=current_user_id,
            new_name=new_name
        )
        
        return jsonify({
            "message": "Zaktualizowano nazwę urządzenia",
            "device": updated_device_dict
        }), 200

    except ValueError as ve:
        if "nie zostało znalezione" in str(ve):
            return jsonify({"error": str(ve)}), 404
        return jsonify({"error": str(ve)}), 400
        
    except PermissionError as pe:
        return jsonify({"error": str(pe)}), 403
        
    except RuntimeError as re:
        # Błąd bazy/serwera -> 500
        logging.error(f"DB Error updating device {mac_address}: {str(re)}")
        return jsonify({"error": "Wystąpił błąd wewnętrzny serwera."}), 500

@device_bp.route('/claim', methods=['POST'])
@jwt_required()
def claim():
    current_user_id = get_jwt_identity()
    data = request.json
    
    raw_mac = data.get('mac_address') or data.get('macAddress')
    
    if not raw_mac:
        return jsonify({"error": "Brak adresu MAC"}), 400

    result = claim_device_logic(current_user_id, raw_mac)
    
    if "error" in result:
        if "innego użytkownika" in result['error']:
            return jsonify(result), 409
        return jsonify(result), 500
        
    status_code = 201 if result.get('status') == 'created' else 200
    return jsonify(result), status_code

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

    start_str = request.args.get('start_date')
    end_str = request.args.get('end_date')
    
    start_date = None
    end_date = None

    try:
        if start_str:
            start_date = datetime.fromisoformat(start_str)
        
        if end_str:
            end_date = datetime.fromisoformat(end_str)
            
    except ValueError:
        return jsonify({"error": "Nieprawidłowy format daty. Użyj formatu ISO (YYYY-MM-DD)"}), 400

    data = get_device_measurements(device.id, current_user_id, start_date, end_date)
    
    return jsonify({"success": True, "measurements": data}), 200

@device_bp.route('/<string:mac_address>', methods=['DELETE'])
@jwt_required()
def delete_device(mac_address):
    current_user_id = get_jwt_identity()
    
    # Wywołujemy logikę z kontrolera
    response, status_code = unbind_device_logic(current_user_id, mac_address)
    
    return jsonify(response), status_code