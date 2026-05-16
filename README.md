# ARCADE

> Coleção de jogos HTML5 curtos. Browser-first, portal-ready.

## Estrutura

```
arcade/
  index.html              # landing page do arcade (lista de jogos)
  shared/
    input/InputManager.ts # teclado + gamepad + touch unificados
    sdk/                  # wrappers de SDK dos portais (CrazyGames, Poki)
    juice/                # efeitos compartilhados (screen shake, etc)
    score/                # leaderboards / persistência (futuro)
  games/
    soberba/              # Tetris físico com pedras antigas
    highrise/             # Vertical jumper estilo Icy Tower
```

## Stack

- **Phaser 3** + **TypeScript** + **Vite** (multi-page build)
- Matter.js (built-in no Phaser) para jogos com física complexa
- Arcade physics (também built-in) para platformers

## Comandos

```bash
npm install
npm run dev       # serve todos os jogos em http://localhost:5173
npm run build     # build de todos os jogos pra dist/
npm run preview   # serve a build de produção
```

Dev: abrir `http://localhost:5173/` para landing, ou `http://localhost:5173/games/highrise/` direto.

## Adicionando um jogo novo

1. Cria `games/<nome>/index.html` e `games/<nome>/src/main.ts`
2. Adiciona entrada no `vite.config.ts` em `rollupOptions.input`
3. Adiciona card na landing `index.html`
4. Importa shared via `@shared/input/InputManager` (alias configurado)

## Deploy

- **Itch.io:** upload do `dist/` inteiro como zip (mostra landing + todos os jogos)
- **CrazyGames / Poki:** upload do `dist/games/<nome>/` específico (jogo isolado)

## Convenção de ações de input

`InputManager` expõe ações genéricas: `left`, `right`, `up`, `down`, `action`. Cada jogo interpreta:

| Ação    | Soberba       | Highrise      |
|---------|---------------|---------------|
| left    | mover ←       | mover ←       |
| right   | mover →       | mover →       |
| up      | rotacionar    | pular         |
| down    | soft drop     | (livre)       |
| action  | hard drop     | pular (alt)   |
