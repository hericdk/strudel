// Grava um vídeo da tela com o som do Strudel.
//
// - Computador (Chrome, Edge, Firefox, Safari): usa a captura de tela do navegador
//   (getDisplayMedia) para filmar a aba exatamente como ela aparece.
// - Celular (iOS e Android não permitem captura de tela pela web): monta o vídeo num
//   canvas desenhando o fundo, o código com as cores do tema e os desenhos do Strudel
//   (pianoroll, scope, hydra). O vídeo do YouTube não entra nesse modo (o YouTube bloqueia).
//
// Nos dois casos o áudio vem direto da saída do Strudel, sem microfone.

import { elementoDoFundo, escurecimento } from './fundo.js';

const $ = (id) => document.getElementById(id);
const QPS = 30;

let gravador = null;
let aoParar = () => {};
let inicio = 0;
let relogio;

function tipoDeVideo() {
  const tipos = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return tipos.find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
}

function audioDoStrudel() {
  const saida = getSuperdoughAudioController().output.destinationGain;
  saida.context.resume?.();
  const destino = saida.context.createMediaStreamDestination();
  saida.connect(destino);
  return { faixa: destino.stream.getAudioTracks()[0], desligar: () => saida.disconnect(destino) };
}

// ---------- modo computador: captura da aba ----------

async function videoDaAba() {
  const fluxo = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: QPS, displaySurface: 'browser' },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    surfaceSwitching: 'exclude',
  });
  const faixa = fluxo.getVideoTracks()[0];
  // se a pessoa clicar em "parar de compartilhar" do navegador, encerra a gravação
  faixa.addEventListener('ended', () => parar());
  return { faixa, desligar: () => fluxo.getTracks().forEach((t) => t.stop()) };
}

// ---------- modo celular: composição num canvas ----------

function desenharCoberto(ctx, fonte, w, h) {
  const fw = fonte.videoWidth || fonte.width;
  const fh = fonte.videoHeight || fonte.height;
  if (!fw || !fh) return;
  const escala = Math.max(w / fw, h / fh);
  ctx.drawImage(fonte, (w - fw * escala) / 2, (h - fh * escala) / 2, fw * escala, fh * escala);
}

function desenharCodigo(ctx, escala) {
  const conteudo = document.querySelector('#area-editor .cm-content');
  if (!conteudo) return;
  const caminhante = document.createTreeWalker(conteudo, NodeFilter.SHOW_TEXT);
  const faixa = document.createRange();
  ctx.textBaseline = 'top';
  for (let no = caminhante.nextNode(); no; no = caminhante.nextNode()) {
    if (!no.data.trim()) continue;
    faixa.selectNodeContents(no);
    const r = faixa.getClientRects()[0];
    if (!r || r.bottom < 0 || r.top > innerHeight) continue;
    const estilo = getComputedStyle(no.parentElement);
    ctx.font = `${estilo.fontWeight} ${parseFloat(estilo.fontSize) * escala}px ${estilo.fontFamily}`;
    ctx.fillStyle = estilo.color;
    const tamanho = parseFloat(estilo.fontSize);
    ctx.fillText(no.data, r.left * escala, (r.top + (r.height - tamanho) / 2) * escala);
  }
}

