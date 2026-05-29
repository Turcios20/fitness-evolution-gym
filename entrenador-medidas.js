const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : '';

let selectedClientId = null;
let selectedClientName = '';

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  initPage();
  loadClients();
  setupEventListeners();
  setTodayDate();
});

function initPage() {
  const session = window.GymApp ? window.GymApp.getSession() : JSON.parse(localStorage.getItem('gymSession') || 'null');
  if (!session || session.role?.toLowerCase() !== 'entrenador') {
    window.location.href = 'login.html';
    return;
  }

  const name = session.nombre_completo || session.username || 'E';
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  document.getElementById('userAvatar').textContent = initials;
}

function setupEventListeners() {
  document.getElementById('btnLogout').addEventListener('click', logout);
  document.getElementById('btnGuardar').addEventListener('click', guardarMedida);
  document.getElementById('btnLimpiar').addEventListener('click', limpiarFormulario);
  document.getElementById('btnGuardarObjetivo').addEventListener('click', guardarObjetivo);
}

function logout() {
  localStorage.removeItem('session');
  window.location.href = 'login.html';
}

function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('fecha').value = today;
}

async function loadClients() {
  try {
    const session = window.GymApp ? window.GymApp.getSession() : JSON.parse(localStorage.getItem('gymSession') || 'null');
    const trainerId = session?.id;

    if (!trainerId) {
      throw new Error('No se encontró ID de entrenador');
    }

    const response = await fetch(`${API_BASE}/api/trainer/${trainerId}/clientes`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error cargando clientes');
    }

    renderClients(data.clients || []);
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('clientsList').innerHTML = 
      `<p class="loading-text" style="color: #ff3232;">Error: ${error.message}</p>`;
  }
}

function renderClients(clients) {
  const container = document.getElementById('clientsList');
  const countEl = document.getElementById('clientsCount');

  if (!clients || clients.length === 0) {
    container.innerHTML = '<p class="loading-text">No tienes clientes asignados</p>';
    countEl.textContent = '0';
    return;
  }

  countEl.textContent = clients.length;

  container.innerHTML = clients.map(client => `
    <div class="client-item" data-id="${client.id_usuario}" data-name="${client.nombre_completo}">
      <span class="client-name">${client.nombre_completo}</span>
      <span class="client-email">${client.correo}</span>
    </div>
  `).join('');

  // Event listeners para selección de cliente
  container.querySelectorAll('.client-item').forEach(item => {
    item.addEventListener('click', () => selectClient(item));
  });
}

function selectClient(item) {
  document.querySelectorAll('.client-item').forEach(el => el.classList.remove('active'));
  item.classList.add('active');

  selectedClientId = parseInt(item.dataset.id);
  selectedClientName = item.dataset.name;

  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('medidaForm').style.display = 'block';
  document.getElementById('objetivoSection').style.display = 'block';
  document.getElementById('selectedClientName').textContent = selectedClientName;

  loadMedidas(selectedClientId);
  loadObjetivo(selectedClientId);
}

