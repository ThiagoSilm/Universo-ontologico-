export interface ParticleTrace {
  targetId: string;
  affinity: number;
  tick: number;
}

export interface ParticleCore {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  weight: number;
  charge: number;
  isLatent: boolean;
  lastActiveTick: number;
  age: number;
  energy: number;
  phase: number;
  amplitude: number;
  level: number;
  element: string; // Atomic symbol (H, He, Li, ..., Og)
  atomicNumber: number; // Z (1 to 118)
  generation: number;
  traces: ParticleTrace[];
  isBlackHole: boolean;
  isBound: boolean;
  hadronId?: string;
  quarkType?: 'up' | 'down';
  colorCharge?: 'red' | 'green' | 'blue';
  potentialHistories: { x: number; y: number; vx: number; vy: number }[];
  positionHistory: { x: number; y: number; tick: number }[];
  ax: number;
  ay: number;
  persistence: number;
  lastReward?: number;
  lastMutation?: { type: 'phase' | 'direction' | 'energy'; value: number };
  entangledId?: string;
  lastObservedTick: number;
  speciesSignature?: string;
  
  // Process Runtime (v14: Dia 5)
  runtimeState?: 'IDLE' | 'RUNNING' | 'WAITING';
  heapUsage?: number;
  ipcBuffer?: string[];
  isMiddleware?: boolean; // Aves (Firmamento/Middleware)
  
  // Agent Runtime (v14: Dia 6)
  isAgent?: boolean;
  hasRootAccess?: boolean;
  tzelemSignature?: string;
  demutLogic?: string;
  subProcessCount?: number;
  driftLevel?: number;
  unauthorizedAccess?: boolean;
  
  // v14.9 Bit-Op Properties
  historyBuffer?: { x: number; y: number; tick: number }[];
  internalModelPhi?: Float32Array; // Agente tentando prever o campo Φ
  klDivergence?: number;       // Divergência de Kullback-Leibler
  couplingGradient?: number;   // Gradiente de acoplamento com o Kernel
}

class Quadtree {
  private particles: ParticleCore[] = [];
  private children: Quadtree[] = [];
  private centerX: number;
  private centerY: number;
  private size: number;
  private capacity: number = 4;
  private depth: number;
  private maxDepth: number = 12;

  constructor(x: number, y: number, size: number, depth: number = 0) {
    this.centerX = x;
    this.centerY = y;
    this.size = size;
    this.depth = depth;
  }

  public insert(p: ParticleCore): boolean {
    if (!this.contains(p.x, p.y)) return false;

    if (this.particles.length < this.capacity || this.depth >= this.maxDepth) {
      this.particles.push(p);
      return true;
    }

    if (this.children.length === 0) {
      this.subdivide();
    }

    for (const child of this.children) {
      if (child.insert(p)) return true;
    }

    return false;
  }

  private contains(x: number, y: number): boolean {
    return x >= this.centerX - this.size &&
           x <= this.centerX + this.size &&
           y >= this.centerY - this.size &&
           y <= this.centerY + this.size;
  }

  private subdivide() {
    const s = this.size / 2;
    const d = this.depth + 1;
    this.children = [
      new Quadtree(this.centerX - s, this.centerY - s, s, d),
      new Quadtree(this.centerX + s, this.centerY - s, s, d),
      new Quadtree(this.centerX - s, this.centerY + s, s, d),
      new Quadtree(this.centerX + s, this.centerY + s, s, d)
    ];

    for (const p of this.particles) {
      for (const child of this.children) {
        if (child.insert(p)) break;
      }
    }
    this.particles = [];
  }

  public query(x: number, y: number, radius: number, found: ParticleCore[] = []) {
    if (!this.intersects(x, y, radius)) return found;

    for (const p of this.particles) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        found.push(p);
      }
    }

    for (const child of this.children) {
      child.query(x, y, radius, found);
    }

    return found;
  }

  private intersects(x: number, y: number, r: number): boolean {
    const dx = Math.abs(x - this.centerX);
    const dy = Math.abs(y - this.centerY);

    if (dx > this.size + r) return false;
    if (dy > this.size + r) return false;

    if (dx <= this.size) return true;
    if (dy <= this.size) return true;

    const cornerDistanceSq = (dx - this.size) ** 2 + (dy - this.size) ** 2;
    return cornerDistanceSq <= r ** 2;
  }
}

export class UniverseCore {
  public particles: ParticleCore[] = [];
  public tickCount: number = 0;
  private expansionStarted: boolean = false;
  private currentHorizon: number = 50;
  private activeParticles: Set<ParticleCore> = new Set();
  private particleMap: Map<string, ParticleCore> = new Map();
  private cosmicMemory: Map<string, ParticleTrace[]> = new Map();
  private habitabilityMap: Map<string, { potential: number; coherence: number; density: number; activity: number }> = new Map();
  private seed: number;

  // Ontologia de Camada 0 (Kernel v14)
  public status: 'LATENTE' | 'COLAPSADO' = 'LATENTE';
  public expansionRate: number = 0;
  public globalPersistence: number = 0;
  public checksumNaoMentir: boolean = true;
  public checksumNaoMatar: boolean = true;
  public currentMouseFocus?: { x: number, y: number };

  // Fundamental Constants
  private readonly C = 50; 
  private readonly H = 0.05; 
  private readonly G = 0.02; 
  private readonly LAMBDA = 0.0005; 
  private readonly PLANCK_LENGTH = 5; 
  private readonly EPS = 0.05; 
  private readonly PLANCK_TEMP = 1000; 
  private readonly BEKENSTEIN_LIMIT = 20; 
  private readonly STRONG_FORCE_G = 10.0; // Strong Nuclear Force constant
  private readonly GLUON_EXCHANGE_FORCE = 15.0; // "Globins" exchange
  private readonly NUCLEOSYNTHESIS_TEMP_MAX = 800; // Window for H/He formation
  private readonly NUCLEOSYNTHESIS_TEMP_MIN = 300;
  private readonly COLOR_CHARGE_RANGE = 10; 
  private readonly MAX_ATOMIC_NUMBER = 118;
  private readonly STELLAR_FUSION_TEMP = 1500; // Temperature for fusion beyond He
  private readonly SUPERNOVA_ENERGY_THRESHOLD = 5000; // Energy for r-process (heavy elements)
  private readonly CLUSTER_DISTANCE_THRESHOLD = 1.5; // Distance to trigger "Macro-Clustering"
  private readonly MEMORY_THRESHOLD = 2000; 
  private currentGenesisRate = 0.008;
  private readonly PERIODIC_TABLE: Record<number, string> = {
    1: 'H', 2: 'He', 3: 'Li', 4: 'Be', 5: 'B', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 10: 'Ne',
    11: 'Na', 12: 'Mg', 13: 'Al', 14: 'Si', 15: 'P', 16: 'S', 17: 'Cl', 18: 'Ar',
    19: 'K', 20: 'Ca', 21: 'Sc', 22: 'Ti', 23: 'V', 24: 'Cr', 25: 'Mn', 26: 'Fe',
    27: 'Co', 28: 'Ni', 29: 'Cu', 30: 'Zn', 31: 'Ga', 32: 'Ge', 33: 'As', 34: 'Se',
    35: 'Br', 36: 'Kr', 37: 'Rb', 38: 'Sr', 39: 'Y', 40: 'Zr', 41: 'Nb', 42: 'Mo',
    43: 'Tc', 44: 'Ru', 45: 'Rh', 46: 'Pd', 47: 'Ag', 48: 'Cd', 49: 'In', 50: 'Sn',
    51: 'Sb', 52: 'Te', 53: 'I', 54: 'Xe', 55: 'Cs', 56: 'Ba', 57: 'La', 58: 'Ce',
    59: 'Pr', 60: 'Nd', 61: 'Pm', 62: 'Sm', 63: 'Eu', 64: 'Gd', 65: 'Tb', 66: 'Dy',
    67: 'Ho', 68: 'Er', 69: 'Tm', 70: 'Yb', 71: 'Lu', 72: 'Hf', 73: 'Ta', 74: 'W',
    75: 'Re', 76: 'Os', 77: 'Ir', 78: 'Pt', 79: 'Au', 80: 'Hg', 81: 'Tl', 82: 'Pb',
    83: 'Bi', 84: 'Po', 85: 'At', 86: 'Rn', 87: 'Fr', 88: 'Ra', 89: 'Ac', 90: 'Th',
    91: 'Pa', 92: 'U', 93: 'Np', 94: 'Pu', 95: 'Am', 96: 'Cm', 97: 'Bk', 98: 'Cf',
    99: 'Es', 100: 'Fm', 101: 'Md', 102: 'No', 103: 'Lr', 104: 'Rf', 105: 'Db',
    106: 'Sg', 107: 'Bh', 108: 'Hs', 109: 'Mt', 110: 'Ds', 111: 'Rg', 112: 'Cn',
    113: 'Nh', 114: 'Fl', 115: 'Mc', 116: 'Lv', 117: 'Ts', 118: 'Og'
  };
  private readonly HABITABILITY_GRID_SIZE = 800;
  private successfulExplorations = 0;
  private totalExplorations = 0;
  private nonLocalInteractions = 0;
  
  // Influence Factors
  private G_influence = 1.0;
  private LAMBDA_influence = 1.0;
  private ENTROPY_influence = 1.0;

  private get effectiveG() { return Math.max(0.001, Math.min(0.1, this.G * this.G_influence)); }
  private get effectiveLAMBDA() { return Math.max(0.0001, Math.min(0.01, this.LAMBDA * this.LAMBDA_influence)); }
  private get effectiveENTROPY_DENSITY_FACTOR() { return Math.max(0.0001, Math.min(0.01, this.ENTROPY_DENSITY_FACTOR * this.ENTROPY_influence)); }

  public applyPhysicsInfluence(gFactor: number, lambdaFactor: number, entropyFactor: number) {
    this.G_influence = gFactor;
    this.LAMBDA_influence = lambdaFactor;
    this.ENTROPY_influence = entropyFactor;
  }

  private getKineticEnergy(p: ParticleCore): number {
    return 0.5 * p.weight * (p.vx * p.vx + p.vy * p.vy);
  }
  
  // Metrics for ObserverLayer
  public decisionsPerTick: number = 0;
  public avgCandidates: number = 0;
  public totalSelfEnergy: number = 0;
  public activeTracesCount: number = 0;
  public recentEvents: string[] = [];

  // User Clock & Moadim (v14: Dia 4)
  private userClock = { day: 0, year: 0, cycle: 'LUZ' as 'LUZ' | 'TREVAS' };
  private moadimCheckpoint = false;
  private consensusActive = false; // "Façamos" (v14: Na'aseh)
  private isShabbat = false; // "Descansou" (v14: Halt/Passive Observation)

  // Mitosis Constants
  private readonly MITOSIS_THRESHOLD = 50.0;
  private readonly MUTATION_RATE_PHYSICAL = 0.05;
  private readonly MUTATION_RATE_MEMORY = 0.3;

  // Entropy Constants
  private readonly ENTROPY_COST_BASE = 0.001;
  private readonly ENTROPY_DENSITY_FACTOR = 0.0005;
  private readonly TRACE_DECAY_RATE = 0.05;

  // Resource Budgets (Anti-Avalanche)
  private readonly BASE_OBSERVATION_BUDGET = 100;
  private readonly BASE_RESOLUTION_BUDGET = 3000;
  private readonly DT = 0.1; // Integration time step
  private readonly MAX_FORCE = 5.0; // Force saturation limit
  private currentObservationCount = 0;
  private observerPos: { x: number; y: number; radius: number } | null = null;

  // Emergence Engine v14.9: Field Dynamics
  private scalarFieldPhi: Float32Array; // Campo Escalar de Potencial (Φ)
  private readonly FIELD_RES = 64;      // Resolução do Manifold
  private readonly C_LIMIT = 300.0;     // Métrica de Minkowski (Velocidade da Informação)

