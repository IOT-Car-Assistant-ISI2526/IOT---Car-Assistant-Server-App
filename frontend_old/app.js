const API_BASE_URL = 'http://localhost:5000/api';

// --- STAN APLIKACJI ---
let currentUser = null;
let currentToken = localStorage.getItem('access_token');
let selectedDeviceMac = null;

// Zmienne wykresu
let chartInstance = null;
let cachedMeasurements = {}; 

// --- INICJALIZACJA ---
document.addEventListener('DOMContentLoaded', () => {
    if (currentToken) {
        const storedUser = localStorage.getItem('username');
        if (storedUser) document.getElementById('welcomeUser').textContent = `Użytkownik: ${storedUser}`;
        showDashboard();
    } else {
        showAuth();
    }
    setupEventListeners();
});

function setupEventListeners() {
    // Auth
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Urządzenia
    document.getElementById('refreshDevices').addEventListener('click', loadDevices);
    document.getElementById('claimDeviceBtn').addEventListener('click', handleClaimDevice);
    
    // Przycisk "Usuń" otwiera modal
    document.getElementById('unbindDeviceBtn').addEventListener('click', () => openDeleteModal());
    
    // Pomiary
    document.getElementById('refreshMeasurements').addEventListener('click', loadMeasurements);

    // Zamykanie modala ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape") closeDeleteModal();
    });
}

