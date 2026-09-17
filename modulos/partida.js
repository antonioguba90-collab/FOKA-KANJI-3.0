// ==========================================
// PARTIDAS GUARDADAS: serialización/restauración del estado de juego
// ==========================================
import { state } from './config.js';
import { guardarPartida, obtenerPartidaGuardada, borrarPartidaGuardada } from './persistencia.js';

const VERSION = 1;

export function crearSnapshotPartida(configuracion, lector, arcade) {
  return {
    version: VERSION,
    nivel: state.currentMode,
    estructura: state.gameStructure,
    configuracion: { ...configuracion },
    tiempoPartidaMs: state.tiempoPartidaMs || 0,
    state: {
      score: state.score, kills: state.kills,
      totalPalabrasNivel: state.totalPalabrasNivel,
      palabrasContadasGlobal: [...(state.palabrasContadasGlobalSet || [])],
      lockedId: state.lockedId, typedLen: state.typedLen,
      spawnTimer: state.spawnTimer, spawnInterval: state.spawnInterval, nextId: state.nextId,
      ultimoCarrilUsado: state.ultimoCarrilUsado, ultimoSpawn: state.ultimoSpawn || 0,
      enemies: (state.enemies || []).map(e => ({ ...e, fases: e.fases ? e.fases.map(f => ({ ...f })) : undefined })),
      bullets: (state.bullets || []).map(b => ({ ...b })),
      colaClonesPendientes: (state.colaClonesPendientes || []).map(c => ({
        contadorAciertos: c.contadorAciertos,
        datosOriginales: c.datosOriginales ? { ...c.datosOriginales } : null
      })),
      player: state.player ? { x: state.player.x, y: state.player.y, estadoAnim: state.player.estadoAnim, frameAnim: state.player.frameAnim } : null,
      estadisticasPartida: state.estadisticasPartida ? { ...state.estadisticasPartida, fases: [...(state.estadisticasPartida.fases || [])], hitos: [...(state.estadisticasPartida.hitos || [])] } : { fases: [], hitos: [] }
    },
    lector: {
      palabrasFaseActual: (lector.palabrasFaseActual || []).map(p => ({ ...p })),
      palabrasSuperadasFase: (lector.palabrasSuperadasFase || []).map(p => ({ ...p })),
      registroFasesPasadas: (lector.registroFasesPasadas || []).map(p => ({ ...p })),
      palabrasUnicasCompletadas: [...(lector.palabrasUnicasCompletadasSet || [])],
      romajiUsadoGlobal: [...(lector.romajiUsadoGlobal || [])],
      miniJefesDerrotados: lector.miniJefesDerrotados || 0,
      bossMode: !!lector.bossMode,
      activeBoss: lector.activeBoss ? { ...lector.activeBoss, fases: lector.activeBoss.fases?.map(f => ({ ...f })) } : null,
      bossTimerAyuda: lector.bossTimerAyuda || 0,
      cantidadNuevas: lector.CANTIDAD_NUEVAS,
      cantidadRepaso: lector.CANTIDAD_REPASO
    },
    arcade: {
      jefeCadaKills: arcade.jefeCadaKills,
      proximoHitoJefe: arcade.proximoHitoJefe
    }
  };
}

export function guardarPartidaActual(configuracion, lector, arcade) {
  if (!state.started || state.gameOver || state.isWinning) return;
  guardarPartida(state.currentMode, state.gameStructure, crearSnapshotPartida(configuracion, lector, arcade));
}

export function cargarPartidaGuardada(nivel, estructura) {
  const partida = obtenerPartidaGuardada(nivel, estructura);
  if (!partida || partida.version !== VERSION || partida.nivel !== nivel || partida.estructura !== estructura) return null;
  return partida;
}

export function restaurarSnapshotPartida(partida, lector, arcade) {
  if (!partida || partida.version !== VERSION) return false;
  const s = partida.state || {};
  state.score = Number(s.score) || 0;
  state.kills = Number(s.kills) || 0;
  state.totalPalabrasNivel = Number(s.totalPalabrasNivel) || 0;
  state.palabrasContadasGlobalSet = new Set(s.palabrasContadasGlobal || []);
  state.lockedId = s.lockedId ?? null; state.typedLen = Number(s.typedLen) || 0;
  state.spawnTimer = Number(s.spawnTimer) || 0; state.spawnInterval = Number(s.spawnInterval) || 180;
  state.nextId = Number(s.nextId) || 1; state.ultimoCarrilUsado = s.ultimoCarrilUsado || 'derecho';
  state.ultimoSpawn = Number(s.ultimoSpawn) || 0;
  state.enemies = Array.isArray(s.enemies) ? s.enemies : [];
  state.bullets = Array.isArray(s.bullets) ? s.bullets : [];
  state.particles = []; state.popups = [];
  state.colaClonesPendientes = Array.isArray(s.colaClonesPendientes) ? s.colaClonesPendientes : [];
  state.estadisticasPartida = s.estadisticasPartida ? { ...s.estadisticasPartida, fases: [...(s.estadisticasPartida.fases || [])], hitos: [...(s.estadisticasPartida.hitos || [])] } : { fases: [], hitos: [] };
  if (state.player && s.player) { Object.assign(state.player, s.player); }

  const l = partida.lector || {};
  lector.palabrasFaseActual = l.palabrasFaseActual || [];
  lector.palabrasSuperadasFase = l.palabrasSuperadasFase || [];
  lector.registroFasesPasadas = l.registroFasesPasadas || [];
  lector.palabrasUnicasCompletadasSet = new Set(l.palabrasUnicasCompletadas || []);
  lector.romajiUsadoGlobal = new Set(l.romajiUsadoGlobal || []);
  lector.miniJefesDerrotados = Number(l.miniJefesDerrotados) || 0;
  lector.bossMode = !!l.bossMode;
  lector.activeBoss = l.activeBoss || null;
  lector.bossTimerAyuda = Number(l.bossTimerAyuda) || 0;
  lector.CANTIDAD_NUEVAS = Number(l.cantidadNuevas) || lector.CANTIDAD_NUEVAS;
  lector.CANTIDAD_REPASO = Number(l.cantidadRepaso) || lector.CANTIDAD_REPASO;

  if (partida.arcade) {
    arcade.jefeCadaKills = Number(partida.arcade.jefeCadaKills) || arcade.jefeCadaKills;
    arcade.proximoHitoJefe = Number(partida.arcade.proximoHitoJefe) || arcade.proximoHitoJefe;
  }
  state.tiempoPartidaMs = Number(partida.tiempoPartidaMs) || 0;
  return true;
}

export { obtenerPartidaGuardada, borrarPartidaGuardada };
