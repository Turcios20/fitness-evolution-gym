/**
 * evolucion-cliente.js
 * Gestiona el historial completo de progreso y comparativas
 */

document.addEventListener('DOMContentLoaded', () => {
  // Protege la ruta — solo clientes autenticados
  if (!GymApp.guardRoute('cliente')) return;

  const session = GymApp.getSession();

  // Elementos del DOM
  const objetivoPersonal = document.getElementById('objetivoPersonal');
  const tablaComparativa = document.getElementById('tablaComparativa');
  const historialList = document.getElementById('historialList');

  /**
   * Carga el objetivo personal del cliente desde los ajustes
   */
  async function loadObjetivoPersonal() {
    try {
      const data = await GymApp.api(`/api/settings?username=${encodeURIComponent(session.username)}`);
      
      if (data.settings && data.settings.objetivo_personal) {
        objetivoPersonal.textContent = data.settings.objetivo_personal;
      }
    } catch (error) {
      console.error('Error cargando objetivo:', error);
      // No interrumpir si falla
    }
  }

  /**
   * Formatea un número con 2 decimales
   */
  function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    return parseFloat(num).toFixed(2);
  }

  /**
   * Calcula la diferencia entre dos valores
   */
  function calcularDiferencia(primero, reciente) {
    if (!primero || !reciente) return null;
    return parseFloat(reciente) - parseFloat(primero);
  }

  /**
   * Determina si una mejora es positiva o negativa
   * Para peso: menor es mejor (negativo = mejora)
   * Para otras medidas: menor es mejor (negativo = mejora)
   */
  function esMejora(diferencia, medida = 'general') {
    if (diferencia === null || diferencia === 0) return 0; // Sin cambio
    
    // Para todas las medidas, menor es mejor
    return diferencia < 0 ? 1 : -1; // 1 = mejora, -1 = empeoramiento, 0 = igual
  }

  /**
   * Carga todas las mediciones y crea la comparativa
   */
  async function loadMeasurements() {
    try {
      const data = await GymApp.api(`/api/client/${session.id}/measurements`);
      
      if (!data.measurements || data.measurements.length === 0) {
        tablaComparativa.innerHTML = '<tr><td colspan="5" class="loading-row">No hay mediciones registradas</td></tr>';
        historialList.innerHTML = '<div class="error-message">No hay datos para mostrar</div>';
        return;
      }

      const mediciones = data.measurements; // Ya vienen ordenadas DESC por fecha
      const primera = mediciones[mediciones.length - 1]; // La más antigua
      const reciente = mediciones[0]; // La más reciente

      // Construir comparativa
      renderComparativa(primera, reciente);
      
      // Construir historial
      renderHistorial(mediciones);

    } catch (error) {
      console.error('Error cargando mediciones:', error);
      tablaComparativa.innerHTML = `<tr><td colspan="5" class="loading-row">Error: ${error.message}</td></tr>`;
      historialList.innerHTML = `<div class="error-message">Error al cargar el historial: ${error.message}</div>`;
    }
  }

  /**
   * Renderiza la tabla comparativa
   */
  function renderComparativa(primera, reciente) {
    const medidas = [
      { clave: 'peso', label: 'Peso', unidad: 'kg' },
      { clave: 'pecho', label: 'Pecho', unidad: 'cm' },
      { clave: 'cintura', label: 'Cintura', unidad: 'cm' },
      { clave: 'cadera', label: 'Cadera', unidad: 'cm' },
      { clave: 'brazos', label: 'Brazos', unidad: 'cm' },
      { clave: 'piernas', label: 'Piernas', unidad: 'cm' }
    ];

    const mapKeys = {
      peso: 'weight',
      pecho: 'chest',
      cintura: 'waist',
      cadera: 'hips',
      brazos: 'arms',
      piernas: 'legs'
    };

    let html = '';

    medidas.forEach(medida => {
      const key = mapKeys[medida.clave];
      const valorPrimera = primera[key];
      const valorReciente = reciente[key];

      if (!valorPrimera || !valorReciente) {
        return; // Saltar si no hay datos
      }

      const diferencia = calcularDiferencia(valorPrimera, valorReciente);
      const mejora = esMejora(diferencia);

      let clase = 'diferencia-neutra';
      let icon = '';
      let labelMejora = 'Sin cambio';

      if (mejora === 1) {
        clase = 'diferencia-positiva';
        icon = '↓'; // Mejoró (disminuyó)
        labelMejora = 'Mejoró ✓';
      } else if (mejora === -1) {
        clase = 'diferencia-negativa';
        icon = '↑'; // Empeoró (aumentó)
        labelMejora = 'Empeoró ✗';
      }

      html += `
        <tr>
          <td class="medida-nombre">${medida.label}</td>
          <td class="medida-valor">${formatNumber(valorPrimera)} ${medida.unidad}</td>
          <td class="medida-valor">${formatNumber(valorReciente)} ${medida.unidad}</td>
          <td class="medida-valor ${clase}">${diferencia < 0 ? '-' : '+'}${Math.abs(diferencia).toFixed(2)} ${medida.unidad}</td>
          <td class="medida-valor">
            <span class="cambio-icon ${mejora === 1 ? 'cambio-mejoró' : mejora === -1 ? 'cambio-empeoró' : 'cambio-igual'}">
              ${icon || '−'}
            </span>
            ${labelMejora}
          </td>
        </tr>
      `;
    });

    tablaComparativa.innerHTML = html;
  }

  /**
   * Renderiza el historial de mediciones
   */
  function renderHistorial(mediciones) {
    if (mediciones.length === 0) {
      historialList.innerHTML = '<div class="loading-message">No hay mediciones</div>';
      return;
    }

    let html = '';

    for (let i = 0; i < mediciones.length; i++) {
      const medicion = mediciones[i];
      const siguiente = i > 0 ? mediciones[i - 1] : null;

      // Formatear fecha
      const date = new Date(medicion.date);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const fechaFormato = `${day}/${month}/${year}`;

      // Crear las tarjetas de medidas
      const medidas = [
        { clave: 'weight', label: 'Peso', unidad: 'kg' },
        { clave: 'chest', label: 'Pecho', unidad: 'cm' },
        { clave: 'waist', label: 'Cintura', unidad: 'cm' },
        { clave: 'hips', label: 'Cadera', unidad: 'cm' },
        { clave: 'arms', label: 'Brazos', unidad: 'cm' },
        { clave: 'legs', label: 'Piernas', unidad: 'cm' }
      ];

      let medidasHtml = '';

      medidas.forEach(med => {
        const valor = medicion[med.clave];
        
        if (!valor) return;

        let claseCard = '';
        let cambioHtml = '';

        if (siguiente && siguiente[med.clave]) {
          const valorSiguiente = medicion[med.clave];
          const valorAnterior = siguiente[med.clave];
          const diferencia = calcularDiferencia(valorAnterior, valorSiguiente);

          if (diferencia !== null) {
            const mejora = esMejora(diferencia);

            if (mejora === 1) {
              claseCard = 'mejoró';
              cambioHtml = `<div class="medida-card-cambio">↓ ${Math.abs(diferencia).toFixed(2)} (mejor)</div>`;
            } else if (mejora === -1) {
              claseCard = 'empeoró';
              cambioHtml = `<div class="medida-card-cambio">↑ ${Math.abs(diferencia).toFixed(2)} (peor)</div>`;
            }
          }
        }

        medidasHtml += `
          <div class="medida-card ${claseCard}">
            <div class="medida-card-label">${med.label}</div>
            <div class="medida-card-valor">${formatNumber(valor)}</div>
            <div style="font-size: 11px; color: #999;">${med.unidad}</div>
            ${cambioHtml}
          </div>
        `;
      });

      html += `
        <div class="historial-item">
          <div class="historial-fecha">
            <span class="historial-fecha-badge">${fechaFormato}</span>
            ${i === 0 ? '<span style="color: #FF8C00; font-size: 12px;">(Más Reciente)</span>' : ''}
          </div>
          <div class="historial-medidas">
            ${medidasHtml}
          </div>
        </div>
      `;
    }

    historialList.innerHTML = html;
  }

  // Inicialización
  loadObjetivoPersonal();
  loadMeasurements();
});
