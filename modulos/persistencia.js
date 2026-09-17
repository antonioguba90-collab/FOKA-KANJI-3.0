// ==========================================
// PERSISTENCIA: RÉCORDS Y MEMORIA DE PALABRAS (SRS)
// ==========================================
// Módulo hoja: no importa nada del juego. Guarda en localStorage:
//  - fokanji.records : récord de puntos por estructura+modo
//  - fokanji.srs     : nivel de repetición espaciada por palabra

const CLAVE_RECORDS = "fokanji.records";
const CLAVE_SRS = "fokanji.srs";
const CLAVE_PARTIDAS_GUARDADAS = "fokanji.partidasGuardadas";

const DIA_MS = 24 * 60 * 60 * 1000;
// Intervalo (en días) hasta el próximo repaso según el nivel alcanzado
const INTERVALOS_SRS_DIAS = [0, 1, 2, 4, 8, 16, 32];
// Nivel mínimo para considerar una palabra "dominada"
export const NIVEL_DOMINADA = 1;

// La clave única de palabra usada en todo el juego
export function claveDePalabra(p) {
  return `${p.romaji}_${p.jp}_${p.es}`;
}

function leerJSON(clave) {
  try { return JSON.parse(localStorage.getItem(clave) || "{}"); }
  catch (e) { return {}; }
}

function escribirJSON(clave, obj) {
  try { localStorage.setItem(clave, JSON.stringify(obj)); } catch (e) {}
}

// ------------------------------------------
// PARTIDAS GUARDADAS
// Una partida guardada se identifica por nivel + estructura.
// Solo existe mientras la partida siga activa; juego.js la elimina al
// terminar por victoria o Game Over.
// ------------------------------------------
function clavePartidaGuardada(nivel, estructura) {
  return `${String(nivel ?? '')}:${String(estructura ?? '')}`;
}

export function guardarPartida(nivel, estructura, partida) {
  if (!partida || !nivel || !estructura) return false;
  const todas = leerJSON(CLAVE_PARTIDAS_GUARDADAS);
  todas[clavePartidaGuardada(nivel, estructura)] = {
    ...partida,
    nivel: String(nivel),
    estructura: String(estructura),
    guardadaEn: Date.now()
  };
  escribirJSON(CLAVE_PARTIDAS_GUARDADAS, todas);
  return true;
}

export function obtenerPartidaGuardada(nivel, estructura) {
  if (!nivel || !estructura) return null;
  const todas = leerJSON(CLAVE_PARTIDAS_GUARDADAS);
  return todas[clavePartidaGuardada(nivel, estructura)] || null;
}

export function borrarPartidaGuardada(nivel, estructura) {
  if (!nivel || !estructura) return;
  const todas = leerJSON(CLAVE_PARTIDAS_GUARDADAS);
  const clave = clavePartidaGuardada(nivel, estructura);
  if (Object.prototype.hasOwnProperty.call(todas, clave)) {
    delete todas[clave];
    escribirJSON(CLAVE_PARTIDAS_GUARDADAS, todas);
  }
}

// ------------------------------------------
// RÉCORDS DE PUNTUACIÓN
// Un récord pertenece a una combinación exacta de configuración.
// Regla: mayor puntuación; a igualdad de puntos, menor tiempo.
// ------------------------------------------
function normalizarCombinacion(combinacion = {}) {
  return {
    nivel: String(combinacion.nivel ?? ''),
    modo: String(combinacion.modo ?? ''),
    dificultad: String(combinacion.dificultad ?? combinacion.velocidadEnemigos ?? 'normal'),
    maxEnemigos: Number(combinacion.maxEnemigos ?? 6),
    palabrasPorFase: Number(combinacion.palabrasPorFase ?? 0),
    palabrasGuardian: Number(combinacion.palabrasGuardian ?? 0),
    palabrasJefeFinal: Number(combinacion.palabrasJefeFinal ?? 0),
    frasesJefeFinal: Number(combinacion.frasesJefeFinal ?? 0),
    arcadeKillsGuardian: Number(combinacion.arcadeKillsGuardian ?? 0)
  };
}

export function crearClaveCombinacion(combinacion = {}) {
  const c = normalizarCombinacion(combinacion);
  return [
    c.nivel, c.modo, c.dificultad, c.maxEnemigos,
    c.palabrasPorFase, c.palabrasGuardian, c.palabrasJefeFinal,
    c.frasesJefeFinal, c.arcadeKillsGuardian
  ].join(':');
}

export function obtenerDescripcionCombinacion(combinacion = {}) {
  const c = normalizarCombinacion(combinacion);
  const partes = [
    `Nivel: ${c.nivel}`,
    `Modo: ${c.modo}`,
    `Velocidad: ${c.dificultad}`,
    `Máx. enemigos: ${c.maxEnemigos}`
  ];
  if (c.modo === 'fases') {
    partes.push(`Palabras/fase: ${c.palabrasPorFase}`);
    partes.push(`Palabras/guardián: ${c.palabrasGuardian}`);
    partes.push(`Palabras jefe: ${c.palabrasJefeFinal}`);
    partes.push(`Frases jefe: ${c.frasesJefeFinal}`);
  } else if (c.modo === 'arcade') {
    partes.push(`Guardián cada: ${c.arcadeKillsGuardian} aciertos`);
  }
  return partes.join(' · ');
}

