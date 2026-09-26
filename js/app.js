// Interface: tela inicial com os sons em caixas + editor com histórico de versões.
// Existe um único editor do Strudel (<strudel-editor>) na página. Ele fica visível na
// tela do editor e escondido na tela inicial, onde é usado para tocar as prévias.

import * as biblioteca from './biblioteca.js';
import { iniciarPainel } from './painel.js';
import { iniciarFundo } from './fundo.js';
import { iniciarGravacao } from './gravacao.js';

const ESPERA_AO_VIVO_MS = 800;
const ESPERA_AUTOSAVE_MS = 500;
const LINHAS_PREVIA = 8;

const $ = (id) => document.getElementById(id);

let repl; // o elemento <strudel-editor>; repl.editor é o StrudelMirror
let atual = null; // id do som aberto no editor (null = tela inicial)
let emPrevia = null; // id do som tocando como prévia na tela inicial
let timerAoVivo;
let timerAutosave;

// ---------- utilidades ----------

function baixar(nome, texto, tipo) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
  link.download = nome;
  link.click();
  URL.revokeObjectURL(link.href);
}

function dataCurta(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function criarEl(tag, props = {}, ...filhos) {
  const el = Object.assign(document.createElement(tag), props);
  el.append(...filhos);
  return el;
}

function mostrarStatus(el, texto, tipo = '') {
  el.textContent = texto;
  el.className = `status ${tipo}`;
  el.title = texto;
}

// ---------- tela inicial ----------

function desenharGrade() {
  const grade = $('grade');
  grade.innerHTML = '';
  const sons = biblioteca.todos();
  mostrarStatus($('status-biblioteca'), `${sons.length} ${sons.length === 1 ? 'som' : 'sons'} · salvos neste navegador`);

  for (const som of sons) {
    const tocando = som.id === emPrevia;
    const previa = som.codigo.split('\n').slice(0, LINHAS_PREVIA).join('\n') || '(vazio)';
    const botao = (texto, titulo, acao) => criarEl('button', { type: 'button', textContent: texto, title: titulo, onclick: acao });

    const caixa = criarEl(
      'article',
      { className: `caixa${tocando ? ' tocando' : ''}` },
      criarEl('h3', { textContent: som.nome, title: 'Abrir no editor', onclick: () => abrirEditor(som.id) }),
      criarEl('p', { className: 'meta', textContent: `editado ${dataCurta(som.atualizadoEm)} · ${som.versoes.length} versões` }),
      criarEl('pre', { textContent: previa, title: 'Abrir no editor', onclick: () => abrirEditor(som.id) }),
      criarEl('p', { className: 'erro-previa', id: `erro-${som.id}` }),
      criarEl(
        'div',
        { className: 'acoes' },
        botao(tocando ? '■ Parar' : '▶ Ouvir', 'Tocar uma prévia', () => alternarPrevia(som.id)),
        botao('✎ Editar', 'Abrir no editor', () => abrirEditor(som.id)),
        botao('⧉ Duplicar', 'Criar uma cópia', () => {
          biblioteca.duplicar(som.id);
          desenharGrade();
        }),
        botao('🗑', 'Excluir', () => {
          if (!confirm(`Excluir "${som.nome}" e todo o histórico dele?`)) return;
          if (emPrevia === som.id) pararPrevia();
          biblioteca.excluir(som.id);
          desenharGrade();
        }),
      ),
    );
    grade.append(caixa);
  }
}

async function alternarPrevia(id) {
  if (emPrevia === id) {
    pararPrevia();
    return;
  }
  emPrevia = id;
  desenharGrade();
  repl.editor.setCode(biblioteca.pegar(id).codigo);
  await repl.editor.evaluate();
}

function pararPrevia() {
  emPrevia = null;
  repl.editor.stop();
  desenharGrade();
}

// ---------- editor ----------

function salvarAgora() {
  clearTimeout(timerAutosave);
  if (atual && !biblioteca.atualizarCodigo(atual, repl.editor.code)) {
    mostrarStatus($('status'), 'não consegui salvar no navegador — use ⬇ .txt para não perder', 'erro');
  }
}

function abrirEditor(id) {
  if (location.hash !== `#som=${id}`) {
    location.hash = `som=${id}`; // o evento hashchange chama mostrarTela()
    return;
  }
  const som = biblioteca.pegar(id);
  if (!som) {
    location.hash = '';
    return;
  }
  repl.editor.stop();
  emPrevia = null;
  atual = id;
  if (som.versoes.length === 0) biblioteca.salvarVersao(id); // guarda o ponto de partida
  repl.editor.setCode(som.codigo);
  $('nome').value = som.nome;
  document.body.className = 'no-editor';
  desenharHistorico();
  mostrarStatus($('status'), 'Ctrl+Enter para tocar');
}

function fecharEditor() {
  if (atual) {
    salvarAgora();
    biblioteca.salvarVersao(atual); // só cria versão se mudou
    repl.editor.stop();
  }
  atual = null;
  document.body.className = 'na-biblioteca';
  desenharGrade();
}

function desenharHistorico() {
  const lista = $('lista-versoes');
  lista.innerHTML = '';
  const som = biblioteca.pegar(atual);
  som.versoes.forEach((versao) => {
    const linhas = versao.codigo.split('\n').length;
    lista.append(
      criarEl(
        'li',
        {},
        criarEl('span', { textContent: `${dataCurta(versao.em)} · ${linhas} linhas` }),
        criarEl('button', {
          type: 'button',
          textContent: 'Abrir',
          title: 'Coloca esta versão no editor (o código atual vira uma versão antes)',
          onclick: () => {
            salvarAgora();
            biblioteca.salvarVersao(atual);
            repl.editor.setCode(versao.codigo);
            salvarAgora();
            desenharHistorico();
          },
        }),
      ),
    );
  });
}

// ---------- eventos do Strudel ----------

function aoAtualizar(estado) {
  if (!atual) {
    // tela inicial: só acompanha a prévia
    if (emPrevia && estado.error) {
      const el = $(`erro-${emPrevia}`);
      if (el) el.textContent = `erro: ${estado.error.message}`;
    }
    return;
  }

  const status = $('status');
  if (estado.error) {
    const dica = /error loading/.test(estado.error.message) ? ' — confira a internet e recarregue a página' : '';
    mostrarStatus(status, `erro: ${estado.error.message}${dica}`, 'erro');
  } else if (estado.pending) {
    mostrarStatus(status, 'avaliando…');
  } else if (estado.started) {
    mostrarStatus(status, estado.isDirty ? 'tocando · código alterado (Ctrl+Enter)' : 'tocando', 'tocando');
  } else {
    mostrarStatus(status, 'parado · Ctrl+Enter para tocar');
  }

  clearTimeout(timerAutosave);
  timerAutosave = setTimeout(salvarAgora, ESPERA_AUTOSAVE_MS);

  // Modo "ao vivo": reavalia sozinho depois de uma pausa na digitação.
  clearTimeout(timerAoVivo);
  if ($('ao-vivo').checked && estado.started && estado.isDirty && !estado.pending) {
    timerAoVivo = setTimeout(() => repl.editor.evaluate(), ESPERA_AO_VIVO_MS);
  }
}

// ---------- navegação ----------

function mostrarTela() {
  const id = location.hash.match(/^#som=(.+)$/)?.[1];
  if (id) abrirEditor(decodeURIComponent(id));
  else fecharEditor();
}

function ligarBotoes() {
  $('novo').onclick = () => abrirEditor(biblioteca.criar('novo som', '').id);
  $('exportar').onclick = () => {
    const dia = new Date().toISOString().slice(0, 10);
    baixar(`strudel-sons-${dia}.json`, biblioteca.exportarJson(), 'application/json');
  };
  $('importar').onclick = () => $('arquivo-importar').click();
  $('arquivo-importar').onchange = async (e) => {
    const arquivo = e.target.files[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      const n = biblioteca.importarJson(await arquivo.text());
      desenharGrade();
      mostrarStatus($('status-biblioteca'), `${n} sons importados`, 'tocando');
    } catch (erro) {
      mostrarStatus($('status-biblioteca'), `erro ao importar: ${erro.message}`, 'erro');
    }
  };

  $('voltar').onclick = () => (location.hash = '');
  $('nome').onchange = () => biblioteca.renomear(atual, $('nome').value.trim() || 'sem nome');
  $('tocar').onclick = () => repl.editor.evaluate();
  $('parar').onclick = () => repl.editor.stop();
  $('salvar-versao').onclick = () => {
    salvarAgora();
    const criou = biblioteca.salvarVersao(atual);
    mostrarStatus($('status'), criou ? 'versão salva no histórico' : 'nada mudou desde a última versão');
    desenharHistorico();
  };
  // painel (sons, referência...) e fundo de tela ocupam o mesmo lugar: abre um fecha o outro
  const alternar = (qual, outro) => {
    $(qual).hidden = !$(qual).hidden;
    $(outro).hidden = true;
    $('abrir-painel').classList.toggle('ativo', !$('painel').hidden);
    $('abrir-fundo').classList.toggle('ativo', !$('painel-fundo').hidden);
  };
  $('abrir-painel').onclick = () => alternar('painel', 'painel-fundo');
  $('abrir-fundo').onclick = () => alternar('painel-fundo', 'painel');

  window.addEventListener('hashchange', mostrarTela);
  // garante que nada se perde ao fechar a aba
  window.addEventListener('pagehide', salvarAgora);
}

async function iniciar() {
  await biblioteca.carregar();

  repl = document.createElement('strudel-editor');
  repl.setAttribute('code', '');
  repl.addEventListener('update', (e) => aoAtualizar(e.detail));
  $('area-editor').append(repl);

  ligarBotoes();
  iniciarFundo();
  iniciarGravacao();
  mostrarTela();
  await iniciarPainel(repl);
}

iniciar().catch((erro) => mostrarStatus($('status-biblioteca'), `erro ao iniciar: ${erro.message}`, 'erro'));
