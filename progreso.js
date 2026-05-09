/**
 * progreso.js
 * Gestiona el registro y visualización de medidas de progreso del cliente
 */

document.addEventListener('DOMContentLoaded', () => {
  // Protege la ruta — solo clientes autenticados
  if (!GymApp.guardRoute('cliente')) return;

  const session = GymApp.getSession();

  // Elementos del DOM
  const formProgreso = document.getElementById('formProgreso');
  const inputFecha = document.getElementById('fecha');
  const inputPeso = document.getElementById('peso');
  const inputPecho = document.getElementById('pecho');
  const inputCintura = document.getElementById('cintura');
  const inputCadera = document.getElementById('cadera');
  const inputBrazos = document.getElementById('brazos');
  const inputPiernas = document.getElementById('piernas');

  // Elementos para mostrar última medición
  const ultimaFecha = document.getElementById('ultimaFecha');
  const ultimaPeso = document.getElementById('ultimaPeso');
  const ultimaPecho = document.getElementById('ultimaPecho');
  const ultimaCintura = document.getElementById('ultimaCintura');
  const ultimaCadera = document.getElementById('ultimaCadera');
  const ultimaBrazos = document.getElementById('ultimaBrazos');
  const ultimaPiernas = document.getElementById('ultimaPiernas');

  /**
   * Carga la última medición del cliente
   */
  async function loadLastMeasurement() {
    try {
      const data = await GymApp.api(`/api/client/${session.id}/measurements`);
      
      if (data.measurements && data.measurements.length > 0) {
        const lastMeasure = data.measurements[0];
        
        // Formatear la fecha
        const date = new Date(lastMeasure.date);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        ultimaFecha.textContent = `${day}/${month}/${year}`;
        ultimaPeso.textContent = lastMeasure.weight ? `${lastMeasure.weight} kg` : '-- kg';
        ultimaPecho.textContent = lastMeasure.chest ? `${lastMeasure.chest} cm` : '-- cm';
        ultimaCintura.textContent = lastMeasure.waist ? `${lastMeasure.waist} cm` : '-- cm';
        ultimaCadera.textContent = lastMeasure.hips ? `${lastMeasure.hips} cm` : '-- cm';
        ultimaBrazos.textContent = lastMeasure.arms ? `${lastMeasure.arms} cm` : '-- cm';
        ultimaPiernas.textContent = lastMeasure.legs ? `${lastMeasure.legs} cm` : '-- cm';
      }
    } catch (error) {
      console.error('Error cargando última medición:', error);
      GymApp.toast(`Error cargando mediciones: ${error.message}`, 'error');
    }
  }

  /**
   * Guarda una nueva medición
   */
  async function saveMeasurement(event) {
    event.preventDefault();

    try {
      // Obtener valores del formulario
      const measurementData = {
        fecha: inputFecha.value,
        peso: inputPeso.value ? Number(inputPeso.value) : null,
        pecho: inputPecho.value ? Number(inputPecho.value) : null,
        cintura: inputCintura.value ? Number(inputCintura.value) : null,
        cadera: inputCadera.value ? Number(inputCadera.value) : null,
        brazos: inputBrazos.value ? Number(inputBrazos.value) : null,
        piernas: inputPiernas.value ? Number(inputPiernas.value) : null
      };

      // Validación: al menos una medida además de la fecha
      if (!measurementData.peso && !measurementData.pecho && !measurementData.cintura && 
          !measurementData.cadera && !measurementData.brazos && !measurementData.piernas) {
        GymApp.toast('Por favor, ingresa al menos una medida.', 'error');
        return;
      }

      // Enviar al servidor usando GymApp.api
      await GymApp.api(`/api/client/${session.id}/measurements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(measurementData)
      });
      
      // Mostrar mensaje de éxito
      GymApp.toast('Medidas registradas correctamente.', 'success');
      
      // Limpiar formulario
      formProgreso.reset();
      
      // Recargar últimas mediciones
      await loadLastMeasurement();
    } catch (error) {
      console.error('Error al guardar medidas:', error);
      GymApp.toast(`Error: ${error.message}`, 'error');
    }
  }

  /**
   * Establece la fecha de hoy como valor predeterminado
   */
  function setTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    inputFecha.value = `${year}-${month}-${day}`;
  }

  // Inicialización
  setTodayDate();
  loadLastMeasurement();
  
  if (formProgreso) {
    formProgreso.addEventListener('submit', saveMeasurement);
  }
});

