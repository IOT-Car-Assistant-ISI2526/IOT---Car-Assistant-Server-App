import threading
from app import create_app
from mqtt_worker import start_worker

app = create_app()

if __name__ == '__main__':
    mqtt_thread = threading.Thread(target=start_worker, args=(app,))
    
    mqtt_thread.daemon = True
    mqtt_thread.start()

    print("🌐 Uruchamianie serwera API...")
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)