# Highrise — History

## 2026-05-17 — Adopted the four-file project convention

- Created `PROJECT.md`, `PLAN.md` and `TODO.md` at the game root, alongside the existing `HISTORY.md`, following the global four-file convention.
- `PROJECT.md` describes what the game is, current status, scope, key context, and how it relates to its sibling `soberba`.
- `PLAN.md` carries the full Phase 1-6 roadmap as checkboxes, mirroring decisions previously embedded in `HISTORY.md`.
- `TODO.md` lists in-flight items, recently done work, and items under consideration (notably shipping v1 to Itch.io).
- All new entries in this `HISTORY.md`, all new code comments and all commit messages will be written in English from this point forward, per global convention.
- Existing Portuguese entries below are preserved as a historical record and will not be retroactively rewritten.

## 2026-05-17 — Air control assimétrico (acelerar ≠ inverter)

- Insight do user após 5000: o problema não era responsividade geral, era a velocidade de **inversão de direção**.
- Split em duas constantes:
  - `AIR_ACCEL_SAME = 5000` — acelerar na direção atual (ou do parado): responsivo
  - `AIR_ACCEL_REVERSE = 1500` — inverter direção (vx tem sinal oposto ao input): lento, "tem peso"
- Resultado: pulo é responsivo (atinge max speed rápido), mas se comprometer com a direção tem custo. Recompensa decisão antes do pulo.
- Padrão clássico de bons platformers (Celeste, Super Meat Boy fazem variações disso).

## 2026-05-17 — Tuning: AIR_ACCEL 1500 → 4000 (controle no ar mais responsivo)

- Re-tuning depois do user testar 1500 e achar muito flutuante.
- Tempo pra inverter de full speed pra full speed contrário: ~0.16s (quase como no chão).

## 2026-05-17 — Tuning: AIR_ACCEL 2500 → 1500 (mais flutuante)

- Tentativa intermediária — não funcionou, ficou pesado demais.

## 2026-05-17 — Fix de feel: controle horizontal preserva momentum no ar

- Bug clássico: input horizontal sobrescrevia velocidade direto via `setVelocityX(0)` quando nada estava pressionado, fazendo o player parar bruscamente no ar.
- Fix: split entre chão e ar.
  - **No chão:** controle direto e responsivo (mantém o feel atual de chaining de pulos).
  - **No ar:** input vira aceleração (`AIR_ACCEL = 2500 px/s²`), não substituição. Soltar tecla = continua no momentum. Inverter direção = possível mas com inércia.
- Velocidade no ar capada em `MOVE_SPEED` (320 px/s) pra arco do pulo continuar previsível.

## 2026-05-17 — Phase 3 (parte 1): Super pulo com cooldown

- Reformulação da Phase 3: além dos pickups de mundo originalmente planejados, vamos ter também **abilities baseadas em cooldown**. Super pulo é o primeiro.
- **Mecânica:**
  - Velocidade × `SUPER_JUMP_MULTIPLIER = 1.5` (≈ 2.25× a altura, sensação de "o dobro" sem quebrar a física)
  - Carga única: 1 a cada 60s de corrida ativa, máximo 3, congelado em max
  - Botão `action` (espaço / gamepad B / swipe down) consome carga
  - Sem carga: `action` cai como pulo normal (não vira tecla "morta")
  - Só dispara no chão (`blocked.down`) — não é double jump
- **HUD:** `SUPER: xN (Ms)` em ciano abaixo do nível, mostra cargas atuais + segundos pra próxima.
- **Feedback:** ao usar, player escala 1.4 → 1.0 e flasha ciano por 180ms. Ao ganhar carga, texto do HUD pulsa (Back.easeOut).
- **Tuning escolhido (60s/charge, max 3):** corrida típica de 1-3 min dá 1-3 super pulos. Suficiente pra ser estratégico, raro pra ser especial.

## 2026-05-17 — Removido screen-wrap, paredes laterais reais

- Antes: player atravessava a borda (Pac-Man style) — ficou cringe.
- Agora: `physics.world.setBounds(0, -1e6, GAME_WIDTH, GAME_HEIGHT + 2e6)` + `playerBody.setCollideWorldBounds(true)`.
- Bounds verticais são propositalmente distantes: não interferem (player morre muito antes de tocá-los), só as laterais importam.

## 2026-05-16 — Phase 2: curva de dificuldade por altura

- `getLevelConfig(heightM)` deriva 3 parâmetros que escalam com a altura: `stepWidth`, `verticalGap`, `scrollSpeed`. Interpolação **contínua** (linear) entre nível 1 (heightM = 0) e máximo (heightM = 500).
- Curvas:
  - `stepWidth`: 96 → 50px
  - `verticalGap`: 110 → 125px (range pequeno por causa da física do pulo, não dá pra exigir gap maior que o pulo alcança)
  - `scrollSpeed`: 30 → 85 px/s (~2.8× mais rápido)
- Display de "nível" é discreto (1-10), incrementa a cada 50m de altura, capa em 10. O número serve só pra HUD e flash visual; a config interpola por trás suavemente.
- Steps já existentes não mudam — só os novos usam a config corrente.
- Flash "NÍVEL X" no centro da tela quando incrementa, com tween scale + alpha (Back.easeOut na entrada, fade-out na saída).
- HUD: `NÍVEL X` sutil em dourado abaixo do `ALTURA`.
- **Decisão de tuning:** preservei o nível 1 = setup original (96/110/30) porque o user acabou de aprovar o feel daquilo. Phase 2 só ESCALA a partir disso, não altera o estado inicial.
- **Trivia:** Icy Tower original anuncia volta na Steam pra 2026 (Win/Mac). Não muda estratégia — competimos em mercado diferente (web portal vs Steam core).

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
