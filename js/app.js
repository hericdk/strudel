// Liga a barra de cima ao editor do Strudel (<strudel-editor>).
// O editor em si vem pronto do pacote @strudel/repl carregado no index.html.

const CHAVE_RASCUNHO = 'strudel-ao-vivo:rascunho';
const ESPERA_AO_VIVO_MS = 800;

const el = {
  area: document.getElementById('area-editor'),
  tocar: document.getElementById('tocar'),
  parar: document.getElementById('parar'),
  padroes: document.getElementById('padroes'),
  aoVivo: document.getElementById('ao-vivo'),
  baixar: document.getElementById('baixar'),
  status: document.getElementById('status'),
};

let repl; // o elemento <strudel-editor>; repl.editor é o StrudelMirror
let timerAoVivo;
let timerRascunho;

function lerRascunho() {
  try {
    return localStorage.getItem(CHAVE_RASCUNHO);
  } catch {
    return null;
  }
}

function salvarRascunho(codigo) {
  try {
    localStorage.setItem(CHAVE_RASCUNHO, codigo);
  } catch {
    // navegador sem armazenamento (ex.: janela anônima): segue sem salvar
  }
}

async function carregarPadrao(nome) {
  const resposta = await fetch(`padroes/${nome}.js`, { cache: 'no-cache' });
  if (!resposta.ok) throw new Error(`padrão "${nome}" não encontrado`);
  return resposta.text();
}

async function carregarLista() {
  const resposta = await fetch('padroes/lista.json', { cache: 'no-cache' });
  return resposta.json();
}

function mostrarStatus(texto, tipo = '') {
  el.status.textContent = texto;
  el.status.className = `status ${tipo}`;
  el.status.title = texto;
}

function aoAtualizar(estado) {
  if (estado.error) {
    const dica = /error loading/.test(estado.error.message) ? ' — confira a internet e recarregue a página' : '';
    mostrarStatus(`erro: ${estado.error.message}${dica}`, 'erro');
  } else if (estado.pending) {
    mostrarStatus('avaliando…');
  } else if (estado.started) {
    mostrarStatus(estado.isDirty ? 'tocando · código alterado (Ctrl+Enter)' : 'tocando', 'tocando');
  } else {
    mostrarStatus('parado · Ctrl+Enter para tocar');
  }

  clearTimeout(timerRascunho);
  timerRascunho = setTimeout(() => salvarRascunho(estado.code), 500);

  // Modo "ao vivo": reavalia sozinho depois de uma pausa na digitação.
  clearTimeout(timerAoVivo);
  if (el.aoVivo.checked && estado.started && estado.isDirty && !estado.pending) {
    timerAoVivo = setTimeout(() => repl.editor.evaluate(), ESPERA_AO_VIVO_MS);
  }
}

function baixarCodigo() {
  const nome = (el.padroes.value || 'padrao') + '.js';
  const blob = new Blob([repl.editor.code], { type: 'text/javascript' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nome;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function iniciar() {
  const lista = await carregarLista();
  el.padroes.innerHTML = '';
  el.padroes.append(new Option('(meu rascunho)', ''));
  for (const nome of lista) {
    el.padroes.append(new Option(nome, nome));
  }

  // Ordem de prioridade do código inicial:
  // 1) ?p=nome na URL  2) rascunho salvo no navegador  3) primeiro padrão da lista
  const pedido = new URLSearchParams(location.search).get('p');
  let codigo;
  if (pedido) {
    codigo = await carregarPadrao(pedido);
    el.padroes.value = pedido;
  } else {
    codigo = lerRascunho();
    if (codigo === null) {
      el.padroes.value = lista[0];
      codigo = await carregarPadrao(lista[0]);
    }
  }

  repl = document.createElement('strudel-editor');
  repl.setAttribute('code', codigo);
  repl.addEventListener('update', (e) => aoAtualizar(e.detail));
  el.area.append(repl);

  el.tocar.onclick = () => repl.editor.evaluate();
  el.parar.onclick = () => repl.editor.stop();
  el.baixar.onclick = baixarCodigo;
  el.padroes.onchange = async () => {
    if (!el.padroes.value) return;
    if (!confirm('Trocar o código atual pelo padrão escolhido? (baixe antes se quiser guardar)')) return;
    repl.editor.setCode(await carregarPadrao(el.padroes.value));
    history.replaceState(null, '', `?p=${encodeURIComponent(el.padroes.value)}`);
  };

  mostrarStatus('pronto · Ctrl+Enter para tocar');
}

iniciar().catch((erro) => mostrarStatus(`erro ao iniciar: ${erro.message}`, 'erro'));
