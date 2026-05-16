/**
 * Poki SDK wrapper (stub).
 *
 * Doc oficial: https://sdk.poki.com/
 *
 * Usage:
 *   import { PokiSDK } from '@shared/sdk/poki'
 *   const sdk = new PokiSDK()
 *   await sdk.init()
 *   sdk.gameplayStart()
 *   ...
 *   sdk.gameplayStop()
 *   sdk.commercialBreak()
 *
 * Para usar: incluir <script src="//game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>
 * no index.html do jogo.
 */

declare global {
  interface Window {
    PokiSDK?: any
  }
}

export class PokiSDK {
  private available = false

  async init(): Promise<void> {
    if (typeof window !== 'undefined' && window.PokiSDK) {
      try {
        await window.PokiSDK.init()
        this.available = true
      } catch (e) {
        console.warn('Poki SDK init failed:', e)
      }
    }
  }

  gameplayStart() {
    if (this.available) window.PokiSDK?.gameplayStart?.()
  }

  gameplayStop() {
    if (this.available) window.PokiSDK?.gameplayStop?.()
  }

  gameLoadingStart() {
    if (this.available) window.PokiSDK?.gameLoadingStart?.()
  }

  gameLoadingFinished() {
    if (this.available) window.PokiSDK?.gameLoadingFinished?.()
  }

  async commercialBreak(): Promise<void> {
    if (!this.available) return
    try {
      await window.PokiSDK?.commercialBreak?.()
    } catch {}
  }

  async rewardedBreak(): Promise<boolean> {
    if (!this.available) return false
    try {
      const result = await window.PokiSDK?.rewardedBreak?.()
      return !!result
    } catch {
      return false
    }
  }
}
