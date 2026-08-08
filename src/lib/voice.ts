// Модуль «голос бариста»: озвучивает шаги рецепта через браузерный
// Web Speech API (SpeechSynthesis), стараясь выбрать самый низкий/мужской
// голос из доступных в браузере пользователя, и слегка понижает pitch,
// чтобы звучание было ближе к мягкому баритону.
//
// Важный нюанс: список голосов (getVoices()) во многих браузерах
// подгружается АСИНХРОННО и в момент первого клика может быть пустым —
// если в этот момент запустить speak() без ожидания, некоторые браузеры
// (особенно на Android/мобильных) молча ничего не озвучат, без ошибки в
// консоли. Поэтому play() всегда дожидается загрузки голосов.
//
// Второй нюанс — известный баг Chrome: если ничего не делать, синтез
// речи автоматически «засыпает» примерно через 15 секунд молчания и
// длинные рецепты обрываются на середине. Для этого запущен keep-alive:
// пока идёт озвучка, каждые несколько секунд дёргаем pause()/resume().

export interface VoiceSettings {
  rate: number // 0.6 - 1.3, по умолчанию чуть медленнее обычного
  pitch: number // 0 - 2, по умолчанию понижен для баритона
  voiceURI: string | null
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  rate: 0.92,
  pitch: 0.75,
  voiceURI: null,
}

const RU_MALE_HINTS = ['ru', 'russian', 'yuri', 'dmitri', 'pavel', 'maxim', 'ivan']
const MALE_HINTS = ['male', 'man', 'daniel', 'google русский', 'yandex']

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function getVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return []
  return window.speechSynthesis.getVoices()
}

/**
 * Загружает список голосов, дожидаясь события voiceschanged
 * (в некоторых браузерах голоса подгружаются асинхронно).
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) {
      resolve([])
      return
    }
    const existing = window.speechSynthesis.getVoices()
    if (existing.length > 0) {
      resolve(existing)
      return
    }
    const handler = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler)
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener('voiceschanged', handler)
    // fallback на случай, если событие не сработает
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1200)
  })
}

/**
 * Пытается найти "лучший" голос бариста: русский мужской, иначе
 * любой мужской, иначе первый русский, иначе первый доступный.
 */
export function pickBaristaVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null

  const score = (v: SpeechSynthesisVoice) => {
    const name = v.name.toLowerCase()
    const lang = v.lang.toLowerCase()
    let s = 0
    if (lang.startsWith('ru')) s += 10
    if (RU_MALE_HINTS.some((h) => name.includes(h))) s += 5
    if (MALE_HINTS.some((h) => name.includes(h))) s += 4
    if (name.includes('female') || name.includes('woman')) s -= 6
    return s
  }

  const sorted = [...voices].sort((a, b) => score(b) - score(a))
  return sorted[0] ?? null
}

const VOICE_PREF_KEY = 'my-somelier:voice-uri'

export function loadPreferredVoiceURI(): string | null {
  try {
    return localStorage.getItem(VOICE_PREF_KEY)
  } catch {
    return null
  }
}

export function savePreferredVoiceURI(voiceURI: string | null) {
  try {
    if (voiceURI) localStorage.setItem(VOICE_PREF_KEY, voiceURI)
    else localStorage.removeItem(VOICE_PREF_KEY)
  } catch {
    // localStorage недоступен (приватный режим и т.п.) — просто не сохраняем
  }
}

/**
 * Список голосов для селектора в интерфейсе: сперва русские, затем все
 * остальные по алфавиту — чтобы нужный голос было проще найти в длинном
 * списке (Edge, например, отдаёт по 40+ голосов на все языки сразу).
 */
export function sortVoicesForPicker(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    const aRu = a.lang.toLowerCase().startsWith('ru') ? 0 : 1
    const bRu = b.lang.toLowerCase().startsWith('ru') ? 0 : 1
    if (aRu !== bRu) return aRu - bRu
    return a.name.localeCompare(b.name)
  })
}

export type VoiceDiagnosis =
  | { ok: true; voiceCount: number; pickedVoiceName: string }
  | { ok: false; reason: 'unsupported' | 'no-voices' }

