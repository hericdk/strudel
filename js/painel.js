// Painel lateral do editor: Sons, Referência, Console, Histórico e Configurações.
// Reproduz as abas do strudel.cc usando as funções que o próprio Strudel deixa globais
// (soundMap, superdough, codemirrorSettings, themes...) depois de carregar.

const $ = (id) => document.getElementById(id);
const CHAVE_ABA = 'strudel-ao-vivo:aba';
const CHAVE_AUDIO = 'strudel-ao-vivo:audio';
const MAX_CONSOLE = 300;
const MAX_SONS_VISIVEIS = 600;

function criarEl(tag, props = {}, ...filhos) {
  const el = Object.assign(document.createElement(tag), props);
  el.append(...filhos);
  return el;
}

function lerLocal(chave, padrao) {
  try {
    return JSON.parse(localStorage.getItem(chave)) ?? padrao;
  } catch {
    return padrao;
  }
}

function gravarLocal(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {}
}

// ---------- abas ----------

export function abrirAba(nome) {
  document.querySelectorAll('.abas button').forEach((b) => b.classList.toggle('ativa', b.dataset.aba === nome));
  document.querySelectorAll('.aba').forEach((a) => (a.hidden = a.id !== `aba-${nome}`));
  gravarLocal(CHAVE_ABA, nome);
}

function ligarAbas() {
  document.querySelectorAll('.abas button').forEach((b) => (b.onclick = () => abrirAba(b.dataset.aba)));
  abrirAba(lerLocal(CHAVE_ABA, 'sons'));
}

// ---------- sons ----------

const FILTROS = {
  todos: () => true,
  amostras: (nome, d) => d.type === 'sample' && !nome.includes('_'),
  baterias: (nome, d) => d.type === 'sample' && nome.includes('_'),
  sintetizadores: (nome, d) => d.type === 'synth',
  instrumentos: (nome, d) => d.type === 'soundfont',
};
const ROTULOS_FILTROS = {
  todos: 'Todos',
  amostras: 'Amostras',
  baterias: 'Baterias',
  sintetizadores: 'Sintetizadores',
  instrumentos: 'Instrumentos GM',
};
let filtroSons = 'todos';

function tocarSom(nome, dados) {
  const ctx = getAudioContext();
  ctx.resume?.();
  const params = { s: nome, clip: 1, release: 0.5, sustain: 1, duration: 0.5 };
  if (dados.type === 'synth' || dados.type === 'soundfont') params.note = 'a3';
  superdough(params, ctx.currentTime + 0.05, params.duration);
}

function desenharSons() {
  const busca = $('busca-sons').value.trim().toLowerCase();
  const mapa = soundMap.get();
  const nomes = Object.keys(mapa)
    .filter((nome) => !nome.startsWith('_'))
    .filter((nome) => FILTROS[filtroSons](nome, mapa[nome].data))
    .filter((nome) => nome.includes(busca))
    .sort();

  const lista = $('lista-sons');
  lista.innerHTML = '';
  for (const nome of nomes.slice(0, MAX_SONS_VISIVEIS)) {
    const dados = mapa[nome].data;
    const qtd = Array.isArray(dados.samples) ? dados.samples.length : Object.keys(dados.samples || {}).length;
    lista.append(
      criarEl('button', {
        type: 'button',
        textContent: qtd > 1 ? `${nome} (${qtd})` : nome,
        title: qtd > 1 ? `${qtd} variações: use n("0 1 2") para escolher` : nome,
        onclick: () => tocarSom(nome, dados),
      }),
    );
  }
  if (nomes.length > MAX_SONS_VISIVEIS) {
    lista.append(criarEl('p', { className: 'dica', textContent: `…e mais ${nomes.length - MAX_SONS_VISIVEIS}. Use a busca.` }));
  }
}

function ligarSons() {
  const filtros = $('filtros-sons');
  for (const chave of Object.keys(FILTROS)) {
    filtros.append(
      criarEl('button', {
        type: 'button',
        textContent: ROTULOS_FILTROS[chave],
        className: chave === filtroSons ? 'ativa' : '',
        onclick: (e) => {
          filtroSons = chave;
          filtros.querySelectorAll('button').forEach((b) => b.classList.toggle('ativa', b === e.target));
          desenharSons();
        },
      }),
    );
  }
  $('busca-sons').oninput = desenharSons;
  soundMap.listen?.(() => desenharSons());
  desenharSons();
}

// ---------- referência ----------

let referencia = [];