function esMejorResultado(puntos, tiempoMs, previo) {
  if (!previo) return puntos > 0;
  const puntosPrevios = Number(previo.puntos) || 0;
  const tiempo = Number.isFinite(Number(tiempoMs)) ? Number(tiempoMs) : Number.POSITIVE_INFINITY;
  const tiempoPrevio = Number.isFinite(Number(previo.tiempoMs)) ? Number(previo.tiempoMs) : Number.POSITIVE_INFINITY;
  return puntos > puntosPrevios || (puntos === puntosPrevios && puntos > 0 && tiempo < tiempoPrevio);
}

export function obtenerRecord(combinacion) {
  return leerJSON(CLAVE_RECORDS)[crearClaveCombinacion(combinacion)] || null;
}

// Registra puntuación + tiempo y devuelve { record, esNuevo }.
export function registrarPuntuacion(combinacion, puntos, tiempoMs) {
  const records = leerJSON(CLAVE_RECORDS);
  const clave = crearClaveCombinacion(combinacion);
  const previo = records[clave] || null;
  const resultado = {
    ...normalizarCombinacion(combinacion),
    puntos: Number(puntos) || 0,
    tiempoMs: Math.max(0, Number(tiempoMs) || 0),
    actualizadoEn: Date.now()
  };

  if (esMejorResultado(resultado.puntos, resultado.tiempoMs, previo)) {
    records[clave] = resultado;
    escribirJSON(CLAVE_RECORDS, records);
    return { record: resultado, esNuevo: true };
  }
  return { record: previo, esNuevo: false };
}

// ------------------------------------------
// RESULTADOS DE PARTIDA
// ------------------------------------------
const CLAVE_RESULTADOS_PARTIDA = "fokanji.resultadosPartida";

function claveResultadoPartida(nivel, modo, dificultad) {
  return `${nivel}:${modo}:${dificultad}`;
}

export function obtenerUltimosResultadosPartida(nivel, modo) {
  const todos = leerJSON(CLAVE_RESULTADOS_PARTIDA);
  const salida = {};
  for (const dificultad of ["facil", "normal", "dificil", "extremo"]) {
    salida[dificultad] = todos[claveResultadoPartida(nivel, modo, dificultad)] || null;
  }
  return salida;
}

export function registrarResultadoPartida(resultado) {
  if (!resultado?.nivel || !resultado?.modo || !resultado?.dificultad) return;
  const todos = leerJSON(CLAVE_RESULTADOS_PARTIDA);
  todos[claveResultadoPartida(resultado.nivel, resultado.modo, resultado.dificultad)] = resultado;
  escribirJSON(CLAVE_RESULTADOS_PARTIDA, todos);
}

// Obtiene el récord exacto de una combinación desde el sistema único de récords.
export function obtenerRecordCombinacion(combinacion) {
  return obtenerRecord(combinacion);
}

// ------------------------------------------
// SRS (REPETICIÓN ESPACIADA)
// ------------------------------------------
// Cada entrada: { n: nivel, prox: timestamp del próximo repaso }
let srs = leerJSON(CLAVE_SRS);

// Acierto: sube de nivel y aleja el próximo repaso
export function registrarAciertoPalabra(clave) {
  const entrada = srs[clave] || { n: 0, prox: 0 };
  entrada.n = Math.min(entrada.n + 1, INTERVALOS_SRS_DIAS.length - 1);
  entrada.prox = Date.now() + INTERVALOS_SRS_DIAS[entrada.n] * DIA_MS;
  srs[clave] = entrada;
  escribirJSON(CLAVE_SRS, srs);
}

// Fallo (el enemigo con esa palabra te elimina): baja de nivel y la marca pendiente ya
export function registrarFalloPalabra(clave) {
  const entrada = srs[clave];
  if (!entrada) return;
  entrada.n = Math.max(0, entrada.n - 1);
  entrada.prox = Date.now();
  escribirJSON(CLAVE_SRS, srs);
}

function esRepasoPendiente(clave) {
  const entrada = srs[clave];
  return !!entrada && entrada.n >= NIVEL_DOMINADA && Date.now() >= entrada.prox;
}

// Del pool dado, devuelve hasta `max` palabras con repaso pendiente (las más atrasadas primero)
export function seleccionarRepasoPendiente(pool, max) {
  return pool
    .filter(p => esRepasoPendiente(claveDePalabra(p)))
    .sort((a, b) => srs[claveDePalabra(a)].prox - srs[claveDePalabra(b)].prox)
    .slice(0, max);
}

// Cuántas palabras del pool están dominadas (nivel >= NIVEL_DOMINADA)
export function contarDominadas(pool) {
  return pool.filter(p => (srs[claveDePalabra(p)] || {}).n >= NIVEL_DOMINADA).length;
}

export function contarDominadasGlobal() {
  return Object.values(srs).filter(e => e.n >= NIVEL_DOMINADA).length;
}

// Borra récords y memoria SRS (usado desde Ajustes)
export function borrarProgreso() {
  srs = {};
  try {
    localStorage.removeItem(CLAVE_SRS);
    localStorage.removeItem(CLAVE_RECORDS);
    localStorage.removeItem(CLAVE_RESULTADOS_PARTIDA);
    localStorage.removeItem(CLAVE_PARTIDAS_GUARDADAS);
  } catch (e) {}
}