// ==========================================
// SEKCJA 1: LOGOWANIE I REJESTRACJA
// ==========================================

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok) {
            loginSuccess(data);
        } else {
            showAuthMessage(data.error || 'Błąd logowania', 'error');
        }
    } catch (err) {
        showAuthMessage('Błąd serwera', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerPasswordConfirm').value;

    if (password !== confirm) {
        showAuthMessage('Hasła nie są identyczne!', 'error');
        return;
    }

    try {
        // 1. Rejestracja
        const regRes = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const regData = await regRes.json();

        if (regRes.status === 201) {
            showAuthMessage('✅ Konto utworzone! Logowanie...', 'success');
            
            // 2. Automatyczne logowanie po rejestracji
            const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (loginRes.ok) {
                const loginData = await loginRes.json();
                loginSuccess(loginData);
            } else {
                switchAuthTab('login');
                showAuthMessage('Zaloguj się ręcznie.', 'success');
            }
        } else {
            showAuthMessage(regData.error || 'Błąd rejestracji', 'error');
        }
    } catch (err) {
        showAuthMessage('Błąd serwera', 'error');
    }
}

function loginSuccess(data) {
    currentToken = data.access_token;
    localStorage.setItem('access_token', currentToken);
    
    if(data.username) {
        localStorage.setItem('username', data.username);
        document.getElementById('welcomeUser').textContent = `Użytkownik: ${data.username}`;
    }
    document.querySelectorAll('input').forEach(i => i.value = '');
    showDashboard();
}

function handleLogout() {
    // 1. Czyszczenie Tokenów i Stanu
    currentToken = null;
    localStorage.clear();
    selectedDeviceMac = null;
    cachedMeasurements = {}; // Czyścimy cache pomiarów

    // 2. Czyszczenie Wykresu (Kluczowe!)
    if (chartInstance) {
        chartInstance.destroy(); // Niszczy instancję Chart.js
        chartInstance = null;
    }
    // Opcjonalnie: czyścimy sam element canvas, żeby zniknął "duch" wykresu
    const canvas = document.getElementById('sensorChart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3. Czyszczenie UI (Interfejsu)
    document.getElementById('devicesList').innerHTML = ''; // Czyścimy listę urządzeń
    document.getElementById('sensorTabs').innerHTML = '';  // Czyścimy przyciski zakładek
    
    // Resetujemy napisy w szczegółach
    document.getElementById('selectedDeviceTitle').textContent = 'Urządzenie';
    document.getElementById('selectedDeviceMac').textContent = 'MAC: ...';
    
    // Ukrywamy sekcję szczegółów, pokazujemy stan pusty
    document.getElementById('deviceDetailsSection').classList.add('hidden');
    document.getElementById('emptyStateMessage').classList.remove('hidden');

    // 4. Przełączenie widoku na logowanie
    showAuth();
}

// ==========================================
// SEKCJA 2: URZĄDZENIA
// ==========================================

async function loadDevices() {
    const list = document.getElementById('devicesList');
    list.innerHTML = '<p style="text-align:center">Ładowanie...</p>';

    try {
        const response = await fetchAuth('/devices/');
        if (!response) return; 

        const devices = await response.json();

        if (devices.length === 0) {
            list.innerHTML = '<p style="text-align:center; padding:10px;">Brak urządzeń.</p>';
            return;
        }

        list.innerHTML = '';
        devices.forEach(device => {
            const div = document.createElement('div');
            div.className = `device-item ${selectedDeviceMac === device.mac_address ? 'selected' : ''}`;
            div.innerHTML = `
                <div style="font-weight: bold; font-size: 1.1em;">${device.friendly_name || 'Urządzenie IOT'}</div>
                <div style="font-size: 0.9em; color: #666;">${device.mac_address}</div>
            `;
            div.onclick = () => selectDevice(device);
            list.appendChild(div);
        });

    } catch (e) {
        list.innerHTML = '<p class="status-msg error">Błąd pobierania</p>';
    }
}

function selectDevice(device) {
    selectedDeviceMac = device.mac_address;
    
    // UI Update
    document.getElementById('deviceDetailsSection').classList.remove('hidden');
    document.getElementById('emptyStateMessage').classList.add('hidden');
    
    document.getElementById('selectedDeviceTitle').textContent = device.friendly_name || "Urządzenie IOT";
    document.getElementById('selectedDeviceMac').textContent = `MAC: ${device.mac_address}`;
    
    loadDevices(); // Żeby zaktualizować zaznaczenie
    loadMeasurements(); // Pobierz dane i narysuj wykres
}

async function handleClaimDevice() {
    const mac = document.getElementById('claimMac').value.trim();
    const status = document.getElementById('claimStatus');
    
    if (!mac) return;

    try {
        const response = await fetchAuth('/devices/claim', {
            method: 'POST',
            body: JSON.stringify({ mac_address: mac })
        });
        const data = await response.json();

        status.classList.remove('hidden');
        if (response.ok) {
            status.textContent = data.message;
            status.className = 'status-msg success';
            document.getElementById('claimMac').value = '';
            loadDevices();
        } else {
            status.textContent = data.error;
            status.className = 'status-msg error';
        }
        setTimeout(() => status.classList.add('hidden'), 5000);
    } catch (e) {
        status.textContent = "Błąd połączenia";
        status.className = 'status-msg error';
        status.classList.remove('hidden');
    }
}

// ==========================================
// SEKCJA 3: MODAL USUWANIA
// ==========================================

function openDeleteModal() {
    const modal = document.getElementById('deleteModal');
    const input = document.getElementById('deleteConfirmationInput');
    const btn = document.getElementById('confirmDeleteBtn');
    
    document.getElementById('modalDeviceMac').textContent = selectedDeviceMac;
    
    // Reset stanu
    input.value = '';
    btn.disabled = true;
    modal.classList.remove('hidden'); // Pokaż modal
    
    // Walidacja wpisywania
    input.oninput = function() {
        if (input.value.trim() === selectedDeviceMac) {
            btn.disabled = false;
        } else {
            btn.disabled = true;
        }
    };
    input.focus();
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
}

async function confirmDelete() {
    const input = document.getElementById('deleteConfirmationInput');
    if (input.value.trim() !== selectedDeviceMac) return;

    const btn = document.getElementById('confirmDeleteBtn');
    const originalText = btn.innerHTML;
    btn.textContent = "Usuwanie...";
    
    try {
        const response = await fetchAuth(`/devices/${selectedDeviceMac}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (response.ok) {
            closeDeleteModal();
            alert("✅ " + data.message);
            
            selectedDeviceMac = null;
            document.getElementById('deviceDetailsSection').classList.add('hidden');
            document.getElementById('emptyStateMessage').classList.remove('hidden');
            loadDevices();
        } else {
            alert("❌ Błąd: " + (data.error || "Nie udało się usunąć"));
            btn.innerHTML = originalText;
        }
    } catch (e) {
        alert("❌ Błąd połączenia z serwerem");
        btn.innerHTML = originalText;
    }
}

// ==========================================
// SEKCJA 4: WYKRESY (CHART.JS)
// ==========================================

async function loadMeasurements() {
    if (!selectedDeviceMac) return;

    try {
        const response = await fetchAuth(`/devices/${selectedDeviceMac}/measurements?limit=100`);
        if (!response) return;

        const data = await response.json();
        const measurements = data.measurements || [];

        if (measurements.length === 0) {
            document.getElementById('noDataMessage').classList.remove('hidden');
            document.getElementById('sensorTabs').innerHTML = '';
            if (chartInstance) chartInstance.destroy();
            return;
        }

        document.getElementById('noDataMessage').classList.add('hidden');

        // Grupowanie danych po typie
        cachedMeasurements = {};
        measurements.forEach(m => {
            if (!cachedMeasurements[m.sensor_type]) {
                cachedMeasurements[m.sensor_type] = [];
            }
            // Dodajemy na początek tablicy (unshift), żeby na wykresie czas szedł od lewej do prawej
            cachedMeasurements[m.sensor_type].unshift({
                time: new Date(m.timestamp * 1000).toLocaleTimeString('pl-PL'),
                value: parseFloat(m.value)
            });
        });

        // Generowanie przycisków
        renderSensorTabs(Object.keys(cachedMeasurements));

    } catch (e) {
        console.error("Błąd danych", e);
    }
}

function renderSensorTabs(sensorTypes) {
    const tabsContainer = document.getElementById('sensorTabs');
    tabsContainer.innerHTML = '';

    let activeSensor = sensorTypes[0];

    sensorTypes.forEach(type => {
        const btn = document.createElement('button');
        btn.textContent = type.toUpperCase();
        btn.className = `sensor-tab ${type === activeSensor ? 'active' : ''}`;
        
        btn.onclick = () => {
            document.querySelectorAll('.sensor-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            drawChart(type);
        };
        
        tabsContainer.appendChild(btn);
    });

    if (activeSensor) drawChart(activeSensor);
}

function drawChart(sensorType) {
    const ctx = document.getElementById('sensorChart').getContext('2d');
    const data = cachedMeasurements[sensorType];
    
    if (chartInstance) chartInstance.destroy();

    const labels = data.map(d => d.time);
    const values = data.map(d => d.value);

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Sensor: ${sensorType}`,
                data: values,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                pointRadius: 3,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { maxTicksLimit: 8 } },
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// ==========================================
// POMOCNICZE
// ==========================================

async function fetchAuth(endpoint, options = {}) {
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = `Bearer ${currentToken}`;
    options.headers['Content-Type'] = 'application/json';

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (response.status === 401) {
        handleLogout();
        return null;
    }
    return response;
}

function showAuth() {
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('dashboardSection').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    loadDevices();
}

function switchAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
    document.getElementById('authMessage').classList.add('hidden');

    if (tab === 'login') {
        document.querySelector('button[onclick="switchAuthTab(\'login\')"]').classList.add('active');
        document.getElementById('loginForm').classList.remove('hidden');
    } else {
        document.querySelector('button[onclick="switchAuthTab(\'register\')"]').classList.add('active');
        document.getElementById('registerForm').classList.remove('hidden');
    }
}

function showAuthMessage(msg, type) {
    const div = document.getElementById('authMessage');
    div.textContent = msg;
    div.className = `status-msg ${type}`;
    div.classList.remove('hidden');
}