/**
 * Быстрая диагностика: получится ли вообще что-то озвучить в этом
 * браузере. Используется, чтобы показать пользователю понятное
 * объяснение вместо тишины без причины.
 */
export async function diagnoseVoice(): Promise<VoiceDiagnosis> {
  if (!isSpeechSupported()) return { ok: false, reason: 'unsupported' }
  const voices = await loadVoices()
  if (voices.length === 0) return { ok: false, reason: 'no-voices' }
  const picked = pickBaristaVoice(voices)
  return { ok: true, voiceCount: voices.length, pickedVoiceName: picked?.name ?? 'системный голос' }
}

class BaristaPlayer {
  private utterances: SpeechSynthesisUtterance[] = []
  private listeners: Set<(state: PlayerState) => void> = new Set()
  private settings: VoiceSettings = DEFAULT_VOICE_SETTINGS
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null
  private playToken = 0

  state: PlayerState = { status: 'idle', stepIndex: -1 }

  subscribe(fn: (state: PlayerState) => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit() {
    this.listeners.forEach((fn) => fn(this.state))
  }

  private setState(patch: Partial<PlayerState>) {
    this.state = { ...this.state, ...patch }
    this.emit()
  }

  updateSettings(settings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...settings }
  }

  private startKeepAlive() {
    this.stopKeepAlive()
    // Обход известного бага Chrome: без периодического pause/resume
    // синтез речи останавливается сам по себе примерно через 15 секунд.
    this.keepAliveTimer = setInterval(() => {
      if (!isSpeechSupported()) return
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }
    }, 4000)
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer)
      this.keepAliveTimer = null
    }
  }

  /**
   * Проговаривает шаги рецепта. Голоса могут быть ещё не загружены на
   * момент вызова (особенно при первом клике после открытия страницы) —
   * поэтому ждём их явно, вместо того чтобы молча озвучивать без голоса.
   */
  async play(steps: string[], settings?: Partial<VoiceSettings>) {
    if (!isSpeechSupported()) return
    this.stop()
    if (settings) this.updateSettings(settings)

    const token = ++this.playToken
    const voices = await loadVoices()
    if (token !== this.playToken) return // play() вызвали ещё раз, пока ждали голоса

    const voice =
      (this.settings.voiceURI && voices.find((v) => v.voiceURI === this.settings.voiceURI)) ||
      pickBaristaVoice(voices)

    this.utterances = steps.map((text, i) => {
      const u = new SpeechSynthesisUtterance(text)
      u.rate = this.settings.rate
      u.pitch = this.settings.pitch
      u.volume = 1
      // Форсируем lang, только если нашли подходящий голос — иначе
      // жёсткое 'ru-RU' на системе без русского голоса может помешать
      // браузеру подставить собственный голос по умолчанию.
      if (voice) {
        u.lang = voice.lang
        u.voice = voice
      }
      u.onstart = () => this.setState({ status: 'playing', stepIndex: i })
      u.onend = () => {
        if (i === steps.length - 1) {
          this.stopKeepAlive()
          this.setState({ status: 'idle', stepIndex: -1 })
        }
      }
      u.onerror = () => {
        this.stopKeepAlive()
        this.setState({ status: 'idle', stepIndex: -1 })
      }
      return u
    })

    // На случай, если синтезатор «завис» с прошлой страницы.
    window.speechSynthesis.cancel()
    this.setState({ status: 'playing', stepIndex: 0 })
    this.utterances.forEach((u) => window.speechSynthesis.speak(u))
    this.startKeepAlive()
  }

  pause() {
    if (!isSpeechSupported()) return
    window.speechSynthesis.pause()
    this.setState({ status: 'paused' })
  }

  resume() {
    if (!isSpeechSupported()) return
    window.speechSynthesis.resume()
    this.setState({ status: 'playing' })
  }

  stop() {
    this.playToken++
    if (!isSpeechSupported()) return
    this.stopKeepAlive()
    window.speechSynthesis.cancel()
    this.utterances = []
    this.setState({ status: 'idle', stepIndex: -1 })
  }
}

export interface PlayerState {
  status: 'idle' | 'playing' | 'paused'
  stepIndex: number
}

export const baristaPlayer = new BaristaPlayer()