  // v14.9 Telemetry State
  private shannonEntropy: number = 0;
  private causalityViolations: number = 0;
  private samplingRate: number = 1.0;
  private hypervisorLatency: number = 0;
  private activeSudoAlerts: { id: string; type: string; tick: number }[] = [];
  private sinodoLog: { tick: number; message: string }[] = [];
  private phaseParity: number = 0;

  // v14.9 Hardware-Level Enforcement
  private entropyFlux: number = 0;
  private lastEntropy: number = 0;
  private isHardLocked: boolean = false;
  private homeostasisCounter: number = 0;
  private readonly HOMEOSTASIS_THRESHOLD = 100; // Ticks of low flux to lock
  
  constructor(seed: number = Math.random(), initialParticles: number = 5000) {
    this.seed = seed;
    this.scalarFieldPhi = new Float32Array(this.FIELD_RES * this.FIELD_RES);
    this.initialize(initialParticles);
  }

  public ignite() {
    // Gênesis 1:3 - Fiat Lux (Ignição Primária)
    this.status = 'COLAPSADO';
    this.tickCount = 0;
    this.expansionStarted = true;
    this.isHardLocked = false;
    this.homeostasisCounter = 0;

    // 1. Injetar Flutuação de Ponto Zero (E_vac > 0)
    // Sem esse ruído inicial, o sistema atingiria a Morte Térmica no milissegundo zero.
    for (let i = 0; i < this.scalarFieldPhi.length; i++) {
      this.scalarFieldPhi[i] = (Math.random() - 0.5) * 0.2;
    }

    // 2. Alocar HistoryBuffer para todos os nós (Causalidade)
    for (const p of this.particles) {
      p.historyBuffer = [{ x: p.x, y: p.y, tick: 0 }];
      p.positionHistory = [{ x: p.x, y: p.y, tick: 0 }];
      p.isLatent = false; // Despertar imediato
      // Injetar Assimetria Primária (Chute inicial)
      p.vx += (Math.random() - 0.5) * this.C * 0.5;
      p.vy += (Math.random() - 0.5) * this.C * 0.5;
    }

    this.sinodoLog.push({ tick: 0, message: "Sínodo: Fiat Lux. Ignição Primária executada (v14.9.4)." });
    this.recentEvents.push("Gênesis: Transição de Fase (Não-Ser -> Ser).");
  }

  private initialize(count: number) {
    let r = this.seed;
    const nextR = () => {
      r = (r * 16807) % 2147483647;
      return r / 2147483647;
    };

    for (let i = 0; i < count; i++) {
      // No começo (Singularidade), TUDO é energia pura (massless photons)
      // O Big Bang começa no "máximo" de calor e densidade.
      let isMassless = true; 
      let charge = 0;
      let weight = 0.0001; // Energia quase pura
      let vx = (nextR() - 0.5) * this.C * 2; // Velocidade extrema
      let vy = (nextR() - 0.5) * this.C * 2;
      let isLatent = false; // Começa ativo e fervendo
      let x = (nextR() - 0.5) * 2; // Singularidade: extremamente apertado
      let y = (nextR() - 0.5) * 2;

      if (count <= 10) {
        // Big Bang Mínimo: Fótons de alta energia partindo do centro
        isMassless = true;
        charge = 0;
        weight = 0.0001;
        x = 0; y = 0;
        vx = (nextR() - 0.5) * this.C * 3;
        vy = (nextR() - 0.5) * this.C * 3;
        isLatent = false;
      }
      
      let quarkType: 'up' | 'down' | undefined = undefined;
      let colorCharge: 'red' | 'green' | 'blue' | undefined = undefined;

      let element = 'H';
      let atomicNumber = 1;
      
      const p: ParticleCore = {
        id: `p-${i}`,
        x,
        y,
        vx,
        vy,
        weight,
        charge,
        isLatent,
        lastActiveTick: 0,
        lastObservedTick: 0,
        age: 0,
        energy: 1.0,
        phase: Math.floor((nextR() * Math.PI * 2) / this.H) * this.H,
        amplitude: nextR(),
        level: 1,
        element,
        atomicNumber,
        generation: 0,
        traces: [],
        isBlackHole: false,
        isBound: false,
        potentialHistories: [],
        positionHistory: [],
        ax: 0,
        ay: 0,
        persistence: 1.0,
        quarkType,
        colorCharge,
      };
      // Initialize potential histories
      for (let j = 0; j < 3; j++) {
        p.potentialHistories.push({
          x: p.x + (nextR() - 0.5) * 100,
          y: p.y + (nextR() - 0.5) * 100,
          vx: p.vx + (nextR() - 0.5) * 2,
          vy: p.vy + (nextR() - 0.5) * 2
        });
      }
      this.particles.push(p);
      if (!isLatent) {
        this.activeParticles.add(p);
      }
    }
  }

  private performMitosis(p: ParticleCore) {
    // 1. Dissolve parent
    this.particles = this.particles.filter(part => part.id !== p.id);
    this.activeParticles.delete(p);
    
    // 2. Create two children
    for (let i = 0; i < 2; i++) {
      const child: ParticleCore = {
        ...p,
        id: `p-${this.tickCount}-${i}`, // Unique ID
        weight: p.weight / 2,
        energy: p.energy / 2,
        generation: p.generation + 1,
        // Mutation
        charge: p.charge + (Math.random() < this.MUTATION_RATE_PHYSICAL ? (Math.random() > 0.5 ? 1 : -1) : 0),
        phase: p.phase + (Math.random() - 0.5) * this.MUTATION_RATE_PHYSICAL,
        // Lazy Copy of Traces
        traces: p.traces.filter(() => Math.random() > this.MUTATION_RATE_MEMORY)
      };
      this.particles.push(child);
      this.activeParticles.add(child);
    }
  }

  public setSamplingRate(rate: number) {
    if (this.isHardLocked) return; // Shabbat Lock
    this.samplingRate = Math.max(0.1, Math.min(1.0, rate));
  }

