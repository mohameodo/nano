const HORROR_PATTERN =
  /horror|scary|creepy|terror|slasher|zombie|vampire|nightmare|paranormal|haunted|fright|gore|thriller|exorcist|witch|demon|slasher|psycho|триллер|ужас|恐怖|ホラー|호러|رعب|halloween/i

export function isHorrorQuery(query: string): boolean {
  const trimmed = query.trim()
  if (trimmed.length < 2) return false
  return HORROR_PATTERN.test(trimmed)
}
