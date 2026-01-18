import sqlite3
import os
from datetime import datetime
from typing import Optional, List, Dict

DB_PATH = "iot_data.db"

class Database:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.init_database()
    
    def get_connection(self):
        return sqlite3.connect(self.db_path)
    
    def init_database(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                mac_address TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, mac_address)
            )
        """)
        

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS measurements_adxl (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                value TEXT NOT NULL,
                received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(id)
            )
        """)
        

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS measurements_max_normal (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                value TEXT NOT NULL,
                received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(id)
            )
        """)
        

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS measurements_max_profile (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                value TEXT NOT NULL,
                received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(id)
            )
        """)
        

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(id)
            )
        """)
        

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_devices_mac ON devices(mac_address)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_adxl_device ON measurements_adxl(device_id, timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_max_normal_device ON measurements_max_normal(device_id, timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_max_profile_device ON measurements_max_profile(device_id, timestamp)")
        
        conn.commit()
        conn.close()
    
    def get_or_create_user(self, username: str) -> int:

        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        if user:
            user_id = user[0]
        else:
            cursor.execute("INSERT INTO users (username) VALUES (?)", (username,))
            user_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        return user_id
    
    def get_or_create_device(self, user_id: int, mac_address: str) -> int:

        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM devices WHERE user_id = ? AND mac_address = ?", 
                      (user_id, mac_address))
        device = cursor.fetchone()
        
        if device:
            device_id = device[0]

            cursor.execute("UPDATE devices SET last_seen = CURRENT_TIMESTAMP WHERE id = ?", 
                          (device_id,))
        else:
            cursor.execute("INSERT INTO devices (user_id, mac_address, last_seen) VALUES (?, ?, CURRENT_TIMESTAMP)", 
                          (user_id, mac_address))
            device_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        return device_id
    
    def insert_measurement(self, device_id: int, sensor_type: str, timestamp: int, value: str):

        conn = self.get_connection()
        cursor = conn.cursor()
        
        table_map = {
            'adxl': 'measurements_adxl',
            'max_normal': 'measurements_max_normal',
            'max_profile': 'measurements_max_profile'
        }
        
        table = table_map.get(sensor_type.lower())
        if not table:
            conn.close()
            raise ValueError(f"Unknown sensor type: {sensor_type}")
        
        cursor.execute(f"""
            INSERT INTO {table} (device_id, timestamp, value)
            VALUES (?, ?, ?)
        """, (device_id, timestamp, value))
        
        conn.commit()
        conn.close()
    
    def get_devices(self, user_id: Optional[int] = None) -> List[Dict]:

        conn = self.get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if user_id:
            cursor.execute("""
                SELECT d.id, d.mac_address, d.created_at, d.last_seen, u.username
                FROM devices d
                JOIN users u ON d.user_id = u.id
                WHERE d.user_id = ?
                ORDER BY d.last_seen DESC
            """, (user_id,))
        else:
            cursor.execute("""
                SELECT d.id, d.mac_address, d.created_at, d.last_seen, u.username
                FROM devices d
                JOIN users u ON d.user_id = u.id
                ORDER BY d.last_seen DESC
            """)
        
        devices = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return devices
    
    def get_measurements(self, device_id: int, sensor_type: str, limit: int = 100) -> List[Dict]:

        conn = self.get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        table_map = {
            'adxl': 'measurements_adxl',
            'max_normal': 'measurements_max_normal',
            'max_profile': 'measurements_max_profile'
        }
        
        table = table_map.get(sensor_type.lower())
        if not table:
            conn.close()
            raise ValueError(f"Unknown sensor type: {sensor_type}")
        
        cursor.execute(f"""
            SELECT timestamp, value, received_at
            FROM {table}
            WHERE device_id = ?
            ORDER BY timestamp DESC
            LIMIT ?
        """, (device_id, limit))
        
        measurements = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return measurements
    
    def insert_alert(self, device_id: int, message: str):

        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO alerts (device_id, message)
            VALUES (?, ?)
        """, (device_id, message))
        
        conn.commit()
        conn.close()

