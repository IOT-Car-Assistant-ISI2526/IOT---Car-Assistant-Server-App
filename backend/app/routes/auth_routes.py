from flask import Blueprint, request, jsonify
from app.controllers.auth_controller import register_logic, login_logic

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    res, code = register_logic(data.get('username'), data.get('password'))
    return jsonify(res), code

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    res, code = login_logic(data.get('username'), data.get('password'))
    return jsonify(res), code