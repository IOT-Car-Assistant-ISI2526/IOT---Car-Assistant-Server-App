const API_BASE_URL = 'http://localhost:5000/api';

let selectedDeviceId = null;
let selectedDeviceMac = null;
document.addEventListener('DOMContentLoaded', () => {
    loadDevices();
    

    document.getElementById('refreshDevices').addEventListener('click', loadDevices);
    document.getElementById('sendAlert').addEventListener('click', sendAlert);
    document.getElementById('loadMeasurements').addEventListener('click', loadMeasurements);
});
async function loadDevices() {
    const devicesList = document.getElementById('devicesList');
    devicesList.innerHTML = '<p class="loading">Ładowanie urządzeń...</p>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/devices`);
        const data = await response.json();
        
        if (data.success && data.devices.length > 0) {
            devicesList.innerHTML = '';
            data.devices.forEach(device => {
                const deviceCard = createDeviceCard(device);
                devicesList.appendChild(deviceCard);
            });
        } else {
            devicesList.innerHTML = '<p class="empty-state">Brak urządzeń w bazie danych</p>';
        }
    } catch (error) {
        console.error('Error loading devices:', error);
        devicesList.innerHTML = '<p class="empty-state error">Błąd podczas ładowania urządzeń</p>';
    }
}
function createDeviceCard(device) {
    const card = document.createElement('div');
    card.className = 'device-card';
    card.dataset.deviceId = device.id;
    card.dataset.macAddress = device.mac_address;
    
    const lastSeen = device.last_seen ? new Date(device.last_seen).toLocaleString('pl-PL') : 'Nigdy';
    
    card.innerHTML = `
        <h3>Urządzenie #${device.id}</h3>
        <div class="device-info">
            <strong>Użytkownik:</strong> ${device.username}
        </div>
        <div class="device-info">
            <strong>Ostatnio widziane:</strong> ${lastSeen}
        </div>
        <div class="device-mac">MAC: ${device.mac_address}</div>
    `;
    
    card.addEventListener('click', () => {

        document.querySelectorAll('.device-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        
        selectedDeviceId = device.id;
        selectedDeviceMac = device.mac_address;
        

        document.getElementById('deviceMac').value = device.mac_address;
        

        document.getElementById('measurementsSection').style.display = 'block';
        

        loadMeasurements();
    });
    
    return card;
}
async function sendAlert() {
    const macAddress = document.getElementById('deviceMac').value.trim();
    const message = document.getElementById('alertMessage').value.trim() || 'BUZZ';
    const statusDiv = document.getElementById('alertStatus');
    
    if (!macAddress) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = 'Podaj MAC address urządzenia';
        return;
    }

    if (!/^[a-fA-F0-9]{12}$/.test(macAddress)) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = 'Nieprawidłowy format MAC address (musi składać się z 12 znaków hex)';
        return;
    }
    
    statusDiv.textContent = 'Wysyłanie alertu...';
    statusDiv.className = 'status-message';
    
    try {
        const response = await fetch(`${API_BASE_URL}/devices/send-alert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mac_address: macAddress,
                message: message
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            statusDiv.className = 'status-message success';
            statusDiv.textContent = `Alert wysłany pomyślnie na topic: ${data.topic} z wiadomością: "${data.message}"`;
        } else {
            statusDiv.className = 'status-message error';
            statusDiv.textContent = `Błąd: ${data.error}`;
        }
    } catch (error) {
        console.error('Error sending alert:', error);
        statusDiv.className = 'status-message error';
        statusDiv.textContent = 'Błąd podczas wysyłania alertu: ' + error.message;
    }
}async function loadMeasurements() {
    if (!selectedDeviceId) {
        const measurementsList = document.getElementById('measurementsList');
        measurementsList.innerHTML = '<p class="empty-state">Wybierz urządzenie, aby zobaczyć pomiary</p>';
        return;
    }
    
    const sensorType = document.getElementById('sensorType').value;
    const measurementsList = document.getElementById('measurementsList');
    measurementsList.innerHTML = '<p class="loading">Ładowanie pomiarów...</p>';
    
    try {
        const response = await fetch(
            `${API_BASE_URL}/devices/${selectedDeviceId}/measurements?sensor_type=${sensorType}&limit=100`
        );
        const data = await response.json();
        
        if (data.success && data.measurements.length > 0) {
            const sortedMeasurements = data.measurements.sort((a, b) => new Date(b.received_at) - new Date(a.received_at));
            const table = createMeasurementsTable(sortedMeasurements);
            measurementsList.innerHTML = '';
            measurementsList.appendChild(table);
        } else {
            measurementsList.innerHTML = '<p class="empty-state">Brak pomiarów dla tego urządzenia i typu sensora</p>';
        }
    } catch (error) {
        console.error('Error loading measurements:', error);
        measurementsList.innerHTML = '<p class="empty-state error">Błąd podczas ładowania pomiarów</p>';
    }
}function createMeasurementsTable(measurements) {
    const table = document.createElement('table');
    
    table.innerHTML = `
        <thead>
            <tr>
                <th>Timestamp (ESP32)</th>
                <th>Wartość</th>
                <th>Otrzymano</th>
            </tr>
        </thead>
        <tbody>
            ${measurements.map(m => `
                <tr>
                    <td>${m.timestamp}</td>
                    <td>${m.value}</td>
                    <td>${new Date(m.received_at).toLocaleString('pl-PL')}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    return table;
}