async function loadMedidas(userId) {
  try {
    const response = await fetch(`${API_BASE}/api/medidas/${userId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error cargando medidas');
    }

    renderMedidas(data.medidas || []);
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('medidasList').innerHTML = 
      `<p class="loading-text" style="color: #ff3232;">Error: ${error.message}</p>`;
  }
}

function renderMedidas(medidas) {
  const container = document.getElementById('medidasList');
  const countEl = document.getElementById('historialCount');
  const historialSection = document.getElementById('historialMedidas');

  if (!medidas || medidas.length === 0) {
    historialSection.style.display = 'none';
    return;
  }

  historialSection.style.display = 'block';
  countEl.textContent = medidas.length;

  container.innerHTML = medidas.map(medida => {
    const fecha = new Date(medida.fecha).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    return `
      <div class="medida-item" data-id="${medida.id_medida}">
        <div class="medida-fecha">${fecha}</div>
        <div class="medida-datos">
          <div class="medida-dato">
            <span class="medida-label">Peso</span>
            <span class="medida-valor">${medida.peso || '-'} kg</span>
          </div>
          <div class="medida-dato">
            <span class="medida-label">Pecho</span>
            <span class="medida-valor">${medida.pecho || '-'} cm</span>
          </div>
          <div class="medida-dato">
            <span class="medida-label">Cintura</span>
            <span class="medida-valor">${medida.cintura || '-'} cm</span>
          </div>
          <div class="medida-dato">
            <span class="medida-label">Cadera</span>
            <span class="medida-valor">${medida.cadera || '-'} cm</span>
          </div>
          <div class="medida-dato">
            <span class="medida-label">Brazos</span>
            <span class="medida-valor">${medida.brazos || '-'} cm</span>
          </div>
          <div class="medida-dato">
            <span class="medida-label">Piernas</span>
            <span class="medida-valor">${medida.piernas || '-'} cm</span>
          </div>
        </div>
        <div class="foto-upload">
          <label class="foto-label">📷 Fotografía de progreso</label>
          <input type="file" accept="image/jpeg,image/png" id="foto-${medida.id_medida}"
            onchange="subirFoto(${medida.id_medida}, this)">
          <span class="foto-status" id="foto-status-${medida.id_medida}"></span>
        </div>
        <div class="medida-actions">
          <button class="btn-edit" onclick="editarMedida(${medida.id_medida})">Editar</button>
          <button class="btn-delete" onclick="eliminarMedida(${medida.id_medida})">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');

  medidas.forEach(m => cargarFotoExistente(m.id_medida));
}

async function guardarMedida() {
  if (!selectedClientId) {
    alert('Selecciona un cliente primero');
    return;
  }

  const fecha = document.getElementById('fecha').value;
  const peso = document.getElementById('peso').value;

  if (!fecha || !peso) {
    alert('Fecha y peso son obligatorios');
    return;
  }

  const medida = {
    userId: selectedClientId,
    fecha,
    peso: parseFloat(peso),
    pecho: parseFloat(document.getElementById('pecho').value) || null,
    cintura: parseFloat(document.getElementById('cintura').value) || null,
    cadera: parseFloat(document.getElementById('cadera').value) || null,
    brazos: parseFloat(document.getElementById('brazos').value) || null,
    piernas: parseFloat(document.getElementById('piernas').value) || null
  };

  try {
    const response = await fetch(`${API_BASE}/api/medidas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(medida)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error guardando medida');
    }

    alert('✅ ' + data.message);
    limpiarFormulario();
    loadMedidas(selectedClientId);
  } catch (error) {
    alert('❌ ' + error.message);
  }
}

function limpiarFormulario() {
  document.getElementById('peso').value = '';
  document.getElementById('pecho').value = '';
  document.getElementById('cintura').value = '';
  document.getElementById('cadera').value = '';
  document.getElementById('brazos').value = '';
  document.getElementById('piernas').value = '';
  setTodayDate();
}

async function eliminarMedida(id) {
  if (!confirm('¿Estás seguro de eliminar esta medida?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/medidas/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error eliminando medida');
    }

    alert('✅ ' + data.message);
    loadMedidas(selectedClientId);
  } catch (error) {
    alert('❌ ' + error.message);
  }
}

function editarMedida(id) {
  alert('Función de edición en desarrollo. Por ahora puedes eliminar y crear una nueva medida.');
}

// ── OBJETIVO PERSONAL ────────────────────────────────────────────────────────

async function loadObjetivo(userId) {
  try {
    const response = await fetch(`${API_BASE}/api/objetivo/${userId}`);
    const data = await response.json();
    const el = document.getElementById('objetivoActual');
    el.textContent = data.objetivo || 'Sin objetivo asignado';
    if (data.objetivo) {
      document.getElementById('selectObjetivo').value = data.objetivo;
    }
  } catch (error) {
    console.error('Error cargando objetivo:', error);
  }
}

async function guardarObjetivo() {
  const objetivo = document.getElementById('selectObjetivo').value;
  if (!objetivo) {
    alert('Selecciona un objetivo primero');
    return;
  }

  const session = window.GymApp ? window.GymApp.getSession() : JSON.parse(localStorage.getItem('gymSession') || 'null');
  const rolRaw = session?.role || '';
  const rol = rolRaw.charAt(0).toUpperCase() + rolRaw.slice(1).toLowerCase();

  try {
    const response = await fetch(`${API_BASE}/api/objetivo/${selectedClientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objetivo, rol })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    document.getElementById('objetivoActual').textContent = objetivo;
    alert('✅ ' + data.message);
  } catch (error) {
    alert('❌ ' + error.message);
  }
}

// ── FOTOGRAFÍAS DE PROGRESO ───────────────────────────────────────────────────

async function cargarFotoExistente(medidaId) {
  try {
    const response = await fetch(`${API_BASE}/api/fotos/${medidaId}`);
    const data = await response.json();
    const statusEl = document.getElementById(`foto-status-${medidaId}`);
    if (data.fotos && data.fotos.length > 0) {
      statusEl.textContent = '✅ ' + data.fotos[0].nombre_archivo;
      statusEl.style.color = '#4caf50';
    }
  } catch (error) {
    console.error('Error cargando foto:', error);
  }
}

async function subirFoto(medidaId, input) {
  const file = input.files[0];
  if (!file) return;

  const tiposPermitidos = ['image/jpeg', 'image/png'];
  if (!tiposPermitidos.includes(file.type)) {
    alert('❌ Solo se permiten archivos JPG o PNG');
    input.value = '';
    return;
  }

  const maxTamano = 5 * 1024 * 1024;
  if (file.size > maxTamano) {
    alert('❌ El archivo no puede superar 5 MB');
    input.value = '';
    return;
  }

  const statusEl = document.getElementById(`foto-status-${medidaId}`);
  statusEl.textContent = 'Subiendo...';
  statusEl.style.color = 'var(--text-dim)';

  try {
    const response = await fetch(`${API_BASE}/api/fotos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medidaId,
        rutaArchivo: `/uploads/progreso/${selectedClientId}_${medidaId}_${file.name}`,
        nombreArchivo: file.name,
        mimeType: file.type,
        tamanoBytes: file.size
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    statusEl.textContent = '✅ ' + file.name;
    statusEl.style.color = '#4caf50';
  } catch (error) {
    statusEl.textContent = '❌ ' + error.message;
    statusEl.style.color = '#ff3232';
  }
}