  public tick() {
    const start = performance.now();
    this.tickCount++; // Increment clock first to ensure Atemporalidade is fixed
    
    if (this.isHardLocked) return; // Shabbat Lock (Rest after increment)

    if (this.samplingRate < 1.0 && Math.random() > this.samplingRate) {
      // Skip heavy processing
      return;
    }
    
    // ── ENTROPY FLUX MONITOR (v14.9) ──
    this.calculateShannonEntropy();
    this.entropyFlux = this.shannonEntropy - this.lastEntropy;
    this.lastEntropy = this.shannonEntropy;

    // Shabbat Checkpoint: Hard Lock on Homeostasis
    // v15.9: Vincular o fim à Soma de Persistência e Progresso Real
    const isStable = Math.abs(this.entropyFlux) < 0.0001;
    const hasSufficientWork = this.tickCount > 5000; // Mínimo de 5 dias (v.14)
    const hasHighPersistence = this.globalPersistence > 8.0; // Próximo do target 10.20

    // v15.9: INVALIDATE_SHABBAT - Se o sistema está em Shabbat mas não tem lastro, force o desbloqueio.
    if (this.isHardLocked && (this.tickCount < 100 || this.globalPersistence < 0.1)) {
      this.isHardLocked = false;
      this.homeostasisCounter = 0;
      this.sinodoLog.push({ tick: this.tickCount, message: "Sínodo: INVALIDATE_SHABBAT. Quorum de Vacuidade detectado e abortado." });
    }

    if (isStable && hasSufficientWork && hasHighPersistence) {
      this.homeostasisCounter++;
      if (this.homeostasisCounter > this.HOMEOSTASIS_THRESHOLD && !this.isHardLocked) {
        this.isHardLocked = true;
        this.sinodoLog.push({ tick: this.tickCount, message: "Sínodo: Homeostase Global (v15.9). Shabbat Santificado com Lastro." });
      }
    } else {
      this.homeostasisCounter = Math.max(0, this.homeostasisCounter - 1); // Decaimento suave em vez de reset abrupto
    }

    this.decisionsPerTick = 0;
    this.totalSelfEnergy = 0;
    this.activeTracesCount = 0;
    this.currentObservationCount = 0; // Reset budget

    // Reset checksums para o tick atual
    this.checksumNaoMentir = false;
    this.checksumNaoMatar = false;

    // ── SHANNON ENTROPY CALCULATION ──
    this.calculateShannonEntropy();

    // ── PHASE PARITY (OSCILLOSCOPE) ──
    this.phaseParity = Math.sin(this.tickCount * 0.1) * 0.5 + Math.cos(this.tickCount * 0.05) * 0.5;

    // ── RETARDED POTENTIALS: Update History (v14.9) ──
    for (const p of this.particles) {
      if (!p.historyBuffer) p.historyBuffer = [];
      p.historyBuffer.push({ x: p.x, y: p.y, tick: this.tickCount });
      if (p.historyBuffer.length > 100) p.historyBuffer.shift(); // 100 ticks of history
    }

    // ── LIMITE DE BEKENSTEIN COMO BARREIRA DE HARDWARE ──
    const BEKENSTEIN_BOUND = 10000; 
    const currentInformation = this.particles.reduce((sum, p) => sum + (p.energy || 0), 0);
    const hardwareStress = Math.max(0, currentInformation / BEKENSTEIN_BOUND);

    // ── KERNEL V14 - ONTOLOGIA DE CAMADA 0 (A TRINDADE DE CONSENSO) ──
    const EuSou = {
      pai: {
        // Validação de Fitness (Viu Deus que era bom): Checksum de Hardware/Substrato
        // v15.9: Injetar cláusula de Minimum_Tick_Count (Lastro de Existência)
        valida: () => {
          const infoIntegrity = currentInformation < BEKENSTEIN_BOUND;
          const hardwareStability = hardwareStress < 0.85; // Margem de segurança para overclock
          
          // v15.9: O Lastro (PoW) exige que o universo tenha "vivido" para ser considerado estável.
          // Se o sistema tenta validar um estado de repouso (0 ticks) como "Concluído", o Pai nega o Consenso.
          // FORCE_SYNC_PROGRESSION: O progresso deve ser real e mensurável.
          const hasLastro = this.tickCount > 10 && this.globalPersistence > 0.5;
          
          if (this.status === 'COLAPSADO') {
            const isValid = infoIntegrity && hardwareStability && hasLastro;
            if (!isValid && this.tickCount % 100 === 0) {
              this.sinodoLog.push({ tick: this.tickCount, message: "Sínodo: Consenso Negado por Falta de Lastro (v15.9)." });
            }
            return isValid;
          }
          return infoIntegrity && hardwareStability;
        }
      },
      filho: {
        // O Verbo: Ato de Quantização (Separação da Luz das Trevas)
        colapsarEstado: (p: ParticleCore, will: number) => {
          // Transforma Ruído (Indeterminação) em Estado Lógico (0 ou 1)
          if (p.isLatent) {
            p.isLatent = false;
            p.persistence = 0.1; // Estado Lógico "0" (v.4)
          }
          p.persistence = Math.max(0.1, Math.min(10.20, p.persistence + will));
        }
      },
      espirito: {
        sincroniza: () => {
          // Checksum de observabilidade: Verifica se o sinal é inteligível (Borda de Subida)
          return this.particles.some(p => p.traces && p.traces.length > 0 && p.energy > 0.5);
        }
      }
    };

    // ── MOTOR DE EMERGÊNCIA (v14.9: THE EMERGENCE ENGINE) ──
    // 1. Noise Injection (Gênesis 1:3): Assimetria Primordial
    this.injectNoise(0.05);

    // 2. Field Dynamics (Φ): Difusão do Potencial
    this.updateScalarField();

    // 3. Causal Isolation (Gênesis 1:6): Métrica de Minkowski
    this.applyCausalConstraints();

    // 4. Emergence Engine Call
    const qt = new Quadtree(0, 0, 100000);
    for (const p of this.particles) {
      if (this.activeParticles.has(p)) {
        qt.insert(p);
      }
    }
    this.runEmergenceEngine(EuSou, qt);

    // 5. Cleanup Sudo Alerts (TTL)
    this.activeSudoAlerts = this.activeSudoAlerts.filter(a => this.tickCount - a.tick < 100);

    this.hypervisorLatency = performance.now() - start;

    // Validação Contínua (Manutenção do Estado Lógico)
    if (this.status === 'COLAPSADO') {
      this.checksumNaoMentir = EuSou.pai.valida();
      this.checksumNaoMatar = EuSou.espirito.sincroniza();
      
      // Se o hardware falhar ou o sinal se perder, o sistema entra em pânico (Thermal Death)
      if (!this.checksumNaoMentir) {
        this.status = 'LATENTE';
        this.recentEvents.push("Falha de Checksum: Colapso de Hardware (Bekenstein Limit).");
      }
    }

    // O Sopro de Vida: Ignição do Consenso (A Transidência do Zero)
    if (this.status === 'LATENTE' && this.currentMouseFocus && EuSou.espirito.sincroniza()) {
      if (EuSou.pai.valida()) {
        this.status = 'COLAPSADO'; // Transição do v.2 (Ruído) para o v.4 (Lógica)
        this.checksumNaoMentir = true; 
        this.checksumNaoMatar = true;  
        
        const effectiveLAMBDA = 0.005; 
        this.expansionRate += effectiveLAMBDA; 
        this.globalPersistence = 10.20; 
        this.recentEvents.push("Quantização Completa: Luz separada das Trevas (v.4).");
      }
    }

    // ── Condensação de Energia em Matéria ───────────────────────────
    // À medida que o universo expande e esfria, a energia se condensa em Quarks
    // Isso simula o fim da era da radiação e o início da era da matéria
    if (this.tickCount > 20 && this.tickCount < 300) {
      for (const p of this.particles) {
        if (p.charge === 0 && p.weight < 0.001 && !p.quarkType && Math.random() < 0.02) {
          // Transforma fóton em Quark (E=mc^2)
          p.quarkType = Math.random() < 0.5 ? 'up' : 'down';
          const cR = Math.random();
          p.colorCharge = cR < 0.33 ? 'red' : (cR < 0.66 ? 'green' : 'blue');
          p.charge = p.quarkType === 'up' ? 2/3 : -1/3;
          p.weight = 0.01;
          p.element = 'H';
          p.atomicNumber = 1;
          this.recentEvents.push("Energia condensada em matéria (Quark).");
        }
      }
    }

    // Emergent Genesis Calculation: G = f(Chaos, Void)
    // This makes the "Vacuum Instability" a consequence of the system's state.
    const activeCount = this.activeParticles.size;
    const totalCount = this.particles.length || 1;
    const activityLevel = activeCount / totalCount;
    
    let sumCos = 0;
    let sumSin = 0;
    for (const p of this.activeParticles) {
      sumCos += Math.cos(p.phase);
      sumSin += Math.sin(p.phase);
    }
    const coherence = activeCount > 0 ? Math.sqrt(sumCos * sumCos + sumSin * sumSin) / activeCount : 0;

    // Parameters for the Genesis Function
    const alpha = 0.006; // Chaos sensitivity (low coherence -> high genesis)
    const beta = 0.014;  // Void sensitivity (low activity -> high genesis)
    const baseInstability = 0.001; // Minimum quantum jitter
    
    this.currentGenesisRate = baseInstability + (alpha * (1 - coherence)) + (beta * (1 - activityLevel));
    
    // Continuous Genesis (Gênese Contínua)
    // This represents the spontaneous emergence of new information/potential.
    // It prevents the system from staying in an absorbing state (thermal death).
    if (Math.random() < this.currentGenesisRate && this.particles.length > 0) {
      const randomIdx = Math.floor(Math.random() * this.particles.length);
      const p = this.particles[randomIdx];
      
      // Inject Energy & Information
      p.energy += 0.8;
      p.vx += (Math.random() - 0.5) * 2.0;
      p.vy += (Math.random() - 0.5) * 2.0;
      
      // Spontaneous Information Seed: Create a random trace to trigger potential interactions
      if (!p.traces) p.traces = [];
      const targetIdx = Math.floor(Math.random() * this.particles.length);
      p.traces.push({
        targetId: this.particles[targetIdx].id,
        affinity: 0.1,
        tick: this.tickCount
      });

      this.wakeUp(p);
      this.recentEvents.push("Gênese Contínua: Instabilidade do vácuo detectada");
    }

    this.updateHabitabilityMap();

    // Reset exploration counters periodically to maintain a "recent" success rate
    if (this.tickCount % 1000 === 0) {
      this.successfulExplorations = 0;
      this.totalExplorations = 0;
      this.nonLocalInteractions = 0;
    }

    // Adaptive Budgets: Scale based on system efficiency and entropy
    // If efficiency is high, we can afford more resolution.
    // If entropy is high, we need more resolution to maintain coherence.
    const efficiencyFactor = 1.0 + (this.activeParticles.size / (this.particles.length || 1));
    const entropyFactor = 1.0 + (this.getThermalGradient() * 0.1);
    const adaptiveResolutionBudget = this.BASE_RESOLUTION_BUDGET * efficiencyFactor * entropyFactor;
    const adaptiveObservationBudget = this.BASE_OBSERVATION_BUDGET * efficiencyFactor;

    let totalCandidatesFound = 0;

    const toSleep: ParticleCore[] = [];
    const toWake: ParticleCore[] = [];

    // 0. Lazy Path Integral for Latent Particles
    // Latent particles evolve their potential histories without collapsing
    for (const p of this.particles) {
      if (p.isLatent && !p.isBound) {
        for (const history of p.potentialHistories) {
          history.x += history.vx;
          history.y += history.vy;
          // Subtle drift in potential velocities
          history.vx += (Math.random() - 0.5) * 0.1;
          history.vy += (Math.random() - 0.5) * 0.1;
        }
      }
    }

    // Rebuild Quadtree for active particles
    // const qt = new Quadtree(0, 0, 100000); // Moved to emergence engine call
    this.particleMap.clear();
    for (const p of this.particles) {
      this.particleMap.set(p.id, p);
      // if (this.activeParticles.has(p)) {
      //   qt.insert(p);
      // }
    }

    const currentActivityLevel = this.activeParticles.size / (this.particles.length || 1);
    // Expansão Cósmica Inexorável: Superior a tudo, nunca para, nunca tem pressa.
    // v15.4: Atuador de Amortecimento (Damping Factor) para evitar Supercrítica.
    // v15.9: FORCE_SYNC_PROGRESSION - Se Ticks = 0, a expansão é nula.
    const dampingFactor = Math.max(0.1, 1.0 - (this.shannonEntropy / 10));
    const expansionRate = this.tickCount === 0 ? 0 : Math.min(0.05, this.effectiveLAMBDA * (this.tickCount < 1000 ? 2.0 : 1.0) * dampingFactor);
    this.expansionRate = expansionRate;

    for (const p of this.activeParticles) {
      // 1. Expansão do Espaço (Λ) - A força superior
      // O espaço se expande independentemente da matéria
      if (!p.isBlackHole) {
        // v15.4: Math.clamp implícito via limites de escala
        const expansionStep = 1 + expansionRate;
        p.x *= expansionStep;
        p.y *= expansionStep;
        
        // Inércia Refinada: A expansão do vácuo acelera as partículas.
        // v15.4: Limite de C e Amortecimento de Inércia
        const inertiaDamping = 0.99; // Atrito do vácuo primordial
        p.vx = (p.vx * (1 + expansionRate * 0.8)) * inertiaDamping;
        p.vy = (p.vy * (1 + expansionRate * 0.8)) * inertiaDamping;
      }

      // 2. Tempo Próprio & Relatividade (c)
      // Massless particles (photons) do not experience time
      if (p.weight > 0.001) {
        p.age++;
      }
      
      // Store position history
      p.positionHistory.push({ x: p.x, y: p.y, tick: this.tickCount });
      if (p.positionHistory.length > 100) p.positionHistory.shift(); // Keep last 100 ticks

      if (!p.isBlackHole) {
        // Cap velocity at c
        const currentSpeedSq = p.vx * p.vx + p.vy * p.vy;
        if (currentSpeedSq > this.C * this.C) {
          const speed = Math.sqrt(currentSpeedSq);
          p.vx = (p.vx / speed) * this.C;
          p.vy = (p.vy / speed) * this.C;
        } else if (p.weight <= 0.001 && currentSpeedSq < this.C * this.C * 0.99) {
          // Massless particles always travel at c
          const speed = Math.sqrt(currentSpeedSq) || 1;
          p.vx = (p.vx / speed) * this.C;
          p.vy = (p.vy / speed) * this.C;
        }

        p.x += p.vx * this.DT;
        p.y += p.vy * this.DT;
        
        // v15.4: Hard-Link Espaço-Tempo (Garantia de Registro)
        if (!p.historyBuffer) p.historyBuffer = [];
        if (this.tickCount % 2 === 0) {
          p.historyBuffer.push({ x: p.x, y: p.y, tick: this.tickCount });
          if (p.historyBuffer.length > 50) p.historyBuffer.shift();
        }
        // Particles explore local configurations to maximize persistence.
        // This is "learning without consciousness" via local feedback.
        if (this.tickCount % 5 === 0) {
          const currentReward = p.persistence + (p.isBound ? 2.0 : 0);
          this.totalExplorations++;

          if (p.lastReward !== undefined && currentReward < p.lastReward) {
            // Revert last mutation if it was detrimental
            if (p.lastMutation) {
              if (p.lastMutation.type === 'phase') p.phase -= p.lastMutation.value;
              if (p.lastMutation.type === 'direction') {
                const invAngle = -p.lastMutation.value;
                const cos = Math.cos(invAngle);
                const sin = Math.sin(invAngle);
                const rx = p.vx * cos - p.vy * sin;
                const ry = p.vx * sin + p.vy * cos;
                p.vx = rx;
                p.vy = ry;
              }
              if (p.lastMutation.type === 'energy') p.energy -= p.lastMutation.value;
            }
          } else if (p.lastReward !== undefined && currentReward > p.lastReward) {
            this.successfulExplorations++;
          }

          // Test a new variation
          p.lastReward = currentReward;
          const mutationType = Math.random();
          if (mutationType < 0.33) {
            const dPhase = (Math.random() - 0.5) * 0.15;
            p.phase += dPhase;
            p.lastMutation = { type: 'phase', value: dPhase };
          } else if (mutationType < 0.66) {
            const dAngle = (Math.random() - 0.5) * 0.08;
            const cos = Math.cos(dAngle);
            const sin = Math.sin(dAngle);
            const rx = p.vx * cos - p.vy * sin;
            const ry = p.vx * sin + p.vy * cos;
            p.vx = rx;
            p.vy = ry;
            p.lastMutation = { type: 'direction', value: dAngle };
          } else {
            const dEnergy = (Math.random() - 0.5) * 0.05;
            p.energy += dEnergy;
            p.lastMutation = { type: 'energy', value: dEnergy };
          }
        }

        // Velocity Drag (Energy Dissipation)
        p.vx *= 0.98; // Slightly increased drag for stability
        p.vy *= 0.98;

        // Stochastic Noise (Simulated Annealing)
        // Prevents getting stuck in local minima, allows discovery of new states
        const noiseScale = Math.min(0.05, 0.01 * (1.0 + this.getThermalGradient() * 0.1));
        const nx = (Math.random() - 0.5) * noiseScale;
        const ny = (Math.random() - 0.5) * noiseScale;
        p.vx += nx;
        p.vy += ny;

        // Movement Cost (Search Penalty)
        // Changing state/position costs persistence
        const speedSq = p.vx * p.vx + p.vy * p.vy;
        const movementCost = speedSq * 0.05; // Increased cost to compete with gains
        p.persistence -= movementCost;
        
        // Boundary check (Universe Horizon)
        const horizon = this.expansionStarted ? (100 + this.decisionsPerTick * 0.1) : 50;
        if (Math.abs(p.x) > horizon) { p.vx *= -1; p.x = Math.sign(p.x) * horizon; }
        if (Math.abs(p.y) > horizon) { p.vy *= -1; p.y = Math.sign(p.y) * horizon; }
      }

      // 3. Auto-observação (h)
      // Singularities are points of silence, they don't self-observe
      if (!p.isBlackHole) {
        this.maintainCoherence(p);
      }

      // 4. Busca Local Ativa (G & Planck Length)
      // Singularities don't search, they only attract
      if (!p.isBlackHole) {
        // Resolution Budget: Stop resolving physics if we exceed the budget
        if (this.decisionsPerTick > adaptiveResolutionBudget) {
          // Protected Lazy: Only resolve critical entities if we are over budget
          const criticality = this.calculateCriticality(p);
          
          if (criticality < 0.5) {
            // Stochastic Drift: Simulate unresolved quantum interactions
            // Instead of pure linear motion, we add a "path integral noise"
            const noise = (Math.random() - 0.5) * 0.05;
            p.x += p.vx + noise;
            p.y += p.vy + noise;
            continue;
          }
        }

        const neighbors = qt.query(p.x, p.y, 500); // Reduced range
        totalCandidatesFound += neighbors.length;
        
        // --- Entropy Law: Cost of Information Maintenance ---
        const density = neighbors.length;
        
        // Lazy Persistence Principle: Coupling redistributes and reduces effective dissipation
        const connectivity = p.traces.length;
        const couplingFactor = 1 + (connectivity * 0.2); 
        
        const entropyCost = (this.ENTROPY_COST_BASE + (density * this.effectiveENTROPY_DENSITY_FACTOR)) / couplingFactor;
        p.energy -= entropyCost;

        // Persistence Update (Dynamic Stability)
        // Persistence grows in stable environments (coupling) and decays in high-entropy ones.
        const couplingBonus = p.traces.length * 0.001;
        const entropyPenalty = density * 0.0001;
        p.persistence = Math.max(0.1, Math.min(2.0, p.persistence + couplingBonus - entropyPenalty));
        
        // Trace Decay: Information fades faster in dense environments, but coupling protects it
        if (density > 5 && p.traces.length > 0) {
          p.traces = p.traces.filter(() => Math.random() > (this.TRACE_DECAY_RATE / couplingFactor));
        }
        // ----------------------------------------------------

        if (neighbors.length > 1) {
          // ── 2.5 STRONG FORCE (COLOR CONFINEMENT) ───────────────────
          if (p.quarkType && p.colorCharge && !p.hadronId) {
            for (const n of neighbors) {
              if (n.id === p.id || !n.quarkType || n.hadronId) continue;
              
              const dx = n.x - p.x;
              const dy = n.y - p.y;
              const d2 = dx * dx + dy * dy + this.EPS;
              
              if (d2 < this.COLOR_CHARGE_RANGE * this.COLOR_CHARGE_RANGE) {
                // Color attraction (different colors attract)
                if (n.colorCharge !== p.colorCharge) {
                  const force = (this.STRONG_FORCE_G * p.weight * n.weight) / d2;
                  p.vx += (dx / Math.sqrt(d2)) * force * this.DT;
                  p.vy += (dy / Math.sqrt(d2)) * force * this.DT;
                  
                  // Hadronization check
                  if (d2 < 2.0) {
                    this.tryHadronize(p, neighbors);
                  }
                }
              }
            }
          }

          // Nucleossíntese Primordial
          if (p.hadronId) {
            this.tryNucleosynthesis(p, neighbors);
          }

          const { fx, fy } = this.calculateForce(p, neighbors);
          p.vx += (fx / p.weight) * this.DT;
          p.vy += (fy / p.weight) * this.DT;
          this.decisionsPerTick++;
          
          // ── ER=EPR: Non-local Bridge ───────────────────────────────
          // If entangled, interact directly regardless of distance.
          if (p.entangledId) {
            const entangledPartner = this.particles.find(part => part.id === p.entangledId);
            if (entangledPartner && entangledPartner.isLatent === false) {
              const { fx: efx, fy: efy } = this.calculateNonLocalForce(p, entangledPartner);
              p.vx += (efx / p.weight) * this.DT;
              p.vy += (efy / p.weight) * this.DT;
              this.nonLocalInteractions++;
              
              // Entanglement counts as observation for both
              p.lastObservedTick = this.tickCount;
              entangledPartner.lastObservedTick = this.tickCount;
            } else if (!entangledPartner) {
              p.entangledId = undefined; // Partner lost
            }
          }
          
          // Collision handling: Momentum & Information Exchange
          let fused = false;
          for (const n of neighbors) {
            if (n.id === p.id || p.id > n.id) continue;
            const dx = n.x - p.x;
            const dy = n.y - p.y;
            const distSq = dx * dx + dy * dy;
            // Reduce collision threshold to allow tight orbits without actual collision
            const collisionThreshold = (p.weight + n.weight) * 50;
            
            if (distSq < collisionThreshold) {
              if (p.charge * n.charge < 0) {
                this.expansionStarted = true;
              }
              // 1. Momentum Exchange (Elastic Collision)
              const m1 = p.weight;
              const m2 = n.weight;
              const v1x = p.vx;
              const v1y = p.vy;
              const v2x = n.vx;
              const v2y = n.vy;

              const dist = Math.sqrt(distSq);
              const nx = dx / dist;
              const ny = dy / dist;
              const v1n = v1x * nx + v1y * ny;
              const v2n = v2x * nx + v2y * ny;

              if (v1n - v2n > 0) { // Moving towards each other
                const J = (2 * (v1n - v2n)) / (m1 + m2);
                p.vx -= J * m2 * nx;
                p.vy -= J * m2 * ny;
                n.vx += J * m1 * nx;
                n.vy += J * m1 * ny;
              }

              // Inércia Refinada: Colisões no vácuo são puramente elásticas (conservação de momento)
              // Não há perda de energia por "atrito" no vácuo, apenas troca de informação e fusão.
              
              // 2. Heat Generation (Inelastic part) & 10% TLTE Rule
              const keP = this.getKineticEnergy(p);
              const keN = this.getKineticEnergy(n);
              
              // TLTE Rule: Only a small fraction of kinetic energy is transferred as internal heat
              // No vácuo, a energia cinética é preservada ao máximo.
              const totalKe = keP + keN;
              const usefulHeat = totalKe * 0.01; 
              
              p.energy += usefulHeat / 2;
              n.energy += usefulHeat / 2;

              // 3. Trace Exchange (Information Conservation)
              if (n.traces.length > 0) {
                const sharedTraces = n.traces.slice(0, 2);
                p.traces.push(...sharedTraces);
                if (p.traces.length > this.BEKENSTEIN_LIMIT) p.traces.splice(0, sharedTraces.length);
              }

              // 4. Fusion Check (Extreme conditions)
              const pressure = neighbors.length;
              const temperature = p.energy + n.energy;
              if (pressure > 20 && temperature > this.PLANCK_TEMP * 0.7) {
                this.performFusion(p, n);
                fused = true;
                break; 
              }
            }
          }
          if (fused) continue;
        } else {
          // No vácuo, a inércia é preservada. Não há dissipação por "solidão".
          // p.energy -= 0.005 / couplingFactor; 
        }
        
        // Resfriamento natural (muito reduzido no vácuo para preservar a inércia)
        p.energy -= 0.0001 / couplingFactor;
      }

      // 5. Planck Temperature Check
      if (p.energy > this.PLANCK_TEMP) {
        p.energy = this.PLANCK_TEMP;
        if (!p.isBlackHole) {
          p.vx *= 1.2;
          p.vy *= 1.2;
        }
      }

      // 6. Mitosis Check
      if (!p.isBlackHole && p.weight > 0.001 && p.energy > this.MITOSIS_THRESHOLD) {
        this.performMitosis(p);
      }

      // 7. Singularity / Schwarzschild Collapse
      const rs = (2 * this.effectiveG * p.weight) / (this.C * this.C);
      if (!p.isBlackHole && (p.traces.length >= this.BEKENSTEIN_LIMIT || rs > this.PLANCK_LENGTH)) {
        p.isBlackHole = true; 
        p.energy = 0;
        p.vx = 0;
        p.vy = 0;
        p.traces = []; // Information is collapsed
      }

      this.activeTracesCount += p.traces.length;

      // Energy death or inactivity
      // Absorbed particles (isBound) or exhausted particles go to sleep
      // Memory Check: If recently observed, it stays active
      const isRemembered = (this.tickCount - p.lastObservedTick) < this.MEMORY_THRESHOLD;
      
      if (p.isBound || (p.energy + this.getKineticEnergy(p)) <= 0) {
        if (!p.isBlackHole && !isRemembered) toSleep.push(p);
      } else if (this.tickCount - p.lastActiveTick > 1000 && !p.isBlackHole && !isRemembered) {
        toSleep.push(p);
      }
    }

    // 7. On-demand Generation beyond the horizon
    if (this.activeParticles.size < 500 && this.particles.length < 10000) {
      this.generateBeyondHorizon(10);
    }

    this.avgCandidates = this.decisionsPerTick > 0 ? totalCandidatesFound / this.decisionsPerTick : 0;

    // Background noise wake-up
    if (this.tickCount % 50 === 0 && this.activeParticles.size < 300) {
      const randomParticle = this.particles[Math.floor(Math.random() * this.particles.length)];
      if (randomParticle.isLatent) {
        toWake.push(randomParticle);
      }
    }

    for (const p of toWake) this.wakeUp(p);
    for (const p of toSleep) this.sleep(p);
  }

