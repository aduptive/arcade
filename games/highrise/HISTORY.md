# Highrise — History

## 2026-05-16 — Trigger do auto-scroll: pouso real, não decolagem

- Antes: auto-scroll disparava quando `player.y < startY - 50` — ativava no ar durante o primeiro pulo, antes de pousar.
- Agora: dispara no **collider callback** quando o player encosta num step que **não é o `isFloor`** (chão inicial). Marca o chão com `setData('isFloor', true)` no `addPlatform()`.
- Mesmo trigger que liga o timer de tempo de corrida.
- Razão: feedback do user — pressão deve começar quando ele de fato pousou no primeiro degrau, não quando começou a pular.

## 2026-05-16 — Tracking de tempo + nova Phase 5 "Scoring & Hall of Fame"

- Adicionado tracking de tempo de corrida em `GameScene`: começa no mesmo trigger do auto-scroll (player subiu pelo primeiro step), para no game over.
- HUD ganhou `TEMPO: m:ss` no canto superior direito.
- `GameOverScene` recebe `{ score, timeMs }` e mostra os dois.
- **Roadmap reorganizado:**
  - Phase 1 — core feel (auto-scroll + permadeath + tracking de tempo) ← atual
  - Phase 2 — curva de dificuldade por nível
  - Phase 3 — pickups (double jump, super jump, shield, multiplier)
  - Phase 4 — combo system
  - **Phase 5 (NOVA) — Scoring & Hall of Fame:** fórmula composta de score (provável: `altura × 10 + tempo × 2 + bestCombo × 50 + pickups × 25` — calibrar), local leaderboard top-10 em localStorage, tela de Hall of Fame acessível do menu inicial / game over.
  - Phase 6 — vestido (era 5)
- Razão da nova phase: scoring justo precisa de combo e pickups travados pra fórmula ter peso real. Por isso vem **depois** delas, não antes.

## 2026-05-16 — Phase 1 tuning: auto-scroll começa após o 1º step

- Feedback do user após jogar: feel da Phase 1 ficou "perfeito", mas auto-scroll ativando desde o frame 1 dá pressão antes do jogo "começar de verdade".
- Trigger movido: `autoScrollActive` vira true só quando `player.y < startY - 50` (subiu pelo menos 1 step do chão inicial).
- Antes disso a câmera só segue o player (Doodle Jump-style). Depois, comportamento híbrido completo da Phase 1.
- `AUTO_SCROLL_SPEED = 30` mantido como baseline (vai escalar por nível na Phase 2).

## 2026-05-16 — Phase 1: auto-scroll híbrido + permadeath

**Decisões travadas hoje:**

- **Glossário:** `step` (plataforma), `nível` (segmento de altura, dispara mudança de dificuldade/visual), `combo` (saltos consecutivos sem tocar chão), `pickup` (item coletável).
- **Vidas:** permadeath. Sem múltiplas vidas. Razão: gênero (Icy Tower, Doodle Jump, Geometry Dash) é todo permadeath, casa com loop "só mais uma" e score-attack. Forgiveness vai vir via Shield pickup na Phase 3.
- **Roadmap travado:**
  - Phase 1 — core feel: auto-scroll híbrido, permadeath ← feito
  - Phase 2 — curva de dificuldade: níveis por altura com config (stepWidth, gap, scrollSpeed) interpolados
  - Phase 3 — pickups: double jump, super jump, shield, score multiplier
  - Phase 4 — combo system estilo Icy Tower (multiplicador + texto gigante)
  - Phase 5 — vestido (sprites, themes por nível, parallax, partículas, screen shake, som, música)

**Implementação Phase 1:**

- Câmera tem 2 fontes de movimento, sempre toma a mais "pra cima":
  1. `playerTarget = player.y - GAME_HEIGHT * 0.6` (segue player se ele subir rápido)
  2. `autoScrollTarget = scrollY - AUTO_SCROLL_SPEED * dt` (sobe constante)
- `cam.scrollY = min(cam.scrollY, playerTarget, autoScrollTarget)` — câmera nunca desce.
- `AUTO_SCROLL_SPEED = 30` px/s pra Phase 1. Vai escalar por nível na Phase 2.
- Game over: `player.y > cam.scrollY + GAME_HEIGHT + 30` — engolido por baixo, seja por queda ou por scroll.
- `dt` capado em 100ms pra evitar teleporte ao trocar de aba.

## 2026-05-15 — Bootstrap

- Criado dentro do monorepo `aduptive/arcade` (após pivot de Soberba — usuário descobriu que não joga Tetris).
- Stack escolhida: Phaser 3 + Arcade physics (vs. Matter do Soberba — platformer pede Arcade).
- Scaffold inicial: player retangular laranja, steps procedurais verdes, screen wrap horizontal, câmera só pra cima (Doodle Jump-style, sem auto-scroll), score por altura em metros.
- Imports compartilhados via `@shared/input/InputManager` (alias do tsconfig + vite).
- **Bug fix:** `START_Y = GAME_HEIGHT - 150` no top-level do módulo causava TDZ (import circular com `main.ts`). Movido pra dentro de `create()` como `this.startY`.
- Critério de escolha do gênero: usuário citou Icy Tower, Camy 2, Iron Blood, Leo's Fortune como referências afetivas — todos plataforma 2D. Vertical jumper venceu por: zero level design (procedural), 1 mecânica (pular), formato mobile-portrait (cobre 50% do tráfego de portal), gênero validado em receita (Doodle Jump fez dezenas de milhões de USD).
