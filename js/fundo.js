// Fundo de tela atrás do editor: vídeo (arquivo ou link), YouTube ou um visualizador
// escrito em código que reage ao áudio. O visualizador só LÊ os analisadores que os
// ._scope() do som já criam (via `analysers` do Strudel) — nada no _scope é alterado.

const $ = (id) => document.getElementById(id);
const CHAVE = 'strudel-ao-vivo:fundo';

export const EXEMPLO = `// Roda a cada quadro. ctx = canvas 2D, d = dados do áudio.
// rastro: pinta por cima com transparência em vez de limpar
ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
ctx.fillRect(0, 0, d.largura, d.altura);

// círculo que pulsa com os graves
const r = 40 + d.graves * Math.min(d.largura, d.altura) * 0.45;
ctx.beginPath();
ctx.arc(d.largura / 2, d.altura / 2, r, 0, Math.PI * 2);
ctx.fillStyle = \`hsla(\${(d.t * 40) % 360}, 80%, 55%, \${0.15 + d.volume})\`;
ctx.fill();

// onda do ._scope() do seu som (se não tiver _scope, usa a saída geral)
const s = d.scope();
const onda = s.volume > 0 ? s.onda : d.onda;
ctx.strokeStyle = d.cor;
ctx.lineWidth = 2;
ctx.beginPath();
onda.forEach((v, i) => {
  const x = (i / onda.length) * d.largura;
  const y = d.altura / 2 + v * d.altura * 0.3;
  i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
});
ctx.stroke();
`;

const PADRAO = { tipo: 'nenhum', videoUrl: '', youtube: '', codigo: EXEMPLO, escurecer: 0.3, usarArquivo: false };
let config = { ...PADRAO };
let quadro; // requestAnimationFrame em andamento
let urlArquivo; // object URL do vídeo escolhido do aparelho
let elementoAtual = null; // <video> ou <canvas> do fundo (a gravação usa)

// ---------- armazenamento ----------

function lerConfig() {
  try {
    return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE)) };
  } catch {
    return { ...PADRAO };
  }
}

function gravarConfig() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(config));
  } catch {}
}

