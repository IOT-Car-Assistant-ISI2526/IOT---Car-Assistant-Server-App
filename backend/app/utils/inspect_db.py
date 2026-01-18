import sqlite3
import os

# Nazwa pliku bazy danych (musi być ta sama co w .env)
DB_PATH = "backend/instance/iot_data.db"

def inspect_database():
    # Sprawdzenie czy plik istnieje
    if not os.path.exists(DB_PATH):
        print(f"❌ Nie znaleziono pliku bazy danych: {DB_PATH}")
        print("   Uruchom najpierw run.py, aby utworzyć bazę.")
        return

    print(f"📂 Otwieranie bazy: {DB_PATH}\n")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        # Ustawienie row_factory pozwala odwoływać się do kolumn po nazwie, 
        # ale tutaj użyjemy domyślnego, żeby widzieć surowe dane.
        cursor = conn.cursor()

        # 1. Pobierz listę wszystkich tabel
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = cursor.fetchall()

        if not tables:
            print("⚠️ Baza jest pusta (brak tabel).")
            conn.close()
            return

        print(f"Znaleziono {len(tables)} tabel(e/i).")
        print("=" * 60)

        for table in tables:
            table_name = table[0]
            print(f"📋 TABELA: {table_name.upper()}")
            
            # Pobierz nazwy kolumn
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns_info = cursor.fetchall()
            column_names = [col[1] for col in columns_info]
            print(f"   Kolumny: {column_names}")

            # Pobierz liczbę wierszy
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            row_count = cursor.fetchone()[0]
            print(f"   Liczba wierszy: {row_count}")

            # Pobierz 5 ostatnich wpisów
            print("   --- Ostatnie 5 wpisów ---")
            cursor.execute(f"SELECT * FROM {table_name} ORDER BY rowid DESC LIMIT 5")
            rows = cursor.fetchall()

            if rows:
                for row in rows:
                    print(f"   Row: {row}")
            else:
                print("   (Brak danych)")
            
            print("-" * 60)

        conn.close()

    except Exception as e:
        print(f"❌ Wystąpił błąd: {e}")

if __name__ == "__main__":
    inspect_database()