// Regenera dados/referencia.json (aba "Referência") a partir da documentação que vem
// dentro do pacote @strudel/repl. Rode depois de trocar a versão no index.html:
//   node ferramentas/atualizar-referencia.mjs 1.3.0
import { writeFileSync } from 'fs';

const versao = process.argv[2] || '1.3.0';
const js = await (await fetch(`https://unpkg.com/@strudel/repl@${versao}/dist/index.js`)).text();

const marca = 'const docs=JSON.parse(';
const inicio = js.indexOf(marca) + marca.length;
if (inicio < marca.length) throw new Error('documentação não encontrada nesta versão');
let fim = inicio + 1;
while (!(js[fim] === '`' && js[fim - 1] !== '\\')) fim++;
const docs = JSON.parse(eval(js.slice(inicio, fim + 1)));

const itens = docs
  .filter((d) => d.name && !d.name.startsWith('_') && !d.undocumented && d.description)
  .map((d) => ({
    nome: d.name,
    desc: d.description,
    params: (d.params || []).map((p) => ({ nome: p.name, tipo: p.type?.names?.join(' | '), desc: p.description })),
    exemplos: d.examples || [],
    sinonimos: d.synonyms || [],
    grupo: d.memberof || '',
  }));
const unicos = [...new Map(itens.map((d) => [d.nome, d])).values()].sort((a, b) => a.nome.localeCompare(b.nome));
writeFileSync(new URL('../dados/referencia.json', import.meta.url), JSON.stringify(unicos));
console.log(`${unicos.length} funções salvas em dados/referencia.json`);
