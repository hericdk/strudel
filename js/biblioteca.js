// Biblioteca de sons: guarda cada som, com seu histórico de versões,
// no armazenamento do navegador (localStorage), em formato JSON.
//
// Formato (é o mesmo do arquivo "Exportar tudo"):
// {
//   "formato": "strudel-ao-vivo",
//   "versao": 1,
//   "sons": [
//     { "id", "nome", "codigo", "criadoEm", "atualizadoEm",
//       "versoes": [ { "em", "codigo" }, ... ]   // mais recente primeiro
//     }
//   ]
// }

const CHAVE = 'strudel-ao-vivo:biblioteca';
const CHAVE_RASCUNHO_ANTIGO = 'strudel-ao-vivo:rascunho';
const MAX_VERSOES = 100;

let dados = { formato: 'strudel-ao-vivo', versao: 1, sons: [] };

function agora() {
  return new Date().toISOString();
}

function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function gravar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(dados));
    return true;
  } catch {
    return false; // sem armazenamento (janela anônima) ou cheio
  }
}

// Carrega do navegador. Se estiver vazio, começa com os exemplos da pasta padroes/.
export async function carregar() {
  let salvo = null;
  try {
    salvo = JSON.parse(localStorage.getItem(CHAVE));
  } catch {
    salvo = null;
  }
  if (salvo?.sons) {
    dados = salvo;
    return;
  }

  const lista = await (await fetch('padroes/lista.json', { cache: 'no-cache' })).json();
  for (const nome of lista) {
    const codigo = await (await fetch(`padroes/${nome}.js`, { cache: 'no-cache' })).text();
    criar(nome, codigo, false);
  }
  // traz o rascunho da versão anterior da página, se existir
  try {
    const antigo = localStorage.getItem(CHAVE_RASCUNHO_ANTIGO);
    if (antigo) criar('meu rascunho', antigo, false);
  } catch {}
  gravar();
}

export function todos() {
  return [...dados.sons].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
}

export function pegar(id) {
  return dados.sons.find((s) => s.id === id);
}

export function criar(nome, codigo, salvar = true) {
  const som = { id: novoId(), nome, codigo, criadoEm: agora(), atualizadoEm: agora(), versoes: [] };
  dados.sons.push(som);
  salvar && gravar();
  return som;
}

export function duplicar(id) {
  const original = pegar(id);
  return criar(`${original.nome} (cópia)`, original.codigo);
}

export function excluir(id) {
  dados.sons = dados.sons.filter((s) => s.id !== id);
  gravar();
}

export function renomear(id, nome) {
  pegar(id).nome = nome;
  gravar();
}

// Autosave: atualiza o código atual (não cria versão).
export function atualizarCodigo(id, codigo) {
  const som = pegar(id);
  if (!som || som.codigo === codigo) return true;
  som.codigo = codigo;
  som.atualizadoEm = agora();
  return gravar();
}

// Guarda o código atual como uma versão no histórico (se mudou desde a última).
export function salvarVersao(id) {
  const som = pegar(id);
  if (som.versoes[0]?.codigo === som.codigo) return false;
  som.versoes.unshift({ em: agora(), codigo: som.codigo });
  som.versoes.length = Math.min(som.versoes.length, MAX_VERSOES);
  gravar();
  return true;
}

export function exportarJson() {
  return JSON.stringify(dados, null, 2);
}

// Importa um arquivo exportado. Sons com o mesmo id são substituídos; os demais são adicionados.
export function importarJson(texto) {
  const entrada = JSON.parse(texto);
  if (!Array.isArray(entrada?.sons)) throw new Error('arquivo não é uma biblioteca do Strudel ao vivo');
  for (const som of entrada.sons) {
    if (typeof som.codigo !== 'string') continue;
    const completo = {
      id: som.id || novoId(),
      nome: som.nome || 'sem nome',
      codigo: som.codigo,
      criadoEm: som.criadoEm || agora(),
      atualizadoEm: som.atualizadoEm || agora(),
      versoes: Array.isArray(som.versoes) ? som.versoes : [],
    };
    dados.sons = dados.sons.filter((s) => s.id !== completo.id);
    dados.sons.push(completo);
  }
  gravar();
  return entrada.sons.length;
}
