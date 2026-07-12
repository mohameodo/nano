import { useState } from '@lynx-js/react'
import { loginGuest } from '../api/index.js'
import { useT } from '../i18n/index.js'
import { useNavigate } from '../navigation/index.js'

export type LoginScreenProps = {
  onBack?: () => void
  onSuccess?: (username: string) => void
}

export function LoginScreen({ onBack, onSuccess }: LoginScreenProps = {}) {
  const navigate = useNavigate()
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function continueAsGuest() {
    setBusy(true)
    setError(null)
    try {
      const user = await loginGuest('guest')
      if (onSuccess) onSuccess(user.username)
      else navigate({ name: 'home' })
    } catch {
      setError(t('loginFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <view className="Screen">
      <view className="Screen__header">
        <view
          className="Screen__chip"
          bindtap={() => {
            if (onBack) onBack()
            else navigate(-1)
          }}
        >
          <text className="Screen__chipText">{t('back')}</text>
        </view>
        <text className="Screen__title">{t('login')}</text>
      </view>
      <text className="Screen__copy">{t('authCopy')}</text>
      {error ? <text className="Screen__hint">{error}</text> : null}
      <view
        className="Screen__card"
        bindtap={() => {
          if (!busy) continueAsGuest()
        }}
      >
        <text className="Screen__cardLabel">{t('continue')}</text>
        <text className="Screen__cardValue">
          {busy ? t('pleaseWait') : t('continueGuest')}
        </text>
      </view>
    </view>
  )
}
