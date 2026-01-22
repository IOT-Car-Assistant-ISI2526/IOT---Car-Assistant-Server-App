from app import db
from app.models.measurement import Measurement
from sqlalchemy import func, case

def analyze_acceleration(device_id, user_id, start_date, end_date):
    """
    Analizuje styl jazdy w zadanym przedziale czasowym.
    """
    
    # Walidacja danych wejściowych
    if not start_date or not end_date:
        raise ValueError("Daty start_date i end_date są wymagane!")
    
    if start_date > end_date:
        raise ValueError("Data początkowa nie może być późniejsza niż końcowa")

    # Obliczamy liczbę dni (min 1)
    duration_days = (end_date - start_date).days
    if duration_days < 1:
        duration_days = 1

    # 1. Filtry
    filters = [
        Measurement.device_id == device_id,
        Measurement.user_id == user_id,
        Measurement.sensor_type == 'adxl',
        Measurement.timestamp >= int(start_date.timestamp()),
        Measurement.timestamp <= int(end_date.timestamp())
    ]

    # 2. Zapytanie do bazy
    # POPRAWKA: Usuwamy [], ale zostawiamy dodatkowe nawiasy () wokół pary (WARUNEK, WARTOŚĆ)
    # case( (warunek, wartość), else_=0 )
    
    stats = Measurement.query.with_entities(
        func.count(Measurement.id).label('total'),
        
        # Ostre manewry (1.25g - 2.5g)
        func.sum(case(
            ((Measurement.value > 1.25) & (Measurement.value <= 2.5), 1), 
            else_=0
        )).label('harsh'),

        # Zderzenia / Wypadki (> 2.5g)
        func.sum(case(
            (Measurement.value > 2.5, 1), 
            else_=0
        )).label('crash')
    ).filter(*filters).first()

    # 3. Obsługa braku wyników
    total_readings = stats.total if stats else 0
    if total_readings == 0:
        return {
            "score": 100,
            "interpretation": "Brak danych - brak oceny.",
            "period_days": duration_days,
            "stats": {
                "total_harsh": 0, 
                "avg_harsh_per_day": 0, 
                "total_crashes": 0, 
                "total_readings": 0
            }
        }

    # Konwersja na int (SQLAlchemy może zwrócić Decimal lub None)
    harsh_maneuvers = int(stats.harsh or 0)
    crashes = int(stats.crash or 0)

    # 4. Obliczanie statystyk DZIENNYCH
    avg_harsh_per_day = harsh_maneuvers / duration_days
    
    # 5. Algorytm Oceny
    penalty_harsh = avg_harsh_per_day * 15
    penalty_crash = crashes * 50
    
    final_score = 100 - (penalty_harsh + penalty_crash)
    final_score = max(0, min(100, int(final_score)))

    return {
        "score": final_score,
        "period_days": duration_days,
        "stats": {
            "total_harsh": harsh_maneuvers,
            "avg_harsh_per_day": round(avg_harsh_per_day, 2),
            "total_crashes": crashes,
            "total_readings": total_readings
        },
        "interpretation": _get_interpretation(final_score)
    }

def _get_interpretation(score):
    if score >= 90: return "Wzorowy kierowca"
    if score >= 75: return "Dobry styl jazdy"
    if score >= 50: return "Agresywny styl jazdy"
    return "Niebezpieczny kierowca"



def analyze_engine_temperature(device_id, user_id, start_date, end_date, min_value=None):
    """
    Analizuje temperaturę, biorąc pod uwagę tylko odczyty > min_value.
    Dzięki temu eliminujemy np. odczyty z wyłączonego/zimnego silnika przy liczeniu średniej.
    """
    
    if not start_date or not end_date:
        raise ValueError("Daty start_date i end_date są wymagane!")
    if start_date > end_date:
        raise ValueError("Data początkowa nie może być późniejsza niż końcowa")

    # 1. Filtry podstawowe
    filters = [
        Measurement.device_id == device_id,
        Measurement.user_id == user_id,
        Measurement.sensor_type == 'max_normal',
        Measurement.timestamp >= int(start_date.timestamp()),
        Measurement.timestamp <= int(end_date.timestamp())
    ]

    if min_value is not None:
        filters.append(Measurement.value > float(min_value))

    # 3. Zapytanie agregujące
    stats = Measurement.query.with_entities(
        func.count(Measurement.id).label('total'),
        func.avg(Measurement.value).label('avg_temp'),
        func.max(Measurement.value).label('max_temp'),
    ).filter(*filters).first()

    total_readings = stats.total if stats else 0
    
    if total_readings == 0:
        return None 

    avg_temp = float(stats.avg_temp or 0)
    max_temp = float(stats.max_temp or 0)

    return {
        "avg_temp": round(avg_temp, 1),
        "max_temp": round(max_temp, 1),
        "total_readings": total_readings,
        "threshold_used": min_value,
    }
