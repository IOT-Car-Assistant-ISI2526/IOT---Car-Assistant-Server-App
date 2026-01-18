# IOT Server - Serwer MQTT dla urządzeń ESP32

Projekt serwera IOT który nasłuchuje wiadomości MQTT z urządzeń ESP32 i zapisuje je do bazy danych SQLite.

## Funkcjonalności

- **Nasłuchiwanie MQTT**: Odbiera wiadomości z urządzeń ESP32 na topicach `user/{mac_address}/sensor/{sensor_type}`
- **Zapisywanie danych**: Automatycznie zapisuje pomiary do bazy danych SQLite podzielonej na:
  - Użytkowników (users)
  - Urządzenia (devices)
  - Pomiary dla 3 typów sensorów:
    - ADXL
    - MAX_NORMAL
    - MAX_PROFILE
- **API REST**: Endpointy do pobierania danych i wysyłania alertów
- **Frontend**: Interfejs webowy do przeglądania urządzeń, pomiarów i wysyłania alertów

## Wymagania

- Python 3.8+
- Broker MQTT (np. Mosquitto)
- Przeglądarka internetowa

## Instalacja

1. Zainstaluj zależności Pythona:
```bash
pip install -r requirements.txt
```

2. Upewnij się, że masz uruchomiony broker MQTT (domyślnie oczekiwany na `10.219.44.41:1883`):
```bash
# Jeśli masz Mosquitto:
mosquitto -v
# Lub uruchom jako usługa systemowa
```

## Uruchomienie

1. Uruchom serwer (backend + MQTT listener + API):
```bash
python backend/main.py
```

Serwer uruchomi się na porcie 5000 (API) i zacznie nasłuchiwać wiadomości MQTT.

2. Otwórz frontend w przeglądarce:
- Otwórz plik `frontend/index.html` w przeglądarce
- Lub użyj prostego serwera HTTP:
```bash
# Python 3
cd frontend
python -m http.server 8000
# Następnie otwórz http://localhost:8000
```

## Format danych ESP32

ESP32 wysyła dane na następujących topicach:
- `{user}/{mac_address}/sensor/{sensor_type}` - gdzie sensor_type może być: `adxl`, `max_normal`, `max_profile`

Format wiadomości:
- `hello` - wiadomość inicjalizująca (aktualizuje status urządzenia)
- `{timestamp};{value}` - pomiar sensora (np. `1234567890;25.5`)

## API Endpoints

### GET `/api/devices`
Pobiera listę wszystkich urządzeń.

### GET `/api/devices/{device_id}/measurements?sensor_type={type}&limit={limit}`
Pobiera pomiary dla danego urządzenia.

Parametry:
- `sensor_type`: `adxl`, `max_normal`, lub `max_profile` (domyślnie: `adxl`)
- `limit`: Liczba pomiarów do pobrania (domyślnie: 100)

### POST `/api/devices/send-alert`
Wysyła alert do urządzenia.

Body:
```json
{
  "mac_address": "aabbccddeeff",
  "message": "BUZZ"
}
```

Topic alertu: `user/{mac_address}/alerts`

## Struktura bazy danych

- **users**: Użytkownicy systemu
- **devices**: Urządzenia ESP32 (związane z użytkownikami)
- **measurements_adxl**: Pomiary z sensora ADXL
- **measurements_max_normal**: Pomiary z sensora MAX_NORMAL
- **measurements_max_profile**: Pomiary z sensora MAX_PROFILE
- **alerts**: Historia wysłanych alertów

## Konfiguracja

Domyślna konfiguracja MQTT brokera:
- Host: `10.219.44.41`
- Port: `1883`

Aby zmienić konfigurację, edytuj zmienne w plikach:
- `backend/main.py`: `MQTT_BROKER_HOST`, `MQTT_BROKER_PORT`
- `backend/app.py`: `MQTT_BROKER_HOST`, `MQTT_BROKER_PORT`

## Frontend

Frontend umożliwia:
- Przeglądanie listy urządzeń
- Wyświetlanie pomiarów dla wybranego urządzenia i typu sensora
- Wysyłanie alertów do urządzeń (domyślnie "BUZZ" na topic `user/{mac_address}/alerts`)

## Troubleshooting

1. **Błąd połączenia z MQTT**: Upewnij się, że broker MQTT jest uruchomiony
2. **CORS errors w przeglądarce**: Frontend musi być serwowany przez HTTP server (nie file://)
3. **Baza danych**: Baza SQLite (`iot_data.db`) zostanie automatycznie utworzona przy pierwszym uruchomieniu

