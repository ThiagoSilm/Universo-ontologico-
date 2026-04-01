import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEMORIA_PATH = path.join(process.cwd(), "memoria.json");
const ALPHA = 0.3;
const DECAIMENTO = 0.995;
const TOP_K = 5;
const N_HISTORICO = TOP_K * 2;
const PENALIDADE_RECENCIA = 0.3;
const THRESHOLD_VAZIO = 0.4;
const PESO_INICIAL_LAZY = 0.1;
const QUARENTENA_HITS = 5;

// Constantes de Física Latente
const CONSTANTE_PLANCK = 0.05; // Incerteza mínima no colapso
const PRESSAO_ENTROPICA = 0.001; // Taxa de evaporação de traços fracos
const VELOCIDADE_LUZ = 1.0; // Limite de similaridade
const GRAVIDADE_SEMANTICA = 0.2; // Atração entre traços próximos

interface Traco {
  vetor: number[];
  texto: string;
  peso: number;
  hits: number;
}

class Memoria {
  tracos: Traco[] = [];
  historico: string[] = [];

  constructor() {
    this.carregar();
  }

  carregar() {
    if (fs.existsSync(MEMORIA_PATH)) {
      try {
        const data = fs.readFileSync(MEMORIA_PATH, "utf-8");
        this.tracos = JSON.parse(data).map((t: any) => ({
          ...t,
          hits: t.hits ?? QUARENTENA_HITS // Default to out of quarantine for old traces
        }));
        console.log(`[Memória] ${this.tracos.length} traços carregados.`);
      } catch (e) {
        console.error("[Memória] Erro ao carregar memória:", e);
        this.tracos = [];
      }
    } else {
      console.log("[Memória] Iniciando sem histórico.");
    }
  }

  salvar() {
    try {
      fs.writeFileSync(MEMORIA_PATH, JSON.stringify(this.tracos, null, 2));
    } catch (e) {
      console.error("[Memória] Erro ao salvar memória:", e);
    }
  }

  similaridade(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const norma = Math.sqrt(normA) * Math.sqrt(normB);
    return norma === 0 ? 0 : dot / norma;
  }

  calculateCoherence(topTraces: Traco[]): number {
    if (topTraces.length < 2) return 1;
    let totalSim = 0;
    let count = 0;
    for (let i = 0; i < topTraces.length; i++) {
      for (let j = i + 1; j < topTraces.length; j++) {
        totalSim += this.similaridade(topTraces[i].vetor, topTraces[j].vetor);
        count++;
      }
    }
    return count === 0 ? 1 : totalSim / count;
  }

  calculateEntropy(): number {
    if (this.tracos.length === 0) return 0;
    const totalPeso = this.tracos.reduce((a, b) => a + b.peso, 0);
    if (totalPeso === 0) return 0;
    
    let entropy = 0;
    this.tracos.forEach(t => {
      const p = t.peso / totalPeso;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    });
    
    // Normalize by max possible entropy (log2 of number of traces)
    const maxEntropy = Math.log2(this.tracos.length);
    return maxEntropy === 0 ? 0 : entropy / maxEntropy;
  }

