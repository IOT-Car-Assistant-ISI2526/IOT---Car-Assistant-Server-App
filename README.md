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
2. Stwórz na pulpicie plik `mosquitto1.conf`, zawartość:
```
listener 1883 0.0.0.0
allow_anonymous true
```
Przeciągnij go do ścieżki gdzie Mosquitto było ściągnięte. (Trzeba kliknąć uprawnienia administratora komputera.)
4. Upewnij się, że masz uruchomiony broker MQTT (domyślnie oczekiwany na `10.219.44.41:1883`):
```bash
# Jeśli masz Mosquitto:
cd C:\Program Files\mosquitto\
# Lub inna ścieżka gdzie było ściągnięte
mosquitto -c mosquitto1.conf -v
```
Zmień w kodzie ip na to na którym chodzi twój serwer Mosquitto.

## Uruchomienie

1. Uruchom serwer (backend + MQTT listener + API):
```bash
python backend/run.py
```

Serwer uruchomi się na porcie 5000 (API) i zacznie nasłuchiwać wiadomości MQTT.

2. Otwórz frontend w przeglądarce:
- Otwórz aplikacje react w przeglądarce

```bash
cd frontend
npm install 
npm run dev
# Następnie otwórz http://localhost:5173/
```

## Format danych ESP32

ESP32 wysyła dane na następujących topicach:
- `{user}/{mac_address}/sensor/{sensor_type}` - gdzie sensor_type może być: `adxl`, `max_normal`, `max_profile`

Format wiadomości:
- `hello` - wiadomość inicjalizująca (aktualizuje status urządzenia)
- `{timestamp};{value}` - pomiar sensora (np. `1234567890;25.5`)

## API Endpoints

Wszystkie endpointy (poza sekcją uwierzytelniania) wymagają nagłówka:
`Authorization: Bearer <twoj_token_jwt>`

### Uwierzytelnianie:

#### `POST /api/auth/register`
Rejestracja nowego użytkownika.

**Body:**
```json
{
  "username": "login",
  "password": "password"
}
```

#### `POST /api/auth/login`
Logowanie. Zwraca token JWT, który jest wymagany do zapytań o urządzenia i pomiary.

**Body:**
```json
{
  "username": "login",
  "password": "password"
}
```

### Urządzenia:

#### `GET /api/devices/`
Pobiera listę urządzeń przypisanych do zalogowanego użytkownika.

#### `POST /api/devices/claim`
Przypisuje urządzenie do konta użytkownika (jeśli jest wolne).

**Body:**
```json
{
  "mac_address": "AA:BB:CC:DD:EE:FF"
}
```

#### `DELETE /api/devices/{mac_address}`
Usuwa urządzenie z konta. Urządzenie staje się wolne i traci powiązanie z historią właściciela.

### Pomiary:

#### `GET /api/devices/{mac_address}/measurements`
Pobiera historię pomiarów. Zwraca tylko te dane, które zostały zarejestrowane podczas posiadania urządzenia przez obecnego użytkownika.

Parametry:
- `sensor_type`: `adxl`, `max_normal`, lub `max_profile` (domyślnie: `adxl`)
- `limit`: Liczba pomiarów do pobrania (domyślnie: 100)

#### `GET /api/devices/{mac_address}/measurements`
Pobiera historię pomiarów. Zwraca tylko te dane, które zostały zarejestrowane podczas posiadania urządzenia przez obecnego użytkownika.

Parametry:
- `sensor_type`: `adxl`, `max_normal`, lub `max_profile` (domyślnie: `adxl`)
- `limit`: Liczba pomiarów do pobrania (domyślnie: 100)


## Struktura bazy danych

- **users**: Użytkownicy systemu
- **devices**: Urządzenia ESP32 (związane z użytkownikami)
- **measurements**: Pomiary z sensorów


## Konfiguracja (.env)

System nie przechowuje haseł ani adresów IP bezpośrednio w kodzie. Zamiast tego używa zmiennych środowiskowych.

Aby skonfigurować system:

1.  W głównym katalogu projektu utwórz plik o nazwie **`.env`**.
2.  Wklej do niego poniższą zawartość i pozamieniaj wartości:

```ini
# --- PLIK .ENV ---

SECRET_KEY=zmien_mnie_na_losowy_ciag_znakow_dla_bezpieczenstwa
JWT_SECRET_KEY=zmien_mnie_na_losowy_ciag_znakow_dla_bezpieczenstwa

MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883

DATABASE_URL=sqlite:///iot_data.db
```

## Struktura Projektu

```text
/
├── backend/                    # Logika serwera (Python/Flask)
│   ├── app/                    # Główny pakiet aplikacji (MVC)
│   │   ├── __init__.py         # Inicjalizacja aplikacji i bazy
│   │   ├── models/             # Modele bazy danych (User, Device, Measurement)
│   │   ├── controllers/        # Głowna logika
│   │   ├── utils/              # Skrypty pomocnicze (wyswietlanie zawartosci bazy danych, symulacja urzadzen esp32)
│   │   └── routes/             # Endpointy API
│   ├── instance/               # Folder instancji (często tu zapisuje się baza .db)
│   ├── config.py               # Plik konfiguracyjny Flaska
│   ├── mqtt_worker.py          # Wątek nasłuchujący MQTT
│   ├── run.py                  # Główny plik startowy serwera
│   └── test_mqtt_connection.py # Skrypt pomocniczy do testowania połączenia
│
├── frontend/                   # Interfejs użytkownika (Klient)
│   ├── index.html              # Główny plik HTML
│   ├── app.js                  # Logika aplikacji (Wykresy, API, Auth)
│   └── styles.css              # Style wyglądu strony
│
├── venv/                       # Wirtualne środowisko Python (biblioteki)
├── .env                        # Konfiguracja (Hasła, IP - plik ukryty)
├── .gitignore                  # Lista plików ignorowanych przez Git
├── requirements.txt            # Lista wymaganych bibliotek
└── README.md                   # Dokumentacja projektu
