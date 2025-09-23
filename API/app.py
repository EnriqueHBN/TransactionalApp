import json
import os
from datetime import datetime
from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

# Inicialización de la aplicación Flask
app = Flask(__name__)

# --- CONFIGURACIÓN DE LA BASE DE DATOS (ARCHIVOS JSON) ---
DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'db')
USERS_FILE = os.path.join(DB_DIR, 'users.json')
STATUS_FILE = os.path.join(DB_DIR, 'status.json')
TRANSACTIONS_FILE = os.path.join(DB_DIR, 'transactions.json')
HISTORY_FILE = os.path.join(DB_DIR, 'transaction_status_history.json')

# Función para asegurar que el directorio y los archivos de la BD existan
def initialize_database():
    """Crea el directorio 'db' y los archivos JSON si no existen."""
    os.makedirs(DB_DIR, exist_ok=True)
    
    if not os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'w') as f:
            json.dump([], f)
            
    if not os.path.exists(TRANSACTIONS_FILE):
        with open(TRANSACTIONS_FILE, 'w') as f:
            json.dump([], f)

    if not os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'w') as f:
            json.dump([], f)
    
    # Inicializa los estados por defecto si el archivo está vacío
    if not os.path.exists(STATUS_FILE) or os.path.getsize(STATUS_FILE) == 0:
        default_statuses = [
            {"id": 1, "status_name": "en proceso"},
            {"id": 2, "status_name": "pagado"},
            {"id": 3, "status_name": "cancelado"}
        ]
        with open(STATUS_FILE, 'w') as f:
            json.dump(default_statuses, f, indent=4)

# --- FUNCIONES AUXILIARES PARA MANEJAR JSON ---
def read_data(file_path):
    """Lee datos de un archivo JSON."""
    with open(file_path, 'r') as f:
        return json.load(f)

def write_data(file_path, data):
    """Escribe datos a un archivo JSON."""
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)

def get_next_id(data):
    """Calcula el siguiente ID autoincremental."""
    if not data:
        return 1
    return max(item['id'] for item in data) + 1

# --- 1. API: REGISTRO DE USUARIOS ---
@app.route('/api/register', methods=['POST'])
def register_user():
    """
    Endpoint para registrar un nuevo usuario.
    La contraseña se guarda hasheada.
    """
    data = request.get_json()
    if not data or not 'username' in data or not 'password' in data:
        return jsonify({"error": "Faltan datos de usuario y contraseña"}), 400

    users = read_data(USERS_FILE)
    
    # Verificar si el usuario ya existe
    if any(u['username'] == data['username'] for u in users):
        return jsonify({"error": "El nombre de usuario ya existe"}), 409 # 409 Conflict

    # Hashear la contraseña antes de guardarla
    # LÍNEA CORREGIDA
    hashed_password = generate_password_hash(data['password'], method='pbkdf2:sha256')

    new_user = {
        "id": get_next_id(users),
        "username": data['username'],
        "password_hash": hashed_password,
        "created_at": datetime.utcnow().isoformat()
    }

    users.append(new_user)
    write_data(USERS_FILE, users)

    return jsonify({"message": "Usuario registrado exitosamente", "userId": new_user['id']}), 201

# --- 2. API: CRUD DE VENTAS (TRANSACCIONES) ---
# NOTA: Para simplificar, asumiremos que el user_id se pasa en el cuerpo de la petición.
# En una aplicación real, se obtendría de un token de autenticación (JWT).

