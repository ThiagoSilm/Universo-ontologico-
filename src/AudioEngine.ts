export class AudioEngine {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private oscillators: { osc: OscillatorNode, gain: GainNode }[] = [];
  private masterGain: GainNode | null = null;
  private isInitialized = false;

  public async init() {
    if (this.isInitialized) return;
    
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    
    // Ruído Branco (Estado Latente)
    const bufferSize = this.ctx.sampleRate * 2; // 2 segundos de ruído
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.05; // Volume inicial baixo
    
    // Filtro passa-baixa para o ruído (som de "fundo do oceano" ou "vento cósmico")
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    this.noiseNode.connect(filter);
    filter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    this.noiseNode.start();

    // Frequências Harmonizadas (Estado Colapsado)
    // Baseadas na frequência de 432Hz (frequência do universo)
    const baseFreq = 432;
    const harmonics = [0.5, 1, 1.5, 2, 3]; // Sub-oitava, fundamental, quinta, oitava, quinta acima

    harmonics.forEach(h => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = baseFreq * h;
      
      gain.gain.value = 0; // Começa mudo
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start();
      
      this.oscillators.push({ osc, gain });
    });

    this.isInitialized = true;
  }

  public update(status: 'LATENTE' | 'COLAPSADO', persistence: number) {
    if (!this.isInitialized || !this.ctx) return;

    const now = this.ctx.currentTime;

    if (status === 'LATENTE') {
      // Volta para o ruído branco
      this.noiseGain?.gain.setTargetAtTime(0.05, now, 0.5);
      this.oscillators.forEach(o => {
        o.gain.gain.setTargetAtTime(0, now, 0.5);
      });
    } else {
      // Estado Colapsado: Transição do ruído para a harmonia baseada na persistência
      // Persistência alvo é ~10.20
      const persistenceRatio = Math.max(0, Math.min(1, persistence / 10.20));
      
      // O ruído diminui conforme a persistência aumenta
      this.noiseGain?.gain.setTargetAtTime(0.05 * (1 - persistenceRatio), now, 0.1);

      // As frequências harmonizadas aumentam com a persistência
      this.oscillators.forEach((o, index) => {
        // Harmônicos mais altos precisam de mais persistência para aparecer
        const threshold = index * 0.2; 
        if (persistenceRatio > threshold) {
          // Volume base + modulação sutil
          const targetVolume = 0.02 * (persistenceRatio - threshold) * (1 / (index + 1));
          o.gain.gain.setTargetAtTime(targetVolume, now, 0.5);
        } else {
          o.gain.gain.setTargetAtTime(0, now, 0.5);
        }
      });
    }
  }

  public suspend() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}
