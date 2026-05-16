/**
 * CrazyGames SDK wrapper (stub).
 *
 * Doc oficial: https://docs.crazygames.com/sdk/html5-v3/
 *
 * Usage:
 *   import { CrazyGamesSDK } from '@shared/sdk/crazygames'
 *   const sdk = new CrazyGamesSDK()
 *   await sdk.init()
 *   sdk.gameplayStart()
 *   ...
 *   sdk.gameplayStop()
 *   sdk.showAd('midgame')
 *
 * Para usar: incluir <script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
 * no index.html do jogo (apenas em produção / quando hospedado em crazygames.com).
 */

declare global {
  interface Window {
    CrazyGames?: any
  }
}

export class CrazyGamesSDK {
  private available = false

  async init(): Promise<void> {
    if (typeof window !== 'undefined' && window.CrazyGames?.SDK) {
      try {
        await window.CrazyGames.SDK.init()
        this.available = true
      } catch (e) {
        console.warn('CrazyGames SDK init failed:', e)
      }
    }
  }

  gameplayStart() {
    if (this.available) window.CrazyGames?.SDK?.game?.gameplayStart?.()
  }

  gameplayStop() {
    if (this.available) window.CrazyGames?.SDK?.game?.gameplayStop?.()
  }

  loadingStart() {
    if (this.available) window.CrazyGames?.SDK?.game?.loadingStart?.()
  }

  loadingStop() {
    if (this.available) window.CrazyGames?.SDK?.game?.loadingStop?.()
  }

  async showAd(type: 'midgame' | 'rewarded' = 'midgame'): Promise<boolean> {
    if (!this.available) return false
    try {
      await window.CrazyGames?.SDK?.ad?.requestAd?.(type)
      return true
    } catch {
      return false
    }
  }

  happyTime() {
    if (this.available) window.CrazyGames?.SDK?.game?.happytime?.()
  }
}