  colapsar(vetorInput: number[]) {
    if (this.tracos.length === 0) return { contexto: [], coherence: 0, entropy: 0 };

    // Princípio da Mínima Ação (Lazy Evaluation): 
    // Filtra traços "dormentes" para economizar energia computacional latente
    const tracosAtivos = this.tracos.filter(t => t.peso > 0.05 || Math.random() < 0.1);
    
    console.log(`[Lazy Physics] Processando ${tracosAtivos.length}/${this.tracos.length} traços (Least Action)`);

    let sims = tracosAtivos.map((traco) => ({
      traco,
      sim: this.similaridade(vetorInput, traco.vetor)
    }));

    const maxSim = Math.max(...sims.map(s => s.sim));

    // Lazy Evaluation: Geração por interpolação se o espaço estiver vazio
    if (maxSim < THRESHOLD_VAZIO && sims.length >= 2) {
      sims.sort((a, b) => b.sim - a.sim);
      const sA = sims[0];
      const sB = sims[1];

      const sumSim = sA.sim + sB.sim;
      const ratioA = sA.sim / sumSim;
      const ratioB = sB.sim / sumSim;

      // Interpolação do vetor
      const vetorNovo = sA.traco.vetor.map((val, i) => val * ratioA + sB.traco.vetor[i] * ratioB);

      // Interpolação do texto (concatenação ponderada de fragmentos)
      const wordsA = sA.traco.texto.trim().split(/\s+/);
      const wordsB = sB.traco.texto.trim().split(/\s+/);
      
      const fragmentA = wordsA.slice(0, Math.max(1, Math.floor(wordsA.length * ratioA))).join(' ');
      const fragmentB = wordsB.slice(Math.floor(wordsB.length * ratioA)).join(' ');
      
      const textoNovo = `[Emergência] ${fragmentA} ... ${fragmentB}`;

      const novoTraco: Traco = {
        vetor: vetorNovo,
        texto: textoNovo,
        peso: PESO_INICIAL_LAZY,
        hits: 0
      };

      this.tracos.push(novoTraco);
      console.log(`[Lazy] Novo traço interpolado entre "${sA.traco.texto.substring(0, 20)}..." e "${sB.traco.texto.substring(0, 20)}..."`);
      
      // Recalcula similaridades incluindo o novo traço
      sims.push({ traco: novoTraco, sim: this.similaridade(vetorInput, vetorNovo) });
    }

    const relevancias = sims.map(({ traco, sim }) => {
      // Incerteza de Heisenberg: Pequena variação aleatória na similaridade
      const incerteza = (Math.random() - 0.5) * CONSTANTE_PLANCK;
      const simQuantica = Math.min(VELOCIDADE_LUZ, Math.max(0, sim + incerteza));

      // Supressão por recência
      let pesoEfetivo = traco.peso;
      const indexNoHistorico = this.historico.indexOf(traco.texto);
      if (indexNoHistorico !== -1) {
        const fatorPenalidade = (N_HISTORICO - indexNoHistorico) / N_HISTORICO;
        pesoEfetivo = traco.peso * (1 - PENALIDADE_RECENCIA * fatorPenalidade);
      }

      const relevancia = simQuantica * pesoEfetivo;
      return { traco, sim: simQuantica, relevancia };
    });

    relevancias.sort((a, b) => b.relevancia - a.relevancia);
    const top = relevancias.slice(0, TOP_K);

    // Gravidade Semântica: Traços próximos no TOP-K se reforçam mutuamente
    for (let i = 0; i < top.length; i++) {
      for (let j = i + 1; j < top.length; j++) {
        const proximidade = this.similaridade(top[i].traco.vetor, top[j].traco.vetor);
        if (proximidade > 0.8) {
          const atracao = GRAVIDADE_SEMANTICA * proximidade;
          top[i].traco.peso += atracao * 0.1;
          top[j].traco.peso += atracao * 0.1;
        }
      }
    }

    // Atualiza histórico de recência
    const novosTextos = top.map(t => t.traco.texto);
    this.historico = [...novosTextos, ...this.historico].slice(0, N_HISTORICO);

    // Reforço adaptativo (usa peso real)
    top.forEach(({ traco, sim }) => {
      traco.hits++;
      if (traco.hits >= QUARENTENA_HITS) {
        traco.peso += ALPHA * sim;
      }
    });

    // Decaimento e Evaporação Entrópica
    this.tracos = this.tracos.filter((traco) => {
      // Decaimento Relativístico: Traços pesados decaem ligeiramente mais rápido (Hawking Radiation)
      const fatorRelativistico = 1 + (traco.peso * 0.001);
      traco.peso *= (DECAIMENTO / fatorRelativistico);
      
      // Evaporação: Traços abaixo do limite crítico desaparecem
      return traco.peso > PRESSAO_ENTROPICA;
    });

    this.salvar();

    const filteredTop = top.filter((t) => t.relevancia > 0.1);
    const coherence = this.calculateCoherence(filteredTop.map(t => t.traco));
    const entropy = this.calculateEntropy();

    return { 
      contexto: filteredTop.map((t) => ({
        texto: t.traco.texto,
        peso: t.traco.peso,
        relevancia: t.relevancia
      })),
      coherence,
      entropy
    };
  }

  aprender(vetor: number[], texto: string) {
    this.tracos.push({ vetor, texto, peso: 1.0, hits: QUARENTENA_HITS });
    this.salvar();
  }

  queryAnalogica(vetor1: number[], vetor2: number[]) {
    if (this.tracos.length < 2) return { contexto: [], coherence: 0, entropy: 0 };

    // Encontra o traço mais relevante para o conceito 1 (com incerteza quântica)
    const relevancias1 = this.tracos.map(t => {
      const sim = this.similaridade(vetor1, t.vetor);
      const simQ = Math.min(1, Math.max(0, sim + (Math.random() - 0.5) * CONSTANTE_PLANCK));
      return { t, sim: simQ * t.peso };
    });
    relevancias1.sort((a, b) => b.sim - a.sim);
    const traco1 = relevancias1[0].t;

    // Encontra o traço mais relevante para o conceito 2 (com incerteza quântica)
    const relevancias2 = this.tracos.map(t => {
      const sim = this.similaridade(vetor2, t.vetor);
      const simQ = Math.min(1, Math.max(0, sim + (Math.random() - 0.5) * CONSTANTE_PLANCK));
      return { t, sim: simQ * t.peso };
    });
    relevancias2.sort((a, b) => b.sim - a.sim);
    const traco2 = relevancias2[0].t;

    // Calcula o vetor médio entre os dois traços encontrados
    const vetorMedio = traco1.vetor.map((val, i) => (val + traco2.vetor[i]) / 2);

    // Retorna os traços mais próximos desse vetor intermediário (colapso padrão)
    return this.colapsar(vetorMedio);
  }
}

const memoria = new Memoria();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/traces", (req, res) => {
    res.json(memoria.tracos.map(t => ({ texto: t.texto, peso: t.peso })));
  });

  app.get("/api/status", (req, res) => {
    const pesos = memoria.tracos.map(t => t.peso);
    res.json({
      count: memoria.tracos.length,
      avgPeso: pesos.length ? pesos.reduce((a, b) => a + b, 0) / pesos.length : 0,
      maxPeso: pesos.length ? Math.max(...pesos) : 0,
      coherence: 0,
      entropy: memoria.calculateEntropy(),
      turno: 0 // Will be managed by the client or session
    });
  });

  app.post("/api/collapse", (req, res) => {
    const { vetor } = req.body;
    const result = memoria.colapsar(vetor);
    res.json(result);
  });

  app.post("/api/analogical-query", (req, res) => {
    const { vetor1, vetor2 } = req.body;
    const result = memoria.queryAnalogica(vetor1, vetor2);
    res.json(result);
  });

  app.post("/api/learn", (req, res) => {
    const { vetor, texto } = req.body;
    memoria.aprender(vetor, texto);
    res.json({ success: true });
  });

  app.post("/api/clear", (req, res) => {
    memoria.tracos = [];
    memoria.historico = [];
    memoria.salvar();
    console.log("[Memória] Memória resetada pelo usuário.");
    res.json({ success: true });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Universo Preguiçoso rodando em http://localhost:${PORT}`);
  });
}

startServer();
