import errorSoundUrl from "../assets/sounds/error.wav"
import newCodeSoundUrl from "../assets/sounds/new-notification.mp3"
import successSoundUrl from "../assets/sounds/verify.wav"

const players = new Map()

function playerFor(url) {
  if (!players.has(url)) {
    const audio = new Audio(url)
    audio.preload = "auto"
    players.set(url, audio)
  }
  return players.get(url)
}

function playSound(url) {
  const audio = playerFor(url)
  audio.currentTime = 0
  audio.play().catch(() => {})
}

export function playErrorSound() {
  playSound(errorSoundUrl)
}

export function playSuccessSound() {
  playSound(successSoundUrl)
}

export function playNewCodeSound() {
  playSound(newCodeSoundUrl)
}