# Crear una Venta (Create)
@app.route('/api/transactions', methods=['POST'])
def create_transaction():
    """Crea una nueva transacción para un usuario."""
    data = request.get_json()
    if not data or not 'user_id' in data or not 'amount' in data:
        return jsonify({"error": "Faltan user_id y amount"}), 400

    # Validar que el usuario exista
    users = read_data(USERS_FILE)
    if not any(u['id'] == data['user_id'] for u in users):
        return jsonify({"error": "Usuario no encontrado"}), 404

    transactions = read_data(TRANSACTIONS_FILE)
    history = read_data(HISTORY_FILE)
    statuses = read_data(STATUS_FILE)
    
    # Estado inicial por defecto: "en proceso" (id: 1)
    initial_status_id = 1
    
    new_transaction = {
        "id": get_next_id(transactions),
        "user_id": data['user_id'],
        "amount": float(data['amount']),
        "description": data.get("description", ""),
        "current_status_id": initial_status_id,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Crear el primer registro en el historial de estados
    new_history_entry = {
        "id": get_next_id(history),
        "transaction_id": new_transaction['id'],
        "status_id": initial_status_id,
        "changed_at": datetime.utcnow().isoformat()
    }
    
    transactions.append(new_transaction)
    history.append(new_history_entry)
    
    write_data(TRANSACTIONS_FILE, transactions)
    write_data(HISTORY_FILE, history)
    
    return jsonify({
        "message": "Transacción creada exitosamente",
        "transaction": new_transaction
    }), 201

# Leer todas las Ventas de un usuario (Read)
@app.route('/api/users/<int:user_id>/transactions', methods=['GET'])
def get_user_transactions(user_id):
    """Obtiene todas las transacciones de un usuario específico."""
    transactions = read_data(TRANSACTIONS_FILE)
    user_transactions = [t for t in transactions if t['user_id'] == user_id]
    
    if not user_transactions:
        return jsonify({"message": "No se encontraron transacciones para este usuario"}), 404
        
    return jsonify(user_transactions), 200

# Leer una Venta específica (Read)
@app.route('/api/transactions/<int:transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    """Obtiene una transacción específica y su historial de estados."""
    transactions = read_data(TRANSACTIONS_FILE)
    statuses = read_data(STATUS_FILE)
    history = read_data(HISTORY_FILE)
    
    transaction = next((t for t in transactions if t['id'] == transaction_id), None)
    
    if not transaction:
        return jsonify({"error": "Transacción no encontrada"}), 404
        
    # Construir el historial de estados con nombres en lugar de IDs
    status_map = {s['id']: s['status_name'] for s in statuses}
    transaction_history = [
        {
            "status": status_map.get(h['status_id'], "desconocido"),
            "changed_at": h['changed_at']
        } 
        for h in history if h['transaction_id'] == transaction_id
    ]
    
    # Añadir el historial al resultado
    transaction['history'] = sorted(transaction_history, key=lambda x: x['changed_at'])
    
    return jsonify(transaction), 200

# Actualizar una Venta (Update)
@app.route('/api/transactions/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    """Actualiza una transacción (ej: monto, descripción o estado)."""
    data = request.get_json()
    transactions = read_data(TRANSACTIONS_FILE)
    transaction = next((t for t in transactions if t['id'] == transaction_id), None)

    if not transaction:
        return jsonify({"error": "Transacción no encontrada"}), 404

    # Actualizar campos básicos
    transaction['amount'] = float(data.get('amount', transaction['amount']))
    transaction['description'] = data.get('description', transaction['description'])

    # Si se cambia el estado, actualizarlo y crear un registro en el historial
    if 'status_id' in data and data['status_id'] != transaction['current_status_id']:
        statuses = read_data(STATUS_FILE)
        if not any(s['id'] == data['status_id'] for s in statuses):
            return jsonify({"error": "ID de estado inválido"}), 400
        
        transaction['current_status_id'] = data['status_id']
        
        history = read_data(HISTORY_FILE)
        new_history_entry = {
            "id": get_next_id(history),
            "transaction_id": transaction_id,
            "status_id": data['status_id'],
            "changed_at": datetime.utcnow().isoformat()
        }
        history.append(new_history_entry)
        write_data(HISTORY_FILE, history)
    
    write_data(TRANSACTIONS_FILE, transactions)
    return jsonify({"message": "Transacción actualizada exitosamente", "transaction": transaction}), 200

# Borrar una Venta (Delete)
@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """Elimina una transacción y su historial asociado."""
    transactions = read_data(TRANSACTIONS_FILE)
    history = read_data(HISTORY_FILE)

    if not any(t['id'] == transaction_id for t in transactions):
        return jsonify({"error": "Transacción no encontrada"}), 404

    # Filtrar para mantener solo las que NO coinciden con el ID a borrar
    transactions_after_delete = [t for t in transactions if t['id'] != transaction_id]
    history_after_delete = [h for h in history if h['transaction_id'] != transaction_id]

    write_data(TRANSACTIONS_FILE, transactions_after_delete)
    write_data(HISTORY_FILE, history_after_delete)

    return jsonify({"message": "Transacción eliminada exitosamente"}), 200 # o 204 No Content

# --- INICIAR LA APLICACIÓN ---
if __name__ == '__main__':
    initialize_database() # Se asegura que los archivos JSON existan
    app.run(debug=True)
