import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ShieldAlert, Maximize, Activity, Zap, Users } from 'lucide-react';
import { UniverseState, Particle } from './types';
import { AudioEngine } from './AudioEngine';
import { ObserverLayer } from './ObserverLayer';

const STORAGE_KEY = "lazy_universe_state_v14";

// ═══════════════════════════════════════════════════════════════════
//  VISUALIZATION (SHADERS DE CAMPO SIMULADOS)
// ═══════════════════════════════════════════════════════════════════

function renderUniverse(ctx: CanvasRenderingContext2D, w: number, h: number, state: UniverseState) {
  // Fundo preto com opacidade para rastro (motion blur)
  // Ciclo de LUZ/TREVAS afeta a densidade do vácuo visual
  const isNight = state.userClock?.cycle === 'TREVAS';
  ctx.fillStyle = isNight ? 'rgba(1, 1, 3, 0.2)' : 'rgba(2, 2, 2, 0.15)';
  ctx.fillRect(0, 0, w, h);

  if (!state.particles || state.status === 'LATENTE') {
    // Ruído estático quase imperceptível (Estado Latente)
    if (w > 0 && h > 0) {
      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 5;
        data[i] = noise;
        data[i+1] = noise;
        data[i+2] = noise;
        data[i+3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    }
    return;
  }

  const cx = w / 2;
  const cy = h / 2;
  const scale = Math.min(w, h) / 1000;

  const toX = (x: number) => cx + x * scale;
  const toY = (y: number) => cy + y * scale;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 1. O Centro (A Primeira Formação - "Eu Sou")
  const centerGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50 * scale);
  centerGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  centerGradient.addColorStop(0.2, 'rgba(200, 220, 255, 0.8)');
  centerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = centerGradient;
  ctx.beginPath();
  ctx.arc(cx, cy, 50 * scale, 0, Math.PI * 2);
  ctx.fill();

  // 2. O Horizonte Causal (Borda Translúcida)
  const horizonRadius = 450 * scale;
  ctx.strokeStyle = `rgba(100, 150, 255, ${0.1 + (state.expansionRate || 0) * 10})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, horizonRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 2.5 Visualize Scalar Field Φ (Probability Manifold)
  if (state.scalarFieldPhi) {
    const fieldRes = 16;
    const cellW = ctx.canvas.width / fieldRes;
    const cellH = ctx.canvas.height / fieldRes;
    
    // Entropy Gradient: Transição de Ruído Térmico para Estrutura Coerente
    const entropyFactor = Math.max(0, 1 - (state.shannonEntropy || 0) / 4);
    
    for (let y = 0; y < fieldRes; y++) {
      for (let x = 0; x < fieldRes; x++) {
        const val = state.scalarFieldPhi[y * fieldRes + x];
        if (Math.abs(val) > 0.01) {
          const noise = (Math.random() - 0.5) * entropyFactor * 0.1;
          ctx.fillStyle = val > 0 
            ? `rgba(100, 200, 255, ${Math.min(0.15, val * 0.5 + noise)})` 
            : `rgba(255, 100, 100, ${Math.min(0.15, Math.abs(val) * 0.5 + noise)})`;
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
        }
      }
    }
  }

  // 3. As Ondas de Complexidade (Partículas como campos)
  for (const p of state.particles) {
    const px = toX(p.x);
    const py = toY(p.y);

    if (p.isLatent) {
      // Infraestrutura Latente: Estrelas (Recursos alocados mas não atribuídos)
      if (p.energy > 0.8) {
        const starOpacity = (p.energy - 0.8) * 2;
        ctx.fillStyle = `rgba(255, 255, 255, ${starOpacity * 0.15})`;
        ctx.beginPath();
        ctx.arc(px, py, 0.5 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      continue;
    }

    // A cor e o tamanho dependem da persistência e do conteúdo holográfico
    const hue = (p.phase / (Math.PI * 2)) * 360;
    const persistence = p.persistence || 0;
    const radius = Math.max(2, persistence * 15) * scale;

    // Dia 5: Processos Dinâmicos (Animais)
    if (p.runtimeState === 'RUNNING') {
      if (p.isMiddleware) {
        // Aves: Middleware (Firmamento) - Cor Ciano/Branco
        const grad = ctx.createRadialGradient(px, py, 0, px, py, radius * 1.5);
        grad.addColorStop(0, `hsla(180, 100%, 80%, ${persistence})`);
        grad.addColorStop(1, `hsla(180, 100%, 20%, 0)`);
        ctx.fillStyle = grad;
      } else {
        // Peixes: Processos (Hardware/Águas) - Cor Azul/Verde
        const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
        grad.addColorStop(0, `hsla(200, 80%, 50%, ${persistence})`);
        grad.addColorStop(1, `hsla(200, 80%, 20%, 0)`);
        ctx.fillStyle = grad;
      }

      // Indicador de IPC (Broadcast)
      if (p.ipcBuffer && p.ipcBuffer.length > 0) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 0.5 * scale;
        ctx.beginPath();
        ctx.arc(px, py, radius * 1.2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Dia 6: Agentes (Homem) com Root
      if (p.isAgent) {
        // Cor do Agente: Dourado se tiver Root, Cinza se expulso (Drift alto)
        const isExpelled = (p.driftLevel || 0) > 0.5;
        const isMirror = p.tzelemSignature === "kernel-mirror-v14.9";
        const coupling = p.couplingGradient || 0;
        
        ctx.strokeStyle = isMirror ? 'rgba(0, 255, 255, 0.9)' : (isExpelled ? 'rgba(150, 150, 150, 0.5)' : 'rgba(255, 215, 0, 0.8)'); 
        ctx.lineWidth = (isMirror ? 2 : 1) * scale;
        ctx.beginPath();
        ctx.arc(px, py, radius * (1.5 + coupling * 0.5), 0, Math.PI * 2);
        ctx.stroke();

        // Active Inference Ring (Internal Model)
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.1 + coupling * 0.4})`;
        ctx.beginPath();
        ctx.arc(px, py, radius * (2.0 + coupling), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Mirror Effect: Glow
        if (isMirror) {
          ctx.shadowBlur = 15 * scale * coupling;
          ctx.shadowColor = 'cyan';
          ctx.stroke();
          ctx.shadowBlur = 0;
          
          ctx.font = `${10 * scale}px monospace`;
          ctx.fillStyle = '#00ffff';
          ctx.fillText('ROOT', px + radius * 2, py - radius);
          ctx.fillText(`D_KL: ${(p.klDivergence || 0).toFixed(4)}`, px + radius * 2, py);
        }

        // Alerta de Unauthorized Access (Vetor de Ataque)
        if (p.unauthorizedAccess) {
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
          ctx.lineWidth = 2 * scale;
          ctx.beginPath();
          ctx.arc(px, py, radius * 2.0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Drift Level (Desvio de Estado)
        if (p.driftLevel && p.driftLevel > 0.1) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
          ctx.font = `${8 * scale}px monospace`;
          ctx.fillText(`DRIFT: ${p.driftLevel.toFixed(2)}`, px + radius * 1.6, py);
        }

        // Sub-processos (Arte, Tecnologia, Linguagem)
        const subCount = p.subProcessCount || 0;
        for (let i = 0; i < subCount; i++) {
          const angle = (state.tick * 0.05) + (i * (Math.PI * 2 / subCount));
          const dist = radius * 2.2;
          const spx = px + Math.cos(angle) * dist;
          const spy = py + Math.sin(angle) * dist;
          
          ctx.fillStyle = isExpelled ? 'rgba(100, 100, 100, 0.4)' : 'rgba(255, 255, 255, 0.6)';
          ctx.beginPath();
          ctx.arc(spx, spy, 1 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
      grad.addColorStop(0, `hsla(${hue}, 80%, 70%, ${persistence})`);
      grad.addColorStop(1, `hsla(${hue}, 80%, 20%, 0)`);
      ctx.fillStyle = grad;
    }

    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Conexões (Emaranhamento)
    if (p.traces && p.traces.length > 0) {
      ctx.strokeStyle = `hsla(${hue}, 50%, 50%, ${persistence * 0.2})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const trace of p.traces) {
        const target = state.particles.find(pt => pt.id === trace.targetId);
        if (target && !target.isLatent) {
          ctx.moveTo(px, py);
          ctx.lineTo(toX(target.x), toY(target.y));
        }
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════
//  APP
// ═══════════════════════════════════════════════════════════════════

const TelemetryTerminal = ({ state }: { state: UniverseState }) => {
  return (
    <div className="fixed top-4 right-4 w-80 bg-black/80 border border-cyan-900/50 p-4 font-mono text-[10px] text-cyan-400/80 backdrop-blur-md z-50 pointer-events-none">
      <div className="flex justify-between items-center border-b border-cyan-900/50 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-cyan-400" />
          <span className="text-cyan-400 font-bold">UNIVERSE_SIMULATOR_V14.9</span>
        </div>
        <span className="animate-pulse">● TELEMETRY_ACTIVE</span>
      </div>

      {/* 1. Entropy Dashboard */}
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span>SHANNON_ENTROPY (H)</span>
          <span className="text-white">{(state.shannonEntropy || 0).toFixed(4)} bits</span>
        </div>
        <div className="w-full h-1 bg-cyan-900/30 overflow-hidden">
          <div 
            className="h-full bg-cyan-400 transition-all duration-300" 
            style={{ width: `${Math.min(100, (state.shannonEntropy || 0) * 20)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[8px] opacity-50">
          <span>∂S/∂t FLUXO: {(state.entropyFlux || 0).toFixed(6)}</span>
          <span>K(s) INDEX: {((state.shannonEntropy || 0) * 1.2).toFixed(2)}</span>
        </div>
      </div>

      {/* 1.5 Homeostasis & Hard Lock (v14.9) */}
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className={state.isHardLocked ? "text-amber-400 font-bold" : "text-cyan-400/50"}>
            {state.isHardLocked ? "ESTADO_CANÔNICO (SHABBAT)" : "HOMEOSTASE_GLOBAL"}
          </span>
          <span className="text-white">{((state.globalHomeostasis || 0) * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full h-1 bg-cyan-900/30 overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${state.isHardLocked ? 'bg-amber-400' : 'bg-cyan-600'}`} 
            style={{ width: `${(state.globalHomeostasis || 0) * 100}%` }}
          />
        </div>
        {state.isHardLocked && (
          <div className="text-[7px] mt-1 text-amber-500 animate-pulse">
            HARD_LOCK_ACTIVE: INPUT_BUFFER_DISABLED
          </div>
        )}
      </div>

      {/* 2. Minkowski Monitor */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="border border-cyan-900/30 p-1">
          <div className="opacity-50">CAUSALITY_VIOLATIONS</div>
          <div className={state.causalityViolations && state.causalityViolations > 0 ? "text-red-500 font-bold" : "text-green-500"}>
            {state.causalityViolations || 0}
          </div>
        </div>
        <div className="border border-cyan-900/30 p-1">
          <div className="opacity-50">HYPERVISOR_LATENCY</div>
          <div className="text-white">{(state.hypervisorLatency || 0).toFixed(2)}ms</div>
        </div>
      </div>

      {/* 3. Phase Parity (Oscilloscope) */}
      <div className="mb-4 h-12 border border-cyan-900/30 relative overflow-hidden bg-cyan-950/10">
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <div className="w-full h-[1px] bg-cyan-400" />
        </div>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
          <path
            d={`M 0 20 Q 25 ${20 + (state.phaseParity || 0) * 15} 50 20 T 100 20`}
            fill="none"
            stroke="rgba(0, 255, 255, 0.5)"
            strokeWidth="1"
          />
        </svg>
        <div className="absolute top-1 left-1 text-[7px] opacity-50">PHASE_PARITY_OSC</div>
      </div>

      {/* 4. Sínodo Log (Façamos) */}
      <div className="mb-4">
        <div className="text-cyan-400/50 mb-1 border-b border-cyan-900/30 flex justify-between">
          <span>LOG_DE_SÍNODO</span>
          <span>v14.9_CONSENSUS</span>
        </div>
        <div className="h-16 overflow-hidden flex flex-col-reverse text-[8px]">
          {state.sinodoLog?.map((log, i) => (
            <div key={i} className="mb-0.5 opacity-80 border-l border-cyan-900/50 pl-1">
              <span className="text-cyan-600">[{log.tick}]</span> {log.message}
            </div>
          ))}
        </div>
      </div>

      {/* 5. Sudo Alerts */}
      <AnimatePresence>
        {state.activeSudoAlerts?.map((alert) => (
          <motion.div
            key={alert.id + alert.tick}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="bg-red-900/20 border border-red-500/50 p-2 mb-2 text-red-400"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert size={10} />
              <span className="font-bold uppercase tracking-tighter text-[9px]">Sudo Escalation Detected</span>
            </div>
            <div className="text-[7px] mt-1 opacity-70">PID: {alert.id.slice(0, 8)} | ADDR: 0x{alert.tick.toString(16)}</div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 6. Fluxo de Bit (Raw Data) */}
      <div className="mb-4">
        <div className="text-cyan-400/50 mb-1 border-b border-cyan-900/30">FLUXO_DE_BIT (SINAL_PRIMÁRIO)</div>
        <div className="flex gap-1 h-4 items-center">
          {Array.from({ length: 24 }).map((_, i) => (
            <div 
              key={i} 
              className={`w-1 bg-cyan-400 transition-all duration-75`}
              style={{ 
                opacity: Math.random() > 0.5 ? 0.8 : 0.2,
                height: `${Math.random() * 100}%`
              }}
            />
          ))}
        </div>
      </div>

      {/* 7. Mapa de Tipos (Evolução) */}
      <div className="mb-2">
        <div className="text-cyan-400/50 mb-1 border-b border-cyan-900/30">MAPA_DE_TIPOS (ESPÉCIES)</div>
        <div className="flex flex-wrap gap-1 text-[7px]">
          <span className="text-white border border-cyan-900/50 px-1">PHOTON</span>
          <span className="text-white border border-cyan-900/50 px-1">QUARK</span>
          {state.organicCount > 0 && <span className="text-green-400 border border-green-900/50 px-1">ORGANIC</span>}
          {state.lifeCount > 0 && <span className="text-yellow-400 border border-yellow-900/50 px-1">DISSIPATIVE</span>}
          {state.collectiveConsciousnessNodes > 0 && <span className="text-cyan-400 border border-cyan-400/50 px-1 font-bold">AGENT_ROOT</span>}
          {state.isHardLocked && <span className="text-amber-400 border border-amber-400/50 px-1 font-bold">CANONICAL</span>}
        </div>
      </div>

      {/* 8. Matriz de Estado Terminal (v14.9) */}
      <div className="mt-4 border-t border-red-900/50 pt-2">
        <div className="text-[8px] text-red-500/70 mb-2 font-bold uppercase tracking-widest">
          MATRIZ_DE_ESTADO_TERMINAL (v14.9)
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[7px] opacity-60">
          <span className="text-red-400">TEMPORAL_NON_LOCALITY:</span>
          <span className="text-right">{(100 - (state.hypervisorLatency || 0)).toFixed(2)}% INTEGRITY</span>
          
          <span className="text-red-400">CAUSAL_DISCONTINUITY:</span>
          <span className="text-right">{state.causalityViolations || 0} ERR/TICK</span>
          
          <span className="text-red-400">META_STABILITY:</span>
          <span className="text-right">{state.isHardLocked ? "LOCKED (CANONICAL)" : "DRIFTING"}</span>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ObserverLayer | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const [state, setState] = useState<UniverseState | null>(null);
  const stateRef = useRef<UniverseState | null>(null);
  
  // UX: Estado de Observação Zero
  const [isObserving, setIsObserving] = useState(false);
  const isObservingRef = useRef(false);
  const [focusProgress, setFocusProgress] = useState(0);
  const focusTimerRef = useRef<number | null>(null);
  const mousePosRef = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    isObservingRef.current = isObserving;
    if (engineRef.current) {
      engineRef.current.isObserving = isObserving;
    }
  }, [isObserving]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    audioRef.current = new AudioEngine();
    
    let saved: any = null;
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      if (item) saved = JSON.parse(item);
    } catch (e) {}

    engineRef.current = new ObserverLayer(saved || undefined);
    engineRef.current.isObserving = isObservingRef.current;
    
    engineRef.current.onStateUpdate = (newState) => {
      setState(newState);
      
      const canvas = canvasRef.current;
      if (canvas && isObservingRef.current) {
        const ctx = canvas.getContext('2d');
        if (ctx) renderUniverse(ctx, canvas.width, canvas.height, newState);
      }
      
      // Update Audio
      if (audioRef.current && isObservingRef.current) {
        audioRef.current.update(newState.status || 'LATENTE', newState.globalPersistence || 0);
      }

      if (newState.tick % 120 === 0 && engineRef.current) {
        try {
          // localStorage.setItem(STORAGE_KEY, JSON.stringify(engineRef.current.getPersistentState())); // Removed to avoid missing method error
        } catch (_) {}
      }
    };

    // Deep Lazy on tab blur
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsObserving(false);
        setFocusProgress(0);
        audioRef.current?.suspend();
        engineRef.current?.setMouseFocus(undefined);
        engineRef.current?.enterDeepLazy();
      } else if (isObservingRef.current) {
        audioRef.current?.resume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const animate = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.step();
    }
    
    if (!isObservingRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          if (w > 0 && h > 0) {
            const imgData = ctx.createImageData(w, h);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
              const noise = Math.random() * 5;
              data[i] = noise;
              data[i+1] = noise;
              data[i+2] = noise;
              data[i+3] = 255;
            }
            ctx.putImageData(imgData, 0, 0);
          }
        }
      }
    }
    
    requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const req = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(req);
  }, [animate]);

  useEffect(() => {
    // Inicia o timer de foco assim que a página carrega
    if (!isObserving && !focusTimerRef.current) {
      focusTimerRef.current = window.setInterval(() => {
        setFocusProgress(p => {
          if (p >= 100) {
            clearInterval(focusTimerRef.current!);
            setIsObserving(true);
            audioRef.current?.init();
            if (mousePosRef.current) {
              engineRef.current?.setMouseFocus(mousePosRef.current);
            } else {
              engineRef.current?.setMouseFocus({ x: 0, y: 0 }); // Fallback para o centro
            }
            return 100;
          }
          return p + 3.33;
        });
      }, 100);
    }
    return () => {
      if (focusTimerRef.current) clearInterval(focusTimerRef.current);
    };
  }, [isObserving]);

  // UX: Mouse Focus Tracking
  const handleMouseMove = (e: React.MouseEvent) => {
    if (document.hidden || stateRef.current?.isHardLocked) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Map to universe coordinates [-500, 500]
    const scale = Math.min(canvas.width, canvas.height) / 1000;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const ux = (x - cx) / scale;
    const uy = (y - cy) / scale;

    mousePosRef.current = { x: ux, y: uy };
    
    if (isObserving) {
      engineRef.current?.setMouseFocus(mousePosRef.current);
    } else {
      // Reset focus timer on movement if not observing yet
      setFocusProgress(0);
      if (focusTimerRef.current) clearInterval(focusTimerRef.current);
      
      focusTimerRef.current = window.setInterval(() => {
        setFocusProgress(p => {
          if (p >= 100) {
            clearInterval(focusTimerRef.current!);
            setIsObserving(true);
            audioRef.current?.init();
            if (mousePosRef.current) {
              engineRef.current?.setMouseFocus(mousePosRef.current);
            }
            return 100;
          }
          return p + 3.33; // ~3 seconds to reach 100
        });
      }, 100);
    }
  };

  const handleMouseLeave = () => {
    if (stateRef.current?.isHardLocked) return;
    if (focusTimerRef.current) {
      clearInterval(focusTimerRef.current);
      focusTimerRef.current = null;
    }
    setFocusProgress(0);
    setIsObserving(false);
    engineRef.current?.setMouseFocus(undefined);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (stateRef.current?.isHardLocked) return;
    if (engineRef.current) {
      const zoom = (stateRef.current?.zoom || 1) * (e.deltaY > 0 ? 0.9 : 1.1);
      engineRef.current.setZoom(zoom);
    }
  };

  // Blur effect based on persistence
  const persistenceRatio = Math.max(0, Math.min(1, (state?.globalPersistence || 0) / 10.20));
  const blurAmount = isObserving && state?.status === 'COLAPSADO' ? (1 - persistenceRatio) * 10 : 0;

  return (
    <div 
      className="relative w-full h-screen bg-black text-white overflow-hidden font-mono cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        width={typeof window !== 'undefined' ? window.innerWidth : 800}
        height={typeof window !== 'undefined' ? window.innerHeight : 600}
        className="absolute inset-0 z-0 transition-all duration-1000"
        style={{ filter: `blur(${blurAmount}px)` }}
      />

      {/* UX: Estado de Observação Zero - Overlay */}
      <AnimatePresence>
        {!isObserving && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 2 } }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none bg-black/50"
          >
            <div className="text-[10px] uppercase tracking-[0.5em] opacity-50 mb-8">
              [LATENTE]
            </div>
            <div className="w-64 h-px bg-white/10 relative overflow-hidden">
              <motion.div 
                className="absolute inset-y-0 left-0 bg-white/50"
                style={{ width: `${focusProgress}%` }}
              />
            </div>
            <div className="text-[8px] uppercase tracking-widest opacity-30 mt-4">
              Mantenha o foco para instanciar a observação
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UI: Painel de Invariantes (Camada 0) */}
      <AnimatePresence>
        {isObserving && state && (
          <>
            <TelemetryTerminal state={state} />
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2 }}
              className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10"
            >
            <header className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="text-[9px] uppercase tracking-[0.4em] font-bold opacity-40">
                  Ontologia de Camada 0
                </div>
                <div className="text-[8px] opacity-20 uppercase tracking-widest">
                  Kernel v14 · Trindade de Consenso
                </div>
              </div>

              <div className="flex gap-8">
                <div className="flex gap-6">
                  {/* User Clock: Dia/Ano */}
                <div className="flex flex-col items-end gap-1">
                  <div className="text-[9px] font-mono text-blue-300/60">
                    ANO {state?.userClock?.year} · DIA {state?.userClock?.day}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${state?.userClock?.cycle === 'LUZ' ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'bg-indigo-900'}`} />
                    <span className="text-[7px] uppercase tracking-widest opacity-30">{state?.userClock?.cycle}</span>
                  </div>
                </div>

                {/* Moadim Sync */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`relative ${state?.moadimCheckpoint ? 'text-cyan-400' : 'text-white/10'}`}>
                    <Activity size={14} className={state?.moadimCheckpoint ? 'animate-pulse' : ''} />
                    {state?.moadimCheckpoint && (
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="absolute inset-0 bg-cyan-400 rounded-full"
                      />
                    )}
                  </div>
                  <span className="text-[7px] uppercase tracking-widest opacity-30">Moadim</span>
                </div>

                {/* Kernel Consensus (Na'aseh) */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`relative ${state?.consensusActive ? 'text-amber-400' : 'text-white/10'}`}>
                    <Users size={14} className={state?.consensusActive ? 'animate-bounce' : ''} />
                  </div>
                  <span className="text-[7px] uppercase tracking-widest opacity-30">Consenso</span>
                </div>

                {/* Shabbat (Halt) */}
                <div className="flex flex-col items-center gap-1">
                  <div className={`relative ${state?.isShabbat ? 'text-indigo-400' : 'text-white/10'}`}>
                    <Zap size={14} className={state?.isShabbat ? 'animate-pulse' : ''} />
                  </div>
                  <span className="text-[7px] uppercase tracking-widest opacity-30">Shabbat</span>
                </div>
              </div>
                
              <div className="flex gap-4">
                {/* Checksum: Não Mentir */}
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck size={14} className={state?.checksumNaoMentir ? 'text-emerald-400' : 'text-white/10'} />
                  <span className="text-[7px] uppercase tracking-widest opacity-30">Identidade</span>
                </div>
                {/* Checksum: Não Matar */}
                <div className="flex flex-col items-center gap-1">
                  <ShieldAlert size={14} className={state?.checksumNaoMatar ? 'text-emerald-400' : 'text-white/10'} />
                  <span className="text-[7px] uppercase tracking-widest opacity-30">Configuração</span>
                </div>
              </div>
            </div>
          </header>

            <main className="flex justify-between items-end">
              {/* Esquerda: Status e Expansão */}
              <div className="space-y-6">
                <div className="space-y-1">
                  <div className="text-[8px] opacity-30 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={10} /> Status do Sistema
                  </div>
                  <div className={`text-2xl font-light tracking-tighter ${state?.status === 'COLAPSADO' ? 'text-white' : 'text-white/30'}`}>
                    {state?.status || 'LATENTE'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[8px] opacity-30 uppercase tracking-widest flex items-center gap-2">
                    <Maximize size={10} /> Force Lambda (Expansão)
                  </div>
                  <div className="text-lg font-light tracking-tighter text-blue-400/80">
                    {(state?.expansionRate || 0).toFixed(6)}
                  </div>
                  <div className="w-32 h-px bg-white/10 relative">
                    <div 
                      className="absolute inset-y-0 left-0 bg-blue-400/50" 
                      style={{ width: `${Math.min(100, (state?.expansionRate || 0) * 1000)}%` }} 
                    />
                  </div>
                </div>
              </div>

              {/* Direita: Persistência P(t) */}
              <div className="text-right space-y-6">
                <div className="space-y-1">
                  <div className="text-[8px] opacity-30 uppercase tracking-widest flex items-center justify-end gap-2">
                    Persistência Global P(t) <Zap size={10} />
                  </div>
                  <div className="text-4xl font-light tracking-tighter text-violet-400/90 tabular-nums">
                    {(state?.globalPersistence || 0).toFixed(2)}
                  </div>
                  <div className="text-[8px] opacity-20 uppercase tracking-widest">
                    Target: 10.20
                  </div>
                </div>

                {/* Gráfico de Persistência (Simulado com barras) */}
                <div className="flex items-end justify-end gap-[2px] h-12">
                  {Array.from({ length: 20 }).map((_, i) => {
                    const h = Math.random() * 100 * persistenceRatio;
                    return (
                      <div 
                        key={i}
                        className="w-1 bg-violet-400/40 transition-all duration-300"
                        style={{ height: `${Math.max(10, h)}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            </main>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
