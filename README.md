# Strudel ao vivo

Um espaço pessoal para escrever música com código e ouvir as mudanças na hora (_live coding_),
direto no navegador. Usa o [Strudel](https://strudel.cc) oficial (código em
[codeberg.org/uzu/strudel](https://codeberg.org/uzu/strudel)), carregado pela CDN — não há nada
para instalar nem compilar.

## Começando

### 1. Abrir no navegador

**No seu site (ex.: chuva.tech/strudel):** envie a pasta inteira (`index.html`, `css/`, `js/`,
`padroes/`) para o servidor. Não precisa de nada especial no servidor — são arquivos estáticos, e
os caminhos são relativos, então funciona em qualquer subpasta.

**Online (GitHub Pages)** — uma vez só:

1. No GitHub, abra o repositório → **Settings** → **Pages**.
2. Em **Build and deployment**, escolha **Deploy from a branch**.
3. Selecione a branch onde está este código e a pasta **/ (root)** → **Save**.
4. Depois de um ou dois minutos o link aparece no topo dessa mesma página
   (algo como `https://hericdk.github.io/strudel/`). Esse é o seu atalho.

> **Repositório privado:** o GitHub Pages em repositório privado só funciona em plano pago
> (GitHub Pro, Team ou Enterprise). E, mesmo com o repositório privado, **o site publicado
> fica público** para quem tiver o link (exceto no Enterprise). Se não quiser isso, use o modo local abaixo.

**No seu computador** — precisa só de Python (já vem no macOS):

```sh
cd /Users/heric/Documents/git/strudel
python3 -m http.server 8000
```

Depois abra <http://localhost:8000>. (Abrir o `index.html` com duplo clique **não** funciona,
porque o navegador bloqueia o carregamento dos padrões de arquivos locais.)

### 2. Tela inicial: seus sons em caixas

Cada som salvo aparece numa caixa com o começo do código. Em cada caixa:

- **▶ Ouvir** — toca uma prévia ali mesmo (clique de novo para parar);
- **✎ Editar** (ou clique no nome/código) — abre no editor;
- **⧉ Duplicar** — cria uma cópia para experimentar sem estragar o original;
- **🗑** — exclui o som e o histórico dele.

No topo: **＋ Novo**, **⬇ Exportar tudo** (um `.json` com todos os sons e históricos) e
**⬆ Importar** (carrega esse `.json` de volta).

### 3. Editor

| Ação                       | Como                                         |
| -------------------------- | -------------------------------------------- |
| Tocar / aplicar mudanças   | **Ctrl+Enter** (ou botão ▶ Tocar)            |
| Parar                      | **Ctrl+.** (ou botão ■ Parar)                |
| Reavaliar sozinho          | marque **Ao vivo**: depois de tocar, cada pausa na digitação já aplica o código |
| Renomear                   | clique no nome, ao lado de **← Sons**        |
| Guardar uma versão         | **✚ Salvar versão**                          |
| Ver / voltar versões       | **🕘 Histórico** → **Abrir** (o código atual vira uma versão antes, nada se perde) |
| Baixar como texto          | **⬇ .txt** (o código atual) ou **⬇ .txt** numa versão do histórico |
| Voltar para a lista        | **← Sons**                                   |

O navegador só libera som depois de um clique na página — se não ouvir nada, clique em ▶ Tocar.
Os sons (bateria, piano etc.) são baixados da internet na primeira vez, então pode demorar alguns
segundos. Se aparecer `error loading ...`, confira a internet e recarregue a página.

## Onde os sons ficam salvos

- **Automaticamente, no navegador** (`localStorage`), em JSON: cada tecla digitada é salva em
  meio segundo. Não precisa apertar nada.
- **Versões:** criadas quando você clica em **✚ Salvar versão** e sempre que sai do editor com
  mudanças. Guarda até 100 versões por som.
- **Atenção — é por navegador e por endereço.** Chrome e Safari não compartilham; `localhost`,
  `github.io` e `chuva.tech` também não. Limpar os dados do site apaga tudo.
  **Use ⬇ Exportar tudo de vez em quando** como backup, e **⬆ Importar** para levar seus sons
  de um lugar para outro.
- Um site estático não consegue gravar arquivos sozinho no servidor ou no seu computador; por isso
  o backup é pelo botão de exportar. Se um dia quiser salvar direto numa pasta ou na nuvem, dá para
  adicionar (veja “Modificar no futuro”).

## Como usar da melhor forma

- **Duplique antes de experimentar algo grande** — ou salve uma versão; as duas coisas são baratas.
- **Estrutura de uma música:** cada linha com `$:` é uma camada tocando junto. Para silenciar uma
  camada, troque `$:` por `_$:`.
- **Mude uma coisa por vez** e aperte Ctrl+Enter: a música troca no próximo ciclo, sem parar.
- **Exemplos iniciais:** na primeira vez que a página abre (biblioteca vazia), ela cria sons a partir
  dos arquivos da pasta `padroes/`. Para mudar esses exemplos, edite os `.js` de lá e o
  `padroes/lista.json`.
- Para aprender as funções, o melhor material é o tutorial oficial:
  <https://strudel.cc/workshop/getting-started/> e a referência <https://strudel.cc/learn/>.
  Tudo que funciona no site strudel.cc funciona aqui.

## Estrutura

```
index.html          a página: tela inicial (caixas) + editor
css/estilo.css      aparência
js/app.js           telas, botões, prévia, modo "ao vivo", histórico
js/biblioteca.js    salvar/carregar sons e versões (formato JSON)
padroes/            exemplos iniciais (.js) + lista.json
```

## Modificar no futuro

Sim, dá para mudar tudo — é só HTML, CSS e JavaScript comuns:

- **Interface:** edite `index.html` e `css/estilo.css`. O editor é o componente
  `<strudel-editor>`; em `js/app.js`, `repl.editor` dá acesso a `evaluate()`, `stop()`,
  `setCode(texto)` e `code`.
- **Three.js / visuais:** dá para adicionar o Three.js pela CDN
  (`<script type="module">` com `import * as THREE from 'https://cdn.jsdelivr.net/npm/three/+esm'`)
  e reagir ao que está tocando. O Strudel também já traz o [Hydra](https://strudel.cc/learn/hydra/)
  para visuais e `.pianoroll()` / `.punchcard()` para desenhar as notas.
- **Salvar em arquivos ou na nuvem:** no Chrome/Edge dá para usar a File System Access API para
  gravar direto numa pasta do computador; para sincronizar entre aparelhos, seria preciso um
  pequeno back-end (ou um serviço como Supabase/Firebase) no lugar de `js/biblioteca.js`.
- **Atualizar o Strudel:** troque o número `1.3.0` em `index.html` pela versão mais nova
  (veja em <https://www.npmjs.com/package/@strudel/repl>). A versão fica fixa de propósito, para
  nada quebrar sozinho.

## Licença

O Strudel é licenciado sob **AGPL-3.0**. Para uso pessoal não há nada a fazer; se um dia você
distribuir ou abrir este projeto para outras pessoas usarem, o código dele também precisa ser
disponibilizado sob uma licença compatível com a AGPL.
