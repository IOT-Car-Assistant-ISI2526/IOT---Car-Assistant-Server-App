from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import logging

from app.models.device import Device
from app.controllers.stats_controller import analyze_acceleration, analyze_engine_temperature

stats_bp = Blueprint('stats', __name__, url_prefix='/api/stats')

@stats_bp.route('/<string:mac_address>/acceleration', methods=['GET'])
@jwt_required()
def get_driving_stats(mac_address):
    """
    Endpoint API do pobierania oceny stylu jazdy.
    URL: /api/stats/AA:BB:CC:DD:EE:FF/acceleration?start_date=2023-10-01&end_date=2023-10-07
    """
    current_user_id = get_jwt_identity()
    
    device = Device.query.filter_by(mac_address=mac_address).first()
    
    if not device:
        return jsonify({"error": "Urządzenie nie zostało znalezione"}), 404
        
    if str(device.user_id) != str(current_user_id):
        return jsonify({"error": "Brak uprawnień do tego urządzenia"}), 403

    start_str = request.args.get('start_date')
    end_str = request.args.get('end_date')
    
    try:
        if end_str:
            end_date = datetime.fromisoformat(end_str)
            if end_date.hour == 0 and end_date.minute == 0:
                end_date = end_date.replace(hour=23, minute=59, second=59)
        else:
            end_date = datetime.now()

        if start_str:
            start_date = datetime.fromisoformat(start_str)
        else:
            start_date = end_date - timedelta(days=7)

    except ValueError:
        return jsonify({"error": "Nieprawidłowy format daty. Oczekiwany format ISO (YYYY-MM-DD)."}), 400

    # 3. Wywołanie Twojego kontrolera
    try:
        result = analyze_acceleration(
            device_id=device.id, 
            user_id=current_user_id, 
            start_date=start_date, 
            end_date=end_date
        )
        
        return jsonify({"success": True, "data": result}), 200

    except ValueError as ve:
        # Obsługa błędów walidacji z kontrolera (np. start > end)
        return jsonify({"error": str(ve)}), 400
        
    except Exception as e:
        # Logowanie błędu na serwerze
        logging.error(f"Critical error in stats API for {mac_address}: {str(e)}")
        return jsonify({"error": "Wystąpił błąd wewnętrzny serwera."}), 500
    

@stats_bp.route('/<string:mac_address>/engine_temp', methods=['GET'])
@jwt_required()
def get_engine_temp_stats(mac_address):
    """
    Pobiera statystyki temperatury (max_normal) dla urządzenia.
    URL: /api/stats/<MAC>/engine_temp?start_date=...&end_date=...&min_temp=50
    """
    current_user_id = get_jwt_identity()
    
    # 1. Weryfikacja urządzenia i właściciela
    device = Device.query.filter_by(mac_address=mac_address).first()
    
    if not device:
        return jsonify({"error": "Urządzenie nie zostało znalezione"}), 404
        
    if str(device.user_id) != str(current_user_id):
        return jsonify({"error": "Brak uprawnień do tego urządzenia"}), 403

    # 2. Pobieranie i parsowanie parametrów URL
    start_str = request.args.get('start_date')
    end_str = request.args.get('end_date')
    min_temp_str = request.args.get('min_temp')
    
    try:
        if end_str:
            end_date = datetime.fromisoformat(end_str)
            if end_date.hour == 0 and end_date.minute == 0:
                end_date = end_date.replace(hour=23, minute=59, second=59)
        else:
            end_date = datetime.now()

        if start_str:
            start_date = datetime.fromisoformat(start_str)
        else:
            start_date = end_date - timedelta(days=7)

    except ValueError:
        return jsonify({"error": "Nieprawidłowy format daty. Oczekiwany format ISO (YYYY-MM-DD)."}), 400

    min_value = None
    if min_temp_str:
        try:
            min_value = float(min_temp_str)
        except ValueError:
            return jsonify({"error": "Parametr min_temp musi być liczbą"}), 400

    try:
        result = analyze_engine_temperature(
            device_id=device.id,
            user_id=current_user_id,
            start_date=start_date,
            end_date=end_date,
            min_value=min_value
        )
        
        if result is None:
             return jsonify({
                "success": True, 
                "message": "Brak danych spełniających kryteria w wybranym okresie.",
                "data": None
            }), 200

        return jsonify({"success": True, "data": result}), 200

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
        
    except Exception as e:
        logging.error(f"Error in engine-temp API for {mac_address}: {str(e)}")
        return jsonify({"error": "Wystąpił błąd wewnętrzny serwera."}), 500