function desenharReferencia() {
  const busca = $('busca-referencia').value.trim().toLowerCase();
  const lista = $('lista-referencia');
  lista.innerHTML = '';
  const itens = referencia.filter(
    (f) => f.nome.toLowerCase().includes(busca) || f.sinonimos.some((s) => s.toLowerCase().includes(busca)),
  );
  for (const f of itens) {
    const corpo = criarEl('div', { className: 'corpo-ref' });
    // a descrição vem da documentação oficial do Strudel, já em HTML
    corpo.append(criarEl('div', { innerHTML: f.desc }));
    if (f.sinonimos.length) corpo.append(criarEl('p', { className: 'dica', textContent: `também: ${f.sinonimos.join(', ')}` }));
    if (f.params.length) {
      corpo.append(
        criarEl(
          'ul',
          { className: 'params' },
          ...f.params.map((p) => {
            const li = criarEl('li', {}, criarEl('code', { textContent: p.nome || '' }), ` ${p.tipo ? `(${p.tipo}) ` : ''}`);
            li.append(criarEl('span', { innerHTML: p.desc || '' }));
            return li;
          }),
        ),
      );
    }
    for (const exemplo of f.exemplos) corpo.append(criarEl('pre', { textContent: exemplo }));

    lista.append(criarEl('details', {}, criarEl('summary', { textContent: f.nome }), corpo));
  }
}

async function ligarReferencia() {
  referencia = await (await fetch('dados/referencia.json')).json();
  $('busca-referencia').oninput = desenharReferencia;
  desenharReferencia();
}

// ---------- console ----------

function ligarConsole() {
  const lista = $('lista-console');
  document.addEventListener('strudel.log', (e) => {
    const { message, type } = e.detail;
    lista.prepend(criarEl('li', { className: type === 'error' || /error/i.test(message) ? 'erro' : '', textContent: message }));
    while (lista.children.length > MAX_CONSOLE) lista.lastChild.remove();
  });
  $('limpar-console').onclick = () => (lista.innerHTML = '');
}

// ---------- configurações ----------

const OPCOES_EDITOR = [
  ['isAutoCompletionEnabled', 'Autocompletar'],
  ['isTooltipEnabled', 'Documentação ao passar o mouse'],
  ['isPatternHighlightingEnabled', 'Destacar o que está tocando'],
  ['isFlashEnabled', 'Piscar ao avaliar'],
  ['isLineNumbersDisplayed', 'Números de linha'],
  ['isActiveLineHighlighted', 'Destacar a linha atual'],
  ['isBracketMatchingEnabled', 'Destacar par de parênteses'],
  ['isBracketClosingEnabled', 'Fechar parênteses sozinho'],
  ['isLineWrappingEnabled', 'Quebrar linhas longas'],
  ['isTabIndentationEnabled', 'Tab indenta o código'],
  ['isMultiCursorEnabled', 'Vários cursores (Ctrl+clique)'],
];

const FONTES = {
  monospace: null,
  'Courier New': null,
  Menlo: null,
  Consolas: null,
  'Fira Code': 'Fira+Code',
  'JetBrains Mono': 'JetBrains+Mono',
  'IBM Plex Mono': 'IBM+Plex+Mono',
  'Space Mono': 'Space+Mono',
  'VT323': 'VT323',
};

function carregarFonte(nome) {
  const google = FONTES[nome];
  if (!google || document.querySelector(`link[data-fonte="${nome}"]`)) return;
  const link = criarEl('link', { rel: 'stylesheet', href: `https://fonts.googleapis.com/css2?family=${google}&display=swap` });
  link.dataset.fonte = nome;
  document.head.append(link);
}

function mudarConfig(repl, chave, valor) {
  const novo = { ...codemirrorSettings.get(), [chave]: valor };
  if (chave === 'fontFamily') carregarFonte(valor);
  repl.editor.updateSettings(novo);
  if (chave === 'theme') activateTheme(valor);
}

function campo(rotulo, entrada) {
  return criarEl('label', { className: 'campo-config' }, criarEl('span', { textContent: rotulo }), entrada);
}

function selecao(opcoes, valor, aoMudar) {
  const sel = criarEl('select', { onchange: () => aoMudar(sel.value) });
  for (const [v, texto] of opcoes) sel.append(new Option(texto, v));
  sel.value = valor;
  return sel;
}

