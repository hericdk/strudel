# Strudel ao vivo

Um espaço pessoal para escrever música com código e ouvir as mudanças na hora (_live coding_),
direto no navegador. Usa o [Strudel](https://strudel.cc) oficial (código em
[codeberg.org/uzu/strudel](https://codeberg.org/uzu/strudel)), carregado pela CDN — não há nada
para instalar nem compilar.

## Começando

### 1. Abrir no navegador

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

### 2. Tocar

| Ação                       | Como                                         |
| -------------------------- | -------------------------------------------- |
| Tocar / aplicar mudanças   | **Ctrl+Enter** (ou botão ▶ Tocar)            |
| Parar                      | **Ctrl+.** (ou botão ■ Parar)                |
| Reavaliar sozinho          | marque **Ao vivo**: depois de tocar, cada pausa na digitação já aplica o código |
| Trocar de exemplo          | menu **Padrão**                              |
| Guardar o que fez          | botão **⬇ Baixar** (salva um `.js`)          |

O navegador só libera som depois de um clique na página — se não ouvir nada, clique em ▶ Tocar.
Os sons (bateria, piano etc.) são baixados da internet na primeira vez, então pode demorar alguns
segundos. Se aparecer `error loading ...` na barra, confira a internet e recarregue a página.

## Como usar da melhor forma

- **Seu código fica salvo sozinho no navegador** (opção _(meu rascunho)_ no menu). Mas é só naquele
  navegador: para guardar de verdade, use **⬇ Baixar** e coloque o arquivo na pasta `padroes/`.
- **Criar um padrão novo:** crie `padroes/meu-som.js` e adicione `"meu-som"` em `padroes/lista.json`.
  Faça commit e push; ele aparece no menu.
- **Link direto para um padrão:** `.../?p=meu-som` abre direto nele. Bom para favoritos.
- **Estrutura de uma música:** cada linha com `$:` é uma camada tocando junto. Para silenciar uma
  camada, troque `$:` por `_$:`.
- **Mude uma coisa por vez** e aperte Ctrl+Enter: a música troca no próximo ciclo, sem parar.
- Para aprender as funções, o melhor material é o tutorial oficial:
  <https://strudel.cc/workshop/getting-started/> e a referência <https://strudel.cc/learn/>.
  Tudo que funciona no site strudel.cc funciona aqui.

## Estrutura

```
index.html        a página (barra de cima + editor)
css/estilo.css    aparência da barra
js/app.js         liga os botões ao editor, salva rascunho, modo "ao vivo"
padroes/          seus padrões (.js) + lista.json com a ordem do menu
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
- **Atualizar o Strudel:** troque o número `1.3.0` em `index.html` pela versão mais nova
  (veja em <https://www.npmjs.com/package/@strudel/repl>). A versão fica fixa de propósito, para
  nada quebrar sozinho.

## Licença

O Strudel é licenciado sob **AGPL-3.0**. Para uso pessoal não há nada a fazer; se um dia você
distribuir ou abrir este projeto para outras pessoas usarem, o código dele também precisa ser
disponibilizado sob uma licença compatível com a AGPL.
