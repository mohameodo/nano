import { useState } from '@lynx-js/react'
import { isAuthEnabled, shiopaConfig } from '../config/shiopa.js'
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  getLocale,
  setLocale,
  useT,
} from '../i18n/index.js'
import { useNavigate } from '../navigation/index.js'
import { accentFromHue, resolveColors, type ThemeMode } from '../theme/tokens.js'

export type SettingsScreenProps = {
  onOpenLogin?: () => void
}

export function SettingsScreen({ onOpenLogin }: SettingsScreenProps = {}) {
  const navigate = useNavigate()
  const t = useT()
  const authOn = isAuthEnabled()
  const [mode, setMode] = useState<ThemeMode>(shiopaConfig.defaultMode)
  const [hue, setHue] = useState(shiopaConfig.defaultHue)
  const [locale, setLocaleState] = useState(getLocale())
  const colors = resolveColors(mode)
  const accent = accentFromHue(hue, mode)

  return (
    <scroll-view className="Screen Screen--scroll" scroll-orientation="vertical">
      <text className="Screen__brand">{shiopaConfig.siteName}</text>
      <text className="Screen__title">{t('settings')}</text>
      <text className="Screen__copy">{t('settingsCopy')}</text>

      <view className="Screen__card">
        <text className="Screen__cardLabel">{t('language')}</text>
        <view className="SettingsRow">
          {SUPPORTED_LOCALES.map((code) => (
            <view
              key={code}
              className={`WatchChip${locale === code ? ' WatchChip--active' : ''}`}
              bindtap={() => {
                setLocale(code)
                setLocaleState(code)
              }}
            >
              <text className="WatchChip__text">
                {LOCALE_LABELS[code] || code}
              </text>
            </view>
          ))}
        </view>
      </view>

      <view className="Screen__card">
        <text className="Screen__cardLabel">{t('mode')}</text>
        <view className="SettingsRow">
          {(['dark', 'light'] as ThemeMode[]).map((m) => (
            <view
              key={m}
              className={`WatchChip${mode === m ? ' WatchChip--active' : ''}`}
              bindtap={() => setMode(m)}
            >
              <text className="WatchChip__text">
                {m === 'dark' ? t('setOptDark') : t('setOptLight')}
              </text>
            </view>
          ))}
        </view>
      </view>

      <view className="Screen__card">
        <text className="Screen__cardLabel">{t('hue')}</text>
        <text className="Screen__cardValue" style={{ color: accent }}>
          {String(hue)}
        </text>
        <view className="SettingsRow">
          {[0, 40, 120, 200, 280].map((value) => (
            <view
              key={value}
              className={`WatchChip${hue === value ? ' WatchChip--active' : ''}`}
              bindtap={() => setHue(value)}
            >
              <text className="WatchChip__text">{value}</text>
            </view>
          ))}
        </view>
      </view>

      <view className="Screen__card">
        <text className="Screen__cardLabel">{t('background')}</text>
        <text className="Screen__cardValue">{colors.bg}</text>
      </view>

      <view className="Screen__card">
        <text className="Screen__cardLabel">{t('defaultServer')}</text>
        <text className="Screen__cardValue">{shiopaConfig.defaultServer}</text>
      </view>

      {authOn ? (
        <view
          className="Screen__card"
          bindtap={() => {
            if (onOpenLogin) onOpenLogin()
            else navigate({ name: 'login' })
          }}
        >
          <text className="Screen__cardLabel">{t('account')}</text>
          <text className="Screen__cardValue">{t('login')}</text>
        </view>
      ) : null}
    </scroll-view>
  )
}