// o arquivo de vídeo é grande demais para o localStorage; vai para o IndexedDB
function banco() {
  return new Promise((ok, erro) => {
    const req = indexedDB.open('strudel-ao-vivo', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('arquivos');
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}

async function arquivo(acao, valor) {
  const db = await banco();
  return new Promise((ok, erro) => {
    const tx = db.transaction('arquivos', acao === 'ler' ? 'readonly' : 'readwrite');
    const loja = tx.objectStore('arquivos');
    const req = acao === 'ler' ? loja.get('video-fundo') : loja.put(valor, 'video-fundo');
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}

// ---------- dados do áudio ----------

let analisador; // analisador próprio ligado à saída geral do Strudel
let saidaLigada;
const buffers = new Map();

function buffer(chave, tamanho) {
  let b = buffers.get(chave);
  if (!b || b.length !== tamanho) buffers.set(chave, (b = new Float32Array(tamanho)));
  return b;
}

function analisadorDaSaida() {
  const saida = getSuperdoughAudioController?.()?.output?.destinationGain;
  if (!saida) return null;
  if (!analisador || analisador.context !== saida.context) {
    analisador = saida.context.createAnalyser();
    analisador.fftSize = 2048;
    analisador.smoothingTimeConstant = 0.6;
  }
  if (saidaLigada !== saida) {
    saida.connect(analisador);
    saidaLigada = saida;
  }
  return analisador;
}

function ler(no, chave) {
  const onda = buffer(`${chave}-onda`, no.fftSize);
  const espectro = buffer(`${chave}-esp`, no.frequencyBinCount);
  no.getFloatTimeDomainData(onda);
  no.getFloatFrequencyData(espectro);
  const faixa = no.maxDecibels - no.minDecibels;
  let soma = 0;
  for (let i = 0; i < onda.length; i++) soma += onda[i] * onda[i];
  for (let i = 0; i < espectro.length; i++) espectro[i] = Math.min(1, Math.max(0, (espectro[i] - no.minDecibels) / faixa));
  return { onda, espectro, volume: Math.min(1, Math.sqrt(soma / onda.length) * 3) };
}

const VAZIO = { onda: new Float32Array(1024), espectro: new Float32Array(1024), volume: 0 };

function media(espectro, taxa, de, ate) {
  const hzPorBin = taxa / 2 / espectro.length;
  const a = Math.floor(de / hzPorBin);
  const b = Math.max(a + 1, Math.floor(ate / hzPorBin));
  let s = 0;
  for (let i = a; i < b && i < espectro.length; i++) s += espectro[i];
  return s / (b - a);
}

// n-ésimo ._scope() do código (1 = primeiro). Cada ._scope() inline ganha o analisador
// "_widget__scope_<posição>"; .scope({ id }) usa o id numérico.
function analisadorDoScope(n) {
  const todos = globalThis.analysers || {};
  return todos[`_widget__scope_${n - 1}`] || todos[n] || (n === 1 ? Object.values(todos)[0] : null);
}

function dadosDoQuadro(canvas, inicio) {
  const no = analisadorDaSaida();
  const geral = no ? ler(no, 'saida') : VAZIO;
  const taxa = no?.context.sampleRate || 48000;
  return {
    t: (performance.now() - inicio) / 1000,
    largura: canvas.width,
    altura: canvas.height,
    ...geral,
    graves: media(geral.espectro, taxa, 20, 250),
    medios: media(geral.espectro, taxa, 250, 4000),
    agudos: media(geral.espectro, taxa, 4000, 16000),
    // lê o analisador que o ._scope() do som já usa; não mexe nele
    scope: (n = 1) => {
      const no = analisadorDoScope(n);
      return no ? ler(no, `scope-${n}`) : VAZIO;
    },
    cor: getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim() || '#fff',
  };
}

// ---------- montar o fundo ----------

function idYoutube(url) {
  return url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/)?.[1];
}

function limpar() {
  cancelAnimationFrame(quadro);
  $('fundo').innerHTML = '';
  elementoAtual = null;
}

async function montar() {
  limpar();
  const fundo = $('fundo');
  fundo.style.setProperty('--escurecer', config.escurecer);
  document.body.classList.toggle('com-fundo', config.tipo !== 'nenhum');
  $('fundo-erro').textContent = '';

  if (config.tipo === 'video') {
    let src = config.videoUrl;
    if (config.usarArquivo) {
      const blob = await arquivo('ler').catch(() => null);
      if (blob) {
        if (urlArquivo) URL.revokeObjectURL(urlArquivo);
        src = urlArquivo = URL.createObjectURL(blob);
      }
    }
    if (!src) return;
    const video = Object.assign(document.createElement('video'), {
      src,
      autoplay: true,
      muted: true,
      loop: true,
      playsInline: true,
    });
    fundo.append(video);
    video.play().catch(() => {});
    elementoAtual = video;
  } else if (config.tipo === 'youtube') {
    const id = idYoutube(config.youtube);
    if (!id) return;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&playsinline=1&rel=0`;
    iframe.allow = 'autoplay; encrypted-media';
    iframe.className = 'youtube';
    fundo.append(iframe);
  } else if (config.tipo === 'codigo') {
    let desenhar;
    try {
      desenhar = new Function('ctx', 'd', config.codigo);
    } catch (erro) {
      $('fundo-erro').textContent = `erro no código: ${erro.message}`;
      return;
    }
    const canvas = document.createElement('canvas');
    fundo.append(canvas);
    elementoAtual = canvas;
    const ctx = canvas.getContext('2d');
    const inicio = performance.now();
    const passo = () => {
      const escala = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(innerWidth * escala);
      const h = Math.round(innerHeight * escala);
      if (canvas.width !== w || canvas.height !== h) Object.assign(canvas, { width: w, height: h });
      try {
        desenhar(ctx, dadosDoQuadro(canvas, inicio));
      } catch (erro) {
        $('fundo-erro').textContent = `erro no código: ${erro.message}`;
        return; // para o loop até você corrigir e clicar em Aplicar
      }
      quadro = requestAnimationFrame(passo);
    };
    passo();
  }
}

export function elementoDoFundo() {
  return elementoAtual;
}

export function escurecimento() {
  return config.tipo === 'nenhum' ? 0 : Number(config.escurecer);
}

// ---------- painel ----------

function mostrarCampos() {
  document.querySelectorAll('.campos-fundo').forEach((c) => (c.hidden = c.dataset.tipo !== config.tipo));
}

export function iniciarFundo() {
  config = lerConfig();
  const radios = document.querySelectorAll('input[name="tipo-fundo"]');
  radios.forEach((r) => {
    r.checked = r.value === config.tipo;
    r.onchange = () => {
      config.tipo = r.value;
      gravarConfig();
      mostrarCampos();
      montar();
    };
  });
  $('fundo-video-url').value = config.videoUrl;
  $('fundo-youtube').value = config.youtube;
  $('fundo-codigo').value = config.codigo;
  $('fundo-escurecer').value = config.escurecer;

  $('fundo-arquivo').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      await arquivo('gravar', f);
      config.usarArquivo = true;
    } catch {
      // sem IndexedDB: usa só nesta sessão
      config.usarArquivo = false;
      config.videoUrl = URL.createObjectURL(f);
    }
    gravarConfig();
    montar();
  };
  $('fundo-video-url').onchange = (e) => {
    config.videoUrl = e.target.value.trim();
    config.usarArquivo = false;
    gravarConfig();
    montar();
  };
  $('fundo-youtube').onchange = (e) => {
    config.youtube = e.target.value.trim();
    gravarConfig();
    montar();
  };
  $('fundo-aplicar').onclick = () => {
    config.codigo = $('fundo-codigo').value;
    gravarConfig();
    montar();
  };
  $('fundo-exemplo').onclick = () => {
    $('fundo-codigo').value = config.codigo = EXEMPLO;
    gravarConfig();
    montar();
  };
  $('fundo-escurecer').oninput = (e) => {
    config.escurecer = Number(e.target.value);
    $('fundo').style.setProperty('--escurecer', config.escurecer);
    gravarConfig();
  };

  mostrarCampos();
  montar();
}