function desenharConfig(repl) {
  const aba = $('aba-config');
  aba.innerHTML = '';
  const cfg = codemirrorSettings.get();
  const audio = lerLocal(CHAVE_AUDIO, {});

  aba.append(criarEl('h3', { textContent: 'Editor' }));
  aba.append(
    campo('Tema', selecao(Object.keys(themes).map((t) => [t, t]), cfg.theme, (v) => mudarConfig(repl, 'theme', v))),
    campo('Fonte', selecao(Object.keys(FONTES).map((f) => [f, f]), cfg.fontFamily, (v) => mudarConfig(repl, 'fontFamily', v))),
    campo(
      'Tamanho da fonte',
      criarEl('input', {
        type: 'number',
        min: 8,
        max: 60,
        value: cfg.fontSize,
        onchange: (e) => mudarConfig(repl, 'fontSize', Number(e.target.value) || 18),
      }),
    ),
    campo(
      'Atalhos de teclado',
      selecao(
        [
          ['codemirror', 'Padrão'],
          ['vim', 'Vim'],
          ['emacs', 'Emacs'],
          ['vscode', 'VS Code'],
        ],
        cfg.keybindings,
        (v) => mudarConfig(repl, 'keybindings', v),
      ),
    ),
  );
  for (const [chave, rotulo] of OPCOES_EDITOR) {
    aba.append(
      criarEl(
        'label',
        { className: 'campo-check' },
        criarEl('input', { type: 'checkbox', checked: !!cfg[chave], onchange: (e) => mudarConfig(repl, chave, e.target.checked) }),
        rotulo,
      ),
    );
  }

  aba.append(criarEl('h3', { textContent: 'Áudio' }));
  const saida = selecao([['', 'Padrão do sistema']], audio.dispositivo || '', async (id) => {
    await getAudioContext().setSinkId?.(id);
    gravarLocal(CHAVE_AUDIO, { ...lerLocal(CHAVE_AUDIO, {}), dispositivo: id });
  });
  const listar = criarEl('button', {
    type: 'button',
    textContent: 'Listar saídas',
    title: 'O navegador vai pedir permissão de microfone só para mostrar os nomes das saídas',
    onclick: async () => {
      const dispositivos = await getAudioDevices();
      saida.innerHTML = '';
      for (const [nome, id] of dispositivos) saida.append(new Option(nome || 'Padrão do sistema', id));
      saida.value = lerLocal(CHAVE_AUDIO, {}).dispositivo || '';
    },
  });
  if (getAudioContext().setSinkId) aba.append(campo('Saída de áudio', criarEl('span', { className: 'linha-botoes' }, saida, listar)));
  aba.append(
    campo(
      'Polifonia máxima',
      criarEl('input', {
        type: 'number',
        min: 1,
        max: 1024,
        value: audio.polifonia || 128,
        onchange: (e) => {
          setMaxPolyphony(e.target.value);
          gravarLocal(CHAVE_AUDIO, { ...lerLocal(CHAVE_AUDIO, {}), polifonia: Number(e.target.value) });
        },
      }),
    ),
    criarEl(
      'label',
      { className: 'campo-check' },
      criarEl('input', {
        type: 'checkbox',
        checked: !!audio.multicanal,
        onchange: (e) => {
          setMultiChannelOrbits(e.target.checked);
          gravarLocal(CHAVE_AUDIO, { ...lerLocal(CHAVE_AUDIO, {}), multicanal: e.target.checked });
        },
      }),
      'Orbits em canais separados (placas multicanal)',
    ),
  );

  aba.append(
    criarEl('h3', { textContent: 'Restaurar' }),
    criarEl('button', {
      type: 'button',
      textContent: 'Voltar às configurações padrão',
      onclick: () => {
        if (!confirm('Voltar todas as configurações ao padrão?')) return;
        repl.editor.updateSettings({ ...defaultSettings, isAutoCompletionEnabled: true, isTooltipEnabled: true });
        activateTheme(defaultSettings.theme);
        gravarLocal(CHAVE_AUDIO, {});
        setMaxPolyphony(128);
        setMultiChannelOrbits(false);
        desenharConfig(repl);
      },
    }),
  );
}

function aplicarConfigSalva(repl) {
  const cfg = codemirrorSettings.get();
  // na primeira vez, liga o autocompletar e a documentação ao passar o mouse
  if (!lerLocal('strudel-ao-vivo:config-inicial', false)) {
    gravarLocal('strudel-ao-vivo:config-inicial', true);
    repl.editor.updateSettings({ ...cfg, isAutoCompletionEnabled: true, isTooltipEnabled: true });
  }
  carregarFonte(cfg.fontFamily);
  activateTheme(cfg.theme);
  const audio = lerLocal(CHAVE_AUDIO, {});
  if (audio.polifonia) setMaxPolyphony(audio.polifonia);
  if (audio.multicanal) setMultiChannelOrbits(true);
  if (audio.dispositivo) getAudioContext().setSinkId?.(audio.dispositivo).catch(() => {});
}

// ---------- início ----------

export async function iniciarPainel(repl) {
  ligarAbas();
  ligarConsole();
  ligarReferencia().catch((e) => ($('lista-referencia').textContent = `erro ao carregar a referência: ${e.message}`));
  // as funções globais do Strudel só existem depois que ele termina de carregar
  await Promise.allSettled([repl.editor.prebaked]);
  aplicarConfigSalva(repl);
  desenharConfig(repl);
  ligarSons();
}