function videoComposto() {
  const escala = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(innerWidth * escala);
  canvas.height = Math.round(innerHeight * escala);
  const ctx = canvas.getContext('2d');
  let quadro;

  const passo = () => {
    const { width: w, height: h } = canvas;
    const raiz = getComputedStyle(document.documentElement);
    ctx.fillStyle = raiz.getPropertyValue('--background').trim() || '#222';
    ctx.fillRect(0, 0, w, h);

    const fundo = elementoDoFundo();
    // vídeo de outro site não pode ir para o canvas (o navegador bloqueia); arquivo local pode
    const permitido = fundo && !(fundo.tagName === 'VIDEO' && !fundo.src.startsWith('blob:') && new URL(fundo.src).origin !== location.origin);
    if (permitido) {
      desenharCoberto(ctx, fundo, w, h);
      ctx.fillStyle = `rgba(0, 0, 0, ${escurecimento()})`;
      ctx.fillRect(0, 0, w, h);
    }
    // hydra e outros canvases do Strudel que ficam atrás do texto
    for (const c of document.querySelectorAll('canvas')) {
      if (c !== fundo && c.id !== 'test-canvas' && c.offsetParent !== null) ctx.drawImage(c, 0, 0, w, h);
    }
    desenharCodigo(ctx, escala);
    // pianoroll, scope etc. ficam por cima do texto, como na tela
    const desenhos = document.getElementById('test-canvas');
    if (desenhos) ctx.drawImage(desenhos, 0, 0, w, h);

    quadro = requestAnimationFrame(passo);
  };
  passo();

  const fluxo = canvas.captureStream(QPS);
  return { faixa: fluxo.getVideoTracks()[0], desligar: () => cancelAnimationFrame(quadro) };
}

// ---------- controle ----------

function mostrarResultado(blob, extensao) {
  const nome = `strudel-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${extensao}`;
  const url = URL.createObjectURL(blob);
  const aviso = document.createElement('div');
  aviso.className = 'aviso-gravacao';

  const baixar = Object.assign(document.createElement('a'), { href: url, download: nome, textContent: '⬇ Baixar vídeo' });
  aviso.append(baixar);

  const arquivo = new File([blob], nome, { type: blob.type });
  if (navigator.canShare?.({ files: [arquivo] })) {
    const compartilhar = Object.assign(document.createElement('button'), {
      type: 'button',
      textContent: '↗ Compartilhar / salvar',
      onclick: () => navigator.share({ files: [arquivo] }).catch(() => {}),
    });
    aviso.append(compartilhar);
  }
  const fechar = Object.assign(document.createElement('button'), {
    type: 'button',
    textContent: '✕',
    title: 'Fechar',
    onclick: () => {
      aviso.remove();
      URL.revokeObjectURL(url);
    },
  });
  aviso.append(fechar);
  document.body.append(aviso);
}

function atualizarBotao() {
  const botao = $('gravar');
  const gravando = !!gravador;
  botao.classList.toggle('gravando', gravando);
  botao.textContent = gravando ? '⏹' : '⏺';
  const seg = Math.floor((performance.now() - inicio) / 1000);
  botao.title = gravando ? `Gravando ${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')} — clique para parar` : 'Gravar vídeo da tela';
}

async function comecar() {
  const podeCapturarTela = !!navigator.mediaDevices?.getDisplayMedia;
  let video;
  try {
    video = podeCapturarTela ? await videoDaAba() : videoComposto();
  } catch (erro) {
    if (erro.name !== 'NotAllowedError') alert(`Não foi possível gravar: ${erro.message}`);
    return;
  }
  const audio = audioDoStrudel();
  const tipo = tipoDeVideo();
  const partes = [];
  gravador = new MediaRecorder(new MediaStream([video.faixa, audio.faixa]), tipo ? { mimeType: tipo } : {});
  gravador.ondataavailable = (e) => e.data.size && partes.push(e.data);
  aoParar = () => {
    video.desligar();
    audio.desligar();
    const blob = new Blob(partes, { type: gravador.mimeType || tipo || 'video/webm' });
    mostrarResultado(blob, blob.type.includes('mp4') ? 'mp4' : 'webm');
    gravador = null;
    clearInterval(relogio);
    atualizarBotao();
  };
  gravador.onstop = () => aoParar();
  gravador.start(1000);
  inicio = performance.now();
  relogio = setInterval(atualizarBotao, 1000);
  atualizarBotao();
}

function parar() {
  if (gravador?.state === 'recording') gravador.stop();
}

export function iniciarGravacao() {
  const botao = $('gravar');
  if (!window.MediaRecorder) {
    botao.hidden = true;
    return;
  }
  botao.onclick = () => (gravador ? parar() : comecar());
}