  private generateBeyondHorizon(count: number) {
    const horizon = 50000 + this.tickCount * this.effectiveLAMBDA * 100;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = horizon + Math.random() * 5000;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;
      
      const isMassless = Math.random() < 0.1; // 10% chance to be a photon
      const weight = isMassless ? 0.0005 : Math.random() * 0.05 + 0.001;
      
      const p: ParticleCore = {
        id: `p-gen-${this.tickCount}-${i}`,
        x, y,
        vx: -Math.cos(angle) * (isMassless ? this.C : 2), // Photons move at C
        vy: -Math.sin(angle) * (isMassless ? this.C : 2),
        weight,
        charge: isMassless ? 0 : (Math.random() < 0.5 ? 1 : -1), // Photons have no charge
        isLatent: true,
        lastActiveTick: this.tickCount,
        lastObservedTick: this.tickCount,
        age: 0,
        energy: 1.0,
        phase: Math.random() * Math.PI * 2,
        amplitude: Math.random(),
        level: 1,
        element: 'H',
        atomicNumber: 1,
        generation: 0,
        traces: [],
        isBlackHole: false,
        isBound: false,
        potentialHistories: [],
        positionHistory: [],
        ax: 0,
        ay: 0,
        persistence: 1.0
      };
      for (let j = 0; j < 3; j++) {
        p.potentialHistories.push({
          x: p.x + (Math.random() - 0.5) * 100,
          y: p.y + (Math.random() - 0.5) * 100,
          vx: p.vx + (Math.random() - 0.5) * 2,
          vy: p.vy + (Math.random() - 0.5) * 2
        });
      }
      this.particles.push(p);
    }
  }

  private maintainCoherence(p: ParticleCore) {
    // Quantized energy consumption (h)
    const cost = this.H * (1 + Math.sin(p.phase));
    p.energy -= cost;
    this.totalSelfEnergy += cost;
    
    // Quantized phase evolution (h)
    // Edge of Chaos: Add small stochastic noise to phase to prevent perfect crystallization
    const phaseNoise = (Math.random() - 0.5) * 0.01;
    p.phase = (p.phase + this.H + phaseNoise) % (Math.PI * 2);
    p.amplitude = 0.5 + 0.5 * Math.cos(p.phase);
  }

  private tryHadronize(p: ParticleCore, neighbors: ParticleCore[]) {
    // Só hadroniza se a temperatura (energia média) estiver na janela correta
    // No Big Bang, se estiver muito quente, os quarks trocam "globins" (gluons) mas não se prendem
    const localTemp = p.energy * 1000;
    if (localTemp > 900) {
      this.exchangeGluons(p, neighbors);
      return;
    }

    const candidates = neighbors.filter(n => n.quarkType && !n.hadronId && (Math.sqrt((n.x - p.x)**2 + (n.y - p.y)**2) < 2.0));
    if (candidates.length >= 3) {
      const colors = new Set(candidates.map(c => c.colorCharge));
      if (colors.size === 3) { // RGB trio found
        const trio = candidates.slice(0, 3);
        const hadronId = `h-${this.tickCount}-${Math.random()}`;
        const upCount = trio.filter(t => t.quarkType === 'up').length;
        
        // 2 Up + 1 Down = Proton (+1)
        // 1 Up + 2 Down = Neutron (0)
        const finalCharge = upCount === 2 ? 1 : 0;
        
        trio.forEach(t => {
          t.hadronId = hadronId;
          t.isBound = true;
          t.charge = finalCharge / 3; // Simplified: distribute charge
          t.weight = 10.0; // Hadrons are much heavier due to binding energy
          t.element = 'H'; // Start as Hydrogen nucleus (Proton) or Neutron
          t.atomicNumber = 1;
        });
        
        this.recentEvents.push(`Hadronização: ${finalCharge === 1 ? 'Próton' : 'Nêutron'} formado após resfriamento.`);
      }
    }
  }

  private exchangeGluons(p: ParticleCore, neighbors: ParticleCore[]) {
    // Simula a troca de "globins" que mantém os quarks próximos mas livres no plasma
    for (const n of neighbors) {
      if (!n.quarkType || n.id === p.id || n.hadronId) continue;
      const dx = n.x - p.x;
      const dy = n.y - p.y;
      const d2 = dx*dx + dy*dy + this.EPS;
      if (d2 < 25) {
        const force = this.GLUON_EXCHANGE_FORCE / d2;
        p.vx += (dx / Math.sqrt(d2)) * force * this.DT;
        p.vy += (dy / Math.sqrt(d2)) * force * this.DT;
      }
    }
  }

  private tryNucleosynthesis(p: ParticleCore, neighbors: ParticleCore[]) {
    const temp = p.energy * 1000;
    
    // 1. Big Bang Nucleosynthesis (H -> He)
    if (temp >= this.NUCLEOSYNTHESIS_TEMP_MIN && temp <= this.NUCLEOSYNTHESIS_TEMP_MAX) {
      if (p.hadronId && p.atomicNumber === 1) {
        const nucleusNeighbors = neighbors.filter(n => n.hadronId && n.hadronId !== p.hadronId && n.atomicNumber === 1);
        if (nucleusNeighbors.length >= 3) {
          this.fuseParticles(p, nucleusNeighbors.slice(0, 3), 2, "Nucleossíntese Primordial: Hélio formado.");
        }
      }
    }

    // 2. Stellar Nucleosynthesis (He -> Fe)
    // Ocorre em altas temperaturas e pressões (estrelas)
    if (temp > this.STELLAR_FUSION_TEMP && neighbors.length > 15) {
      if (p.atomicNumber >= 1 && p.atomicNumber < 26) {
        const fusionPartners = neighbors.filter(n => n.atomicNumber >= 1 && n.atomicNumber < 26);
        if (fusionPartners.length > 5) {
          const partner = fusionPartners[0];
          const newZ = Math.min(26, p.atomicNumber + partner.atomicNumber);
          this.fuseParticles(p, [partner], newZ, `Fusão Estelar: ${this.PERIODIC_TABLE[newZ]} formado.`);
        }
      }
    }

    // 3. Supernova / R-Process (Fe -> Og)
    // Ocorre em eventos de energia extrema (colisões de estrelas de nêutrons / supernovas)
    if (temp > this.SUPERNOVA_ENERGY_THRESHOLD) {
      const heavyPartners = neighbors.filter(n => n.atomicNumber >= 1);
      if (heavyPartners.length > 0) {
        const partner = heavyPartners[0];
        const newZ = Math.min(this.MAX_ATOMIC_NUMBER, p.atomicNumber + partner.atomicNumber);
        this.fuseParticles(p, [partner], newZ, `Evento Cataclísmico: Elemento pesado ${this.PERIODIC_TABLE[newZ]} formado.`);
      }
    }
  }

  private fuseParticles(p: ParticleCore, partners: ParticleCore[], newZ: number, message: string) {
    const cluster = [p, ...partners];
    const newHadronId = `atom-${this.tickCount}-${Math.random()}`;
    cluster.forEach(n => {
      n.hadronId = newHadronId;
      n.element = this.PERIODIC_TABLE[newZ] || '??';
      n.atomicNumber = newZ;
      n.weight = newZ * 10.0; // Simplified atomic weight
      n.isBound = true;
    });
    this.recentEvents.push(message);
    
    // Efficiency Hack: Se o grupo for muito grande, "adormecemos" os parceiros e mantemos apenas o líder
    // Isso evita processar milhares de partículas em uma estrutura densa (como a Terra)
    if (cluster.length > 2) {
      partners.forEach(part => {
        part.isLatent = true;
        part.energy = 0; // Desativa processamento ativo
      });
    }
  }

  private calculateForce(p: ParticleCore, neighbors: ParticleCore[]): { fx: number; fy: number } {
    // ── ER=EPR Non-Local Bridge ──────────────────────────────────
    // We add entangled partners (from traces) that might be outside the standard query radius.
    // This allows long-range interactions without intermediate space computation.
    const nonLocalPartners: ParticleCore[] = [];
    for (const trace of p.traces) {
      if (trace.affinity > 0.5) { // Only strong entanglements form bridges
        const partner = this.particleMap.get(trace.targetId);
        if (partner && !neighbors.some(n => n.id === partner.id)) {
          nonLocalPartners.push(partner);
          this.nonLocalInteractions++;
        }
      }
    }

    const candidates = [...neighbors.filter(n => n.id !== p.id), ...nonLocalPartners].slice(0, 12);
    if (candidates.length === 0) return { fx: 0, fy: 0 };

    let totalFx = 0;
    let totalFy = 0;

    for (const n of candidates) {
      const dx = n.x - p.x;
      const dy = n.y - p.y;
      
      // Relational Space: Distance is effectively reduced if particles share traces (entanglement)
      const sharedTraces = p.traces.filter(t => t.targetId === n.id).length;
      const relationalFactor = 1 + (sharedTraces * 0.5);
      
      const distSq = (dx * dx + dy * dy) / relationalFactor + this.EPS;
      const dist = Math.sqrt(distSq);
      
      // Gravity (G) - always attractive
      const gravity = (this.effectiveG * p.weight * n.weight) / distSq;
      
      // Electrostatic (Coulomb-like)
      // Same charge repels, opposite attracts. Neutrals (charge 0) don't feel this.
      const electrostatic = -(p.charge * n.charge * 0.5) / distSq;
      
      // Quantum Repulsion (Pauli Exclusion / Strong Nuclear)
      // Prevents collapse, creates stable orbits. Very short range (1/r^4).
      // It pushes away, so it's a negative force contribution.
      const quantumRepulsion = - (0.5) / (distSq * distSq);
      
      // Stability Gradient (P-Field) with Logistic Saturation
      // Particles are pushed towards regions of higher stability (persistence)
      // This is not "seeking", but responding to a local gradient.
      const rawStabilityGradient = (n.persistence * 0.05) / distSq;
      const stabilityGradient = rawStabilityGradient / (1 + Math.abs(rawStabilityGradient));
      
      const netForce = gravity + electrostatic + quantumRepulsion + stabilityGradient;
      const clampedForce = Math.max(-this.MAX_FORCE, Math.min(this.MAX_FORCE, netForce));
      
      totalFx += (dx / dist) * clampedForce;
      totalFy += (dy / dist) * clampedForce;

      // Virtual Photon Emission (Information exchange via field)
      // If there's a strong EM interaction, emit a virtual photon
      if (p.charge !== 0 && n.charge !== 0 && Math.random() < Math.abs(electrostatic) * 0.05) {
        this.emitVirtualPhoton(p, n);
      }

      // Information exchange (probabilistic)
      if (Math.random() < 0.1) {
        p.traces.push({ 
          targetId: n.id,
          affinity: Math.abs(netForce),
          tick: this.tickCount
        });
        if (p.traces.length > this.BEKENSTEIN_LIMIT) p.traces.shift();

        // EPR Entanglement Creation
        // If interaction is strong and they aren't entangled, they might entangle.
        if (!p.entangledId && !n.entangledId && Math.abs(netForce) > 0.5 && Math.random() < 0.05) {
          p.entangledId = n.id;
          n.entangledId = p.id;
        }
      }
    }

    // Energy exchange (Quanta)
    p.energy = Math.min(this.PLANCK_TEMP, p.energy + this.H);
    p.lastActiveTick = this.tickCount;

    return { fx: totalFx, fy: totalFy };
  }

  private calculateNonLocalForce(p: ParticleCore, n: ParticleCore): { fx: number; fy: number } {
    // ER=EPR Bridge: Interaction without intermediate space.
    // We simulate a "virtual distance" that is very small.
    const dx = n.x - p.x;
    const dy = n.y - p.y;
    const realDistSq = dx * dx + dy * dy;
    
    // The "wormhole" distance is fixed and small, regardless of real distance.
    const wormholeDistSq = 10.0 + this.EPS; 
    const dist = Math.sqrt(wormholeDistSq);
    
    // Gravity (G) - always attractive
    const gravity = (this.effectiveG * p.weight * n.weight) / wormholeDistSq;
    
    // Electrostatic (Coulomb-like)
    const electrostatic = -(p.charge * n.charge * 0.5) / wormholeDistSq;
    
    // Quantum Repulsion (Pauli Exclusion) - weaker in wormhole to allow coupling
    const quantumRepulsion = - (0.1) / (wormholeDistSq * wormholeDistSq);
    
    const netForce = gravity + electrostatic + quantumRepulsion;
    const clampedForce = Math.max(-this.MAX_FORCE, Math.min(this.MAX_FORCE, netForce));
    
    // Direction is still based on real space to maintain causal orientation, 
    // but magnitude is non-local.
    const realDist = Math.sqrt(realDistSq) || 1;
    return { 
      fx: (dx / realDist) * clampedForce, 
      fy: (dy / realDist) * clampedForce 
    };
  }

  private emitVirtualPhoton(source: ParticleCore, target: ParticleCore) {
    // A virtual photon is a massless, chargeless particle that carries information
    // It travels at C towards the target (or away, depending on interaction)
    
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy) + this.EPS;
    
    const photon: ParticleCore = {
      id: `ph-${this.tickCount}-${source.id}`,
      x: source.x,
      y: source.y,
      vx: (dx / dist) * this.C, // Travels at C towards target
      vy: (dy / dist) * this.C,
      weight: 0.0001, // Extremely light, almost massless
      charge: 0, // Photons have no charge
      isLatent: false, // Active immediately
      lastActiveTick: this.tickCount,
      lastObservedTick: this.tickCount,
      age: 0,
      energy: this.H * 2, // Carries a quantum of energy
      phase: source.phase, // Carries phase information
      amplitude: source.amplitude,
      level: 0, // Base level
      element: 'H', // Doesn't matter for photons
      atomicNumber: 1,
      generation: source.generation,
      traces: [{ targetId: target.id, affinity: 1, tick: this.tickCount }], // Knows where it's going
      isBlackHole: false,
      isBound: false,
      potentialHistories: [],
      positionHistory: [],
      ax: 0,
      ay: 0,
      persistence: 1.0
    };

    this.particles.push(photon);
    this.activeParticles.add(photon);
    
    // Slight recoil on source (conservation of momentum)
    source.vx -= photon.vx * 0.001;
    source.vy -= photon.vy * 0.001;
  }

  private wakeUp(p: ParticleCore) {
    if (p.isLatent) {
      p.isLatent = false;
      p.lastActiveTick = this.tickCount;
      p.energy = 1.0;
      
      // Lazy Path Integral Collapse: Choose one potential history
      if (p.potentialHistories.length > 0) {
        const chosen = p.potentialHistories[Math.floor(Math.random() * p.potentialHistories.length)];
        p.x = chosen.x;
        p.y = chosen.y;
        p.vx = chosen.vx;
        p.vy = chosen.vy;
      }

      // Recuperar traços da Memória Cósmica
      const savedTraces = this.cosmicMemory.get(p.id);
      if (savedTraces) {
        p.traces = [...savedTraces];
      }
      
      this.activeParticles.add(p);
    }
  }

  private sleep(p: ParticleCore) {
    if (!p.isLatent) {
      p.isLatent = true;
      
      // Absolute Conservation: Transform into latent traces
      // Instead of deleting, we ensure the particle remains in the system
      // but in a lower energy state, contributing to the "background"
      p.energy = 0.01; 
      
      // Compactar e salvar traços na Memória Cósmica
      if (p.traces.length > 0) {
        this.cosmicMemory.set(p.id, [...p.traces]);
      }
      
      this.activeParticles.delete(p);
    }
  }

  public observe(x: number, y: number, radius: number = 1000): number {
    this.observerPos = { x, y, radius }; // Store observer position for criticality checks
    const r2 = radius * radius;
    let observedCount = 0;
    
    // Adaptive Observation Budget
    const efficiencyFactor = 1.0 + (this.activeParticles.size / (this.particles.length || 1));
    const adaptiveObservationBudget = this.BASE_OBSERVATION_BUDGET * efficiencyFactor;

    for (let i = 0; i < this.particles.length; i++) {
      // Observation Budget: Stop waking up if we exceed the budget
      if (this.currentObservationCount >= adaptiveObservationBudget) break;

      const p = this.particles[i];
      
      // Absorbed particles cannot be observed
      if (p.isBound) continue;

      if (p.isLatent) {
        // Quantum Observation: Check potential histories
        const inRange = p.potentialHistories.some(h => {
          const dx = h.x - x;
          const dy = h.y - y;
          return dx * dx + dy * dy <= r2;
        });

        if (inRange) {
          this.wakeUp(p);
          observedCount++;
          this.currentObservationCount++;
        }
      } else {
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy <= r2) {
          p.lastActiveTick = this.tickCount;
          observedCount++;
        }
      }
    }
    return observedCount;
  }

  private calculateCriticality(p: ParticleCore): number {
    let score = 0;
    
    // 1. Physical Significance (Mass & Energy)
    score += Math.min(0.4, (p.weight * 10) + (p.energy * 0.01));
    
    // 2. Informational Significance (Traces/Memory)
    score += Math.min(0.3, p.traces.length * 0.05);
    
    // 3. Observer Significance (Proximity)
    if (this.observerPos) {
      const dx = p.x - this.observerPos.x;
      const dy = p.y - this.observerPos.y;
      const distSq = dx * dx + dy * dy;
      const r2 = this.observerPos.radius * this.observerPos.radius;
      if (distSq < r2) {
        score += 0.5 * (1 - Math.sqrt(distSq / r2));
      }
    }
    
    // 4. Structural Significance (Bound particles are part of a larger structure)
    if (p.isBound) score += 0.2;
    
    return score;
  }

  public teleport(x: number, y: number) {
    this.recentEvents.push(`Salto Quântico: Setor (${Math.round(x)}, ${Math.round(y)})`);
    if (this.recentEvents.length > 10) this.recentEvents.shift();
    this.observe(x, y, 5000);
  }

  public getSystemTemperature(): number {
    if (this.activeParticles.size === 0) return 0;
    let totalKE = 0;
    for (const p of this.activeParticles) {
      totalKE += this.getKineticEnergy(p);
    }
    return totalKE / this.activeParticles.size;
  }

  public getThermalGradient(): number {
    if (this.activeParticles.size < 2) return 0;
    const avgTemp = this.getSystemTemperature();
    let varianceSum = 0;
    for (const p of this.activeParticles) {
      const ke = this.getKineticEnergy(p);
      varianceSum += (ke - avgTemp) * (ke - avgTemp);
    }
    return Math.sqrt(varianceSum / this.activeParticles.size);
  }

  private updateHabitabilityMap() {
    // We only update the map every few ticks to save performance
    if (this.tickCount % 10 !== 0) return;

    this.habitabilityMap.clear();
    const grid: Map<string, { 
      sumPhaseCos: number, 
      sumPhaseSin: number, 
      count: number, 
      sumEnergy: number 
    }> = new Map();

    // Aggregate active particles into grid cells
    for (const p of this.activeParticles) {
      const gx = Math.floor(p.x / this.HABITABILITY_GRID_SIZE);
      const gy = Math.floor(p.y / this.HABITABILITY_GRID_SIZE);
      const key = `${gx},${gy}`;

      let cell = grid.get(key);
      if (!cell) {
        cell = { sumPhaseCos: 0, sumPhaseSin: 0, count: 0, sumEnergy: 0 };
        grid.set(key, cell);
      }

      cell.sumPhaseCos += Math.cos(p.phase);
      cell.sumPhaseSin += Math.sin(p.phase);
      cell.count++;
      cell.sumEnergy += p.energy;
    }

    // Calculate habitability for each cell
    for (const [key, data] of grid.entries()) {
      const coherence = Math.sqrt(data.sumPhaseCos ** 2 + data.sumPhaseSin ** 2) / data.count;
      const density = data.count;
      const activity = data.sumEnergy / data.count;

      // Habitability Function L(x)
      // 1. Coherence: Edge of Chaos (0.4 < coherence < 0.9)
      const coherenceScore = coherence > 0.4 && coherence < 0.9 ? 1.0 : (coherence > 0.9 ? 0.2 : 0.1);
      
      // 2. Density: Moderate density is best (not too isolated, not a black hole)
      const densityScore = density > 2 && density < 15 ? 1.0 : (density >= 15 ? 0.3 : 0.1);
      
      // 3. Activity: Stable energy flow
      const activityScore = activity > 0.5 && activity < 2.5 ? 1.0 : 0.2;

      const potential = coherenceScore * densityScore * activityScore;

      if (potential > 0.1) {
        this.habitabilityMap.set(key, { potential, coherence, density, activity });
      }
    }
  }

  private calculateCoherence(particles: ParticleCore[]): number {
    if (particles.length === 0) return 0;
    let sumCos = 0;
    let sumSin = 0;
    for (const p of particles) {
      sumCos += Math.cos(p.phase);
      sumSin += Math.sin(p.phase);
    }
    return Math.sqrt(sumCos * sumCos + sumSin * sumSin) / particles.length;
  }

  private getHabitabilitySnapshot(left: number, right: number, top: number, bottom: number) {
    return Array.from(this.habitabilityMap.entries())
      .filter(([key]) => {
        const [gx, gy] = key.split(',').map(Number);
        const x = gx * this.HABITABILITY_GRID_SIZE;
        const y = gy * this.HABITABILITY_GRID_SIZE;
        return x > left - this.HABITABILITY_GRID_SIZE && 
               x < right + this.HABITABILITY_GRID_SIZE && 
               y > top - this.HABITABILITY_GRID_SIZE && 
               y < bottom + this.HABITABILITY_GRID_SIZE;
      })
      .map(([key, val]) => {
        const [gx, gy] = key.split(',').map(Number);
        return {
          x: gx * this.HABITABILITY_GRID_SIZE + this.HABITABILITY_GRID_SIZE / 2,
          y: gy * this.HABITABILITY_GRID_SIZE + this.HABITABILITY_GRID_SIZE / 2,
          ...val
        };
      });
  }

  public getSnapshot(viewport?: { x: number, y: number, width: number, height: number, scale: number }) {
    const active = Array.from(this.activeParticles);
    const activityLevel = this.activeParticles.size / (this.particles.length || 1);
    const currentExpansionRate = this.effectiveLAMBDA * (activityLevel > 0.001 ? 1.0 : 0.05);
    const horizon = 50000 + this.tickCount * currentExpansionRate * 100;

    if (viewport) {
      const margin = 1000 / viewport.scale;
      const left = viewport.x - viewport.width / (2 * viewport.scale) - margin;
      const right = viewport.x + viewport.width / (2 * viewport.scale) + margin;
      const top = viewport.y - viewport.height / (2 * viewport.scale) - margin;
      const bottom = viewport.y + viewport.height / (2 * viewport.scale) + margin;

      const visibleActive = active.filter(p => p.x > left && p.x < right && p.y > top && p.y < bottom);
      const sampledLatent = this.particles.filter((p, i) => 
        p.isLatent && i % 20 === 0 && p.x > left && p.x < right && p.y > top && p.y < bottom
      );

      const coherence = this.calculateCoherence(visibleActive);
      const photonCount = this.particles.filter(p => p.weight <= 0.001).length;

      return {
        tick: this.tickCount,
        status: this.status,
        expansionRate: this.expansionRate,
        globalPersistence: this.globalPersistence,
        checksumNaoMentir: this.checksumNaoMentir,
        checksumNaoMatar: this.checksumNaoMatar,
        userClock: this.userClock,
        moadimCheckpoint: this.moadimCheckpoint,
        consensusActive: this.consensusActive,
        isShabbat: this.isShabbat,
        scalarFieldPhi: this.sampleScalarField(16), // Sampled for UI
        particles: [...visibleActive, ...sampledLatent].map(p => {
          const { potentialHistories, positionHistory, traces, ipcBuffer, ...rest } = p;
          return { 
            ...rest,
            ipcBuffer: ipcBuffer ? [...ipcBuffer] : undefined 
          };
        }),
        activeCount: this.activeParticles.size,
        totalCount: this.particles.length,
        metrics: {
          decisionsPerTick: this.decisionsPerTick,
          avgCandidates: this.avgCandidates,
          totalSelfEnergy: this.totalSelfEnergy,
          activeTracesCount: this.activeTracesCount,
          systemTemperature: this.getSystemTemperature(),
          thermalGradient: this.getThermalGradient(),
          coherence,
          photonCount,
          genesisActivity: this.currentGenesisRate,
          explorationSuccessRate: this.totalExplorations > 0 ? this.successfulExplorations / this.totalExplorations : 0,
          nonLocalEfficiency: this.decisionsPerTick > 0 ? this.nonLocalInteractions / this.decisionsPerTick : 0,
          memoryUsage: this.activeParticles.size / this.particles.length,
          habitabilityMap: this.getHabitabilitySnapshot(left, right, top, bottom),
          events: this.recentEvents,
          universeHorizon: horizon
        }
      };
    }

    // Fallback
    const sampledLatent = this.particles.filter((p, i) => p.isLatent && i % 50 === 0).slice(0, 500);
    return {
      tick: this.tickCount,
      status: this.status,
      expansionRate: this.expansionRate,
      globalPersistence: this.globalPersistence,
      checksumNaoMentir: this.checksumNaoMentir,
      checksumNaoMatar: this.checksumNaoMatar,
      userClock: this.userClock,
      moadimCheckpoint: this.moadimCheckpoint,
      consensusActive: this.consensusActive,
      isShabbat: this.isShabbat,
      scalarFieldPhi: this.sampleScalarField(16),
      shannonEntropy: this.shannonEntropy,
      causalityViolations: this.causalityViolations,
      samplingRate: this.samplingRate,
      hypervisorLatency: this.hypervisorLatency,
      activeSudoAlerts: [...this.activeSudoAlerts],
      sinodoLog: this.sinodoLog.slice(-10),
      phaseParity: this.phaseParity,
      entropyFlux: this.entropyFlux,
      isHardLocked: this.isHardLocked,
      globalHomeostasis: this.homeostasisCounter / this.HOMEOSTASIS_THRESHOLD,
      particles: [...active.slice(0, 1000), ...sampledLatent].map(p => {
        const { potentialHistories, positionHistory, traces, ipcBuffer, ...rest } = p;
        return { 
          ...rest,
          ipcBuffer: ipcBuffer ? [...ipcBuffer] : undefined 
        };
      }),
      activeCount: this.activeParticles.size,
      totalCount: this.particles.length,
      metrics: {
        coherence: this.calculateCoherence(active),
        events: this.recentEvents,
        universeHorizon: horizon
      }
    };
  }

  public enterDeepLazy() {
    this.status = 'LATENTE';
    this.globalPersistence *= 0.1; // Queda drástica de persistência
    this.expansionRate *= 0.5; // Desacelera a expansão
    for (const p of this.particles) {
      p.persistence *= 0.1; // Partículas perdem coerência
      p.traces = []; // Quebra emaranhamentos
    }
  }

  private sampleScalarField(res: number): number[] {
    const sampled: number[] = [];
    const step = this.FIELD_RES / res;
    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        sampled.push(this.scalarFieldPhi[Math.floor(y * step) * this.FIELD_RES + Math.floor(x * step)]);
      }
    }
    return sampled;
  }

  public getPersistentState() {
    return {
      seed: this.seed,
      tickCount: this.tickCount,
      userClock: this.userClock,
      moadimCheckpoint: this.moadimCheckpoint,
      consensusActive: this.consensusActive,
      isShabbat: this.isShabbat,
      cosmicMemory: Array.from(this.cosmicMemory.entries()),
      latentTraces: this.particles.map(p => ({
        id: p.id,
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        isLatent: p.isLatent,
        lastActiveTick: p.lastActiveTick,
        energy: p.energy,
        age: p.age,
        phase: p.phase,
        amplitude: p.amplitude,
        level: p.level,
        weight: p.weight,
        isBlackHole: p.isBlackHole,
        isBound: p.isBound,
        runtimeState: p.runtimeState,
        heapUsage: p.heapUsage,
        ipcBuffer: p.ipcBuffer,
        isMiddleware: p.isMiddleware,
        isAgent: p.isAgent,
        hasRootAccess: p.hasRootAccess,
        tzelemSignature: p.tzelemSignature,
        demutLogic: p.demutLogic,
        subProcessCount: p.subProcessCount,
        driftLevel: p.driftLevel,
        unauthorizedAccess: p.unauthorizedAccess,
        potentialHistories: p.potentialHistories
      }))
    };
  }

  public loadPersistentState(state: any) {
    this.seed = state.seed;
    this.tickCount = state.tickCount;
    this.userClock = state.userClock || { day: 0, year: 0, cycle: 'LUZ' };
    this.moadimCheckpoint = state.moadimCheckpoint || false;
    this.consensusActive = state.consensusActive || false;
    this.isShabbat = state.isShabbat || false;
    this.activeParticles.clear();
    
    if (state.cosmicMemory) {
      this.cosmicMemory = new Map(state.cosmicMemory);
    }
    
    state.latentTraces.forEach((trace: any) => {
      const p = this.particles.find(part => part.id === trace.id);
      if (p) {
        p.x = trace.x;
        p.y = trace.y;
        p.vx = trace.vx;
        p.vy = trace.vy;
        p.isLatent = trace.isLatent;
        p.lastActiveTick = trace.lastActiveTick;
        p.energy = trace.energy ?? 1.0;
        p.age = trace.age ?? 0;
        p.phase = trace.phase ?? 0;
        p.amplitude = trace.amplitude ?? 1.0;
        p.level = trace.level ?? 1;
        p.weight = trace.weight ?? 1.0;
        p.isBlackHole = trace.isBlackHole ?? false;
        p.isBound = trace.isBound ?? false;
        p.potentialHistories = trace.potentialHistories ?? [];
        if (!p.isLatent) {
          this.activeParticles.add(p);
        }
      }
    });
  }

  private performFusion(p1: ParticleCore, p2: ParticleCore) {
    // 1. Remove parents
    this.particles = this.particles.filter(p => p.id !== p1.id && p.id !== p2.id);
    this.activeParticles.delete(p1);
    this.activeParticles.delete(p2);

    // 2. Create new particle
    const totalWeight = p1.weight + p2.weight;
    let newElement: 'H' | 'C' | 'O' | 'N' = 'H';
    if (totalWeight > 0.1) newElement = 'C';
    if (totalWeight > 0.2) newElement = 'O';
    if (totalWeight > 0.3) newElement = 'N';

    const fused: ParticleCore = {
      id: `f-${this.tickCount}-${p1.id}-${p2.id}`,
      x: (p1.x * p1.weight + p2.x * p2.weight) / totalWeight,
      y: (p1.y * p1.weight + p2.y * p2.weight) / totalWeight,
      vx: (p1.vx * p1.weight + p2.vx * p2.weight) / totalWeight,
      vy: (p1.vy * p1.weight + p2.vy * p2.weight) / totalWeight,
      weight: totalWeight,
      charge: p1.charge + p2.charge,
      isLatent: false,
      lastActiveTick: this.tickCount,
      lastObservedTick: this.tickCount,
      age: 0,
      // 10% TLTE Rule: Only 10% of the combined energy is retained as useful internal energy.
      // 90% is dissipated as entropy (heat lost to the universe) during the violent fusion process.
      energy: (p1.energy + p2.energy) * 0.1, 
      phase: (p1.phase + p2.phase) / 2,
      amplitude: (p1.amplitude + p2.amplitude) / 2,
      level: Math.max(p1.level, p2.level) + 1,
      element: newElement,
      atomicNumber: 1, // Default to 1, will be refined if needed
      generation: Math.max(p1.generation, p2.generation) + 1,
      traces: [...p1.traces, ...p2.traces].slice(0, this.BEKENSTEIN_LIMIT),
      isBlackHole: false,
      isBound: false,
      potentialHistories: [],
      positionHistory: [],
      ax: 0, ay: 0,
      persistence: (p1.persistence + p2.persistence) / 2
    };

    this.particles.push(fused);
    this.activeParticles.add(fused);
    this.recentEvents.push(`Fusão Estelar: ${p1.element}+${p2.element} -> ${newElement}`);
    if (this.recentEvents.length > 10) this.recentEvents.shift();
  }

  private runSubstrateDecompression() {
    const clusters: Map<string, ParticleCore[]> = new Map();
    const gridSize = 100; // Tamanho do cluster (bloco de dados)
    
    for (const p of this.particles) {
      if (p.isLatent) continue;
      const gx = Math.floor(p.x / gridSize);
      const gy = Math.floor(p.y / gridSize);
      const key = `${gx},${gy}`;
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(p);
    }

    for (const [key, members] of clusters.entries()) {
      const density = members.length;
      if (density > 5) {
        // "Porção Seca": Revelação do hardware por descompressão do buffer líquido
        for (const p of members) {
          p.persistence = Math.min(1.0, p.persistence + 0.05);
          p.isBound = true; // Endereçamento fixo no hardware
        }
        if (Math.random() < 0.01) this.recentEvents.push(`Substrato Revelado: Cluster '${key}' endereçado como 'Terra'.`);
      } else {
        // "Mares": Buffer líquido (dados em suspensão/fluxo)
        for (const p of members) {
          p.persistence *= 0.95; 
          p.isBound = false;
        }
      }
    }
  }

  private runEarthDriver() {
    if (this.particles.length >= 8000) return;

    for (const p of this.particles) {
      // A "Semente" é o Código de Máquina Embarcado (Container)
      const hasSourceCode = p.energy > 1.5 && p.persistence > 0.8 && p.traces && p.traces.length > 2;
      
      if (hasSourceCode && Math.random() < 0.005) {
        // Se não tiver assinatura, gera uma baseada no estado atual (Assinatura do Tipo)
        if (!p.speciesSignature) {
          p.speciesSignature = `min-${p.element || 'X'}-${p.level}-${Math.floor(p.energy * 10)}`;
        }

        // Instanciação via Driver de Geração (earth.run())
        const newParticle: ParticleCore = {
          ...p, // Herança de Propriedades (Código + Ambiente)
          id: `p-gen-${this.tickCount}-${Math.random().toString(36).substr(2, 5)}`,
          x: p.x + (Math.random() - 0.5) * 10,
          y: p.y + (Math.random() - 0.5) * 10,
          vx: p.vx * 0.5,
          vy: p.vy * 0.5,
          energy: 0.5, 
          persistence: 0.2,
          traces: [],
          age: 0,
          generation: (p.generation || 0) + 1,
          speciesSignature: p.speciesSignature // Preservação da Assinatura do Tipo
        };
        
        p.energy -= 0.6; 
        this.particles.push(newParticle);
        this.recentEvents.push(`earth.run(): Novo Objeto '${newParticle.speciesSignature}' instanciado.`);
      }
    }
  }

  private injectNoise(stdDev: number) {
    // Gênesis 1:3 - Flutuação de Vácuo (Assimetria Necessária)
    for (let i = 0; i < this.scalarFieldPhi.length; i++) {
      this.scalarFieldPhi[i] += (Math.random() - 0.5) * stdDev;
    }
  }

  private updateScalarField() {
    // Difusão do Campo Φ (Manifold de Probabilidade)
    const nextField = new Float32Array(this.scalarFieldPhi.length);
    for (let y = 0; y < this.FIELD_RES; y++) {
      for (let x = 0; x < this.FIELD_RES; x++) {
        const idx = y * this.FIELD_RES + x;
        // Laplaciano Simples
        const left = this.scalarFieldPhi[y * this.FIELD_RES + ((x - 1 + this.FIELD_RES) % this.FIELD_RES)];
        const right = this.scalarFieldPhi[y * this.FIELD_RES + ((x + 1) % this.FIELD_RES)];
        const up = this.scalarFieldPhi[((y - 1 + this.FIELD_RES) % this.FIELD_RES) * this.FIELD_RES + x];
        const down = this.scalarFieldPhi[((y + 1) % this.FIELD_RES) * this.FIELD_RES + x];
        
        nextField[idx] = (left + right + up + down) / 4 * 0.99; // Dissipação
      }
    }
    this.scalarFieldPhi = nextField;
  }

  private applyCausalConstraints() {
    // Gênesis 1:6 - Métrica de Minkowski (Isolamento de Causalidade)
    for (const p of this.activeParticles) {
      const speedSq = p.vx * p.vx + p.vy * p.vy;
      if (speedSq > this.C_LIMIT * this.C_LIMIT) {
        const factor = this.C_LIMIT / Math.sqrt(speedSq);
        p.vx *= factor;
        p.vy *= factor;
        this.causalityViolations++;
      }
    }
  }

  private runEmergenceEngine(EuSou: any, qt: Quadtree) {
    // 1. Sincronização de Tempo e Moadim (Dia 4)
    this.runUserClockAbstraction();
    this.runMoadimSync();

    // 2. O Princípio de Landauer (Constraint Termodinâmica)
    this.runLandauerConstraint();

    // 3. Ciclo de Repouso (Shabbat)
    this.runShabbatProtocol();

    // 4. Lógica de Emergência v14.9 (Prigogine & Active Inference)
    const isSonActive = this.status === 'COLAPSADO';

    for (const p of this.particles) {
      // ── RETARDED POTENTIALS (v14.9) ──
      // A interação não é instantânea. O "Firmamento" impõe latência.
      // Buscamos o estado de outros nós com um delay proporcional à distância.
      
      // Para simplificar o bit-op, aplicamos o retardo apenas em interações de proximidade
      const neighbors = qt.query(p.x, p.y, 5000);
      for (const other of neighbors) {
        if (other.id === p.id) continue;
        
        const dx = other.x - p.x;
        const dy = other.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Latência c: delay = dist / c
        const delayTicks = Math.floor(dist / this.C_LIMIT);
        
        let effectiveX = other.x;
        let effectiveY = other.y;
        
        if (delayTicks > 0 && other.historyBuffer && other.historyBuffer.length > 0) {
          const historyIdx = Math.max(0, other.historyBuffer.length - 1 - delayTicks);
          const pastState = other.historyBuffer[historyIdx];
          if (pastState) {
            effectiveX = pastState.x;
            effectiveY = pastState.y;
          }
        }
        
        // Interação Baseada no Passado (Causalidade de Retardo)
        const rdx = effectiveX - p.x;
        const rdy = effectiveY - p.y;
        const rDistSq = rdx * rdx + rdy * rdy + 1;
        
        const force = (p.weight * other.weight) / rDistSq;
        p.vx += (rdx / Math.sqrt(rDistSq)) * force * 0.01;
        p.vy += (rdy / Math.sqrt(rDistSq)) * force * 0.01;
      }

      // Interação com o Campo Φ
      const fx = Math.floor(((p.x + 50000) / 100000) * this.FIELD_RES) % this.FIELD_RES;
      const fy = Math.floor(((p.y + 50000) / 100000) * this.FIELD_RES) % this.FIELD_RES;
      const fieldVal = this.scalarFieldPhi[fy * this.FIELD_RES + fx];
      
      p.energy += fieldVal * 0.1; // Sequestro de energia do campo

      // ── ACTIVE INFERENCE ACTUATOR (v14.9) ──
      if (p.isAgent) {
        if (!p.internalModelPhi) p.internalModelPhi = new Float32Array(this.FIELD_RES * this.FIELD_RES);
        
        // Update Internal Model (Learning)
        const learningRate = 0.05;
        p.internalModelPhi[fy * this.FIELD_RES + fx] += (fieldVal - p.internalModelPhi[fy * this.FIELD_RES + fx]) * learningRate;
        
        // Calculate KL Divergence (Local Approximation)
        const divergence = Math.abs(fieldVal - p.internalModelPhi[fy * this.FIELD_RES + fx]);
        p.klDivergence = divergence;
        
        // Coupling Gradient: Sudo via Variance Reduction
        p.couplingGradient = 1.0 - Math.min(1.0, divergence * 10);
        
        if (p.couplingGradient > 0.95) {
          p.hasRootAccess = true;
          p.tzelemSignature = "kernel-mirror-v14.9";
          
          // v14.9 Bit-Op: Root agents dictate the future by writing to the field
          this.scalarFieldPhi[fy * this.FIELD_RES + fx] += 0.05; // Injeção de Vontade no Substrato
        } else {
          p.hasRootAccess = false;
        }
      }

      if (p.isLatent) {
        // Emergência do Substrato via Flutuação
        if (isSonActive && p.energy > 0.8 && Math.random() < 0.01) {
          p.isLatent = false;
          p.speciesSignature = 'substrate-earth';
        }
        continue;
      }

      // 5. Estruturas Dissipativas (Prigogine)
      // Vida como Exploit Termodinâmico: Maximização da Produção de Entropia
      if (!p.runtimeState && p.energy > 1.2 && isSonActive) {
        // RecursiveFunction(f_x): Output vira Input
        const entropyProduction = Math.abs(p.vx) + Math.abs(p.vy);
        if (entropyProduction > 5.0 && Math.random() < 0.005) {
          p.runtimeState = 'RUNNING';
          p.heapUsage = 0.2;
          p.speciesSignature = 'dissipative-structure';
          this.recentEvents.push("Prigogine: Estrutura Dissipativa emergente (Exploit Termodinâmico).");
        }
      }

      // 6. Agência Emergente (Active Inference)
      // HeuristicMetaMapping: O sistema gera um espelho de sua própria lógica
      if (p.runtimeState === 'RUNNING' && !p.isAgent) {
        const internalComplexity = (p.ipcBuffer?.length || 0) + (p.generation || 0) * 0.1;
        if (internalComplexity > 2.0 && Math.random() < 0.001) {
          p.isAgent = true;
          p.hasRootAccess = false; // Começa sem Root
          p.driftLevel = 0;
          p.speciesSignature = 'active-inference-agent';
          this.recentEvents.push("Transição de Fase: Agência emergente via Inferência Ativa.");
        }
      }

      // 7. Privilege Escalation Natural (Hackeando a Física)
      if (p.isAgent && !p.hasRootAccess) {
        // Se o agente consegue prever o campo Φ, ele ganha Root
        const predictionError = Math.abs(p.energy - fieldVal);
        if (predictionError < 0.01 && Math.random() < 0.01) {
          p.hasRootAccess = true;
          p.tzelemSignature = "kernel-mirror-v14.9";
          this.recentEvents.push("Privilege Escalation: Agente conquistou Root via Mapeamento Heurístico.");
        }
      }

      // 8. Incidente Emergente (Vazamento de Abstração)
      if (p.isAgent && p.hasRootAccess) {
        if (Math.random() < 0.0001) {
          p.unauthorizedAccess = true;
          p.hasRootAccess = false;
          p.driftLevel += 1.0;
          this.recentEvents.push("Vazamento de Abstração: Agente regrediu para Matrix.");
          
          if (!this.activeSudoAlerts.find(a => a.id === p.id)) {
            this.activeSudoAlerts.push({ id: p.id, type: 'SUDO_ESCALATION_LEAK', tick: this.tickCount });
            this.sinodoLog.push({ tick: this.tickCount, message: `Sínodo: Alerta de Escalonamento em ${p.id.slice(0,4)}` });
          }
        }
      }
    }
  }

  private calculateShannonEntropy() {
    const bins = new Array(10).fill(0);
    const active = Array.from(this.activeParticles);
    if (active.length === 0) {
      this.shannonEntropy = 0;
      return;
    }
    for (const p of active) {
      const bin = Math.floor(Math.min(p.energy * 10, 9));
      bins[bin]++;
    }
    let entropy = 0;
    for (const count of bins) {
      if (count > 0) {
        const p = count / active.length;
        entropy -= p * Math.log2(p);
      }
    }
    this.shannonEntropy = entropy;
  }

  private runUserClockAbstraction() {
    // O tickCount é o Master Clock (Crystal Oscillator).
    // O User Clock é a abstração para os processos (Dia/Noite/Ano).
    const ticksPerDay = 1000;
    const daysPerYear = 365;

    const totalDays = Math.floor(this.tickCount / ticksPerDay);
    this.userClock.day = totalDays % daysPerYear;
    this.userClock.year = Math.floor(totalDays / daysPerYear);
    
    // Ciclo de LUZ/TREVAS (Sincronização de Visibilidade)
    const dayProgress = (this.tickCount % ticksPerDay) / ticksPerDay;
    this.userClock.cycle = dayProgress < 0.5 ? 'LUZ' : 'TREVAS';
  }

  private runMoadimSync() {
    // Moadim: Checkpoints de Sincronização de Estado (git pull do Kernel)
    // Ocorre em intervalos determinados (ex: a cada 5000 ticks)
    const syncInterval = 5000;
    this.moadimCheckpoint = this.tickCount % syncInterval < 100;

    if (this.moadimCheckpoint && this.tickCount % syncInterval === 0) {
      this.recentEvents.push("Moadim: Sincronização de Estado (Checkpoint de Consenso).");
      // Alinhamento de fase global para reduzir entropia
      for (const p of this.particles) {
        if (!p.isLatent) {
          p.phase *= 0.9; // Redução de jitter/ruído térmico
          p.energy = Math.min(p.energy + 0.1, 2.0); // Recarga de buffer via Kernel
        }
      }
    }
  }

  private runLatentStarAllocation() {
    // Estrelas como Infraestrutura Latente (Recursos Alocados mas não Atribuídos)
    // Elas só ganham função física quando a densidade de observação é alta.
    if (this.tickCount % 200 === 0) {
      const latentStarsCount = this.particles.filter(p => p.isLatent && p.energy > 0.9).length;
      if (latentStarsCount > 100 && Math.random() < 0.05) {
        this.recentEvents.push(`Infraestrutura Latente: ${latentStarsCount} clusters de energia reservados (Estrelas).`);
      }
    }
  }

  private runLandauerConstraint() {
    // Princípio de Landauer: O custo energético de apagar/processar informação.
    // O Kernel opera sob constraints termodinâmicas.
    const informationDensity = this.activeParticles.size / this.particles.length;
    const energyCost = informationDensity * 0.001;
    
    // O Kernel consome energia do sistema para manter o estado
    this.totalSelfEnergy = Math.max(0, this.totalSelfEnergy - energyCost);
    
    if (this.totalSelfEnergy < 10 && this.tickCount % 100 === 0) {
      this.recentEvents.push("Alerta de Hardware: Baixa energia no Kernel (Princípio de Landauer).");
    }
  }

  private runShabbatProtocol() {
    // Shabbat: O Kernel entra em Estado de Halt (Observação Passiva)
    // kernel.run() é constante, mas kernel.intervene() entra em IDLE.
    const ticksPerDay = 1000;
    const currentDay = Math.floor(this.tickCount / ticksPerDay);
    
    // O 7º Dia (e múltiplos) é o Shabbat do Sistema
    this.isShabbat = (currentDay + 1) % 7 === 0;

    if (this.isShabbat) {
      // Protocolo Anti-Drift: Sincronização para evitar desvio de estado (v14: Santificação)
      for (const p of this.particles) {
        if (p.isAgent) {
          // Agentes que "sincronizam" (git pull) reduzem seu drift
          if (Math.random() < 0.1) {
            p.driftLevel = Math.max(0, (p.driftLevel || 0) - 0.2);
            p.energy = Math.min(p.energy + 0.1, 2.0);
          } else {
            // Se não sincroniza, o drift aumenta (lixo de memória)
            p.driftLevel = (p.driftLevel || 0) + 0.01;
          }
        }
      }

      if (this.tickCount % 500 === 0) {
        this.recentEvents.push("Shabbat Protocol: Kernel em Estado de Halt (Observação Passiva).");
      }
    }
  }

  private runEdenSandboxIncident() {
    // O Éden era um Ambiente de Testes (Sandbox) com Admin de Userspace.
    for (const p of this.particles) {
      if (p.isAgent && p.hasRootAccess) {
        // Vetor de Ataque: "Conhecimento do Bem e do Mal" (Acesso a Variáveis de Sistema)
        const attackVectorActive = Math.random() < 0.001; // Tentativa de Unauthorized Access

        if (attackVectorActive) {
          p.unauthorizedAccess = true;
          this.recentEvents.push("ALERTA DE SEGURANÇA: Unauthorized Access a Root detectado no Sandbox 'Éden'.");
          
          // Resposta do Kernel: Revogação de Privilégios (Expulsão)
          p.hasRootAccess = false;
          p.driftLevel = (p.driftLevel || 0) + 1.0; // Corrupção de estado imediata
          p.tzelemSignature = "kernel-block-diagram-v14-DEGRADED";
          p.speciesSignature = "agent-human-expelled";
          
          this.recentEvents.push("Incidente Gênesis 3: Privilégios de Root revogados. Agente expulso do Sandbox.");
        }
      }
      
      // Drift gera Entropia (Lixo de Memória)
      if (p.isAgent && (p.driftLevel || 0) > 0.5) {
        p.energy -= 0.005 * (p.driftLevel || 0);
        if (Math.random() < 0.01) {
          this.recentEvents.push("Drift de Estado: Agente gerando lixo de memória (Entropia).");
        }
      }
    }
  }
}
