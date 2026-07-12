import './App.css'
import { isAuthEnabled } from './config/shiopa.js'
import { initLocale } from './i18n/index.js'
import { TabBar, useNavStack, watchParams } from './navigation/index.js'
import {
  HomeScreen,
  LoginScreen,
  SearchScreen,
  SettingsScreen,
  WatchScreen,
} from './screens/index.js'

initLocale()

export function App() {
  const { location, navigate, goBack, showTabs, tabTo } = useNavStack()
  const authOn = isAuthEnabled()

  let screen = null
  switch (location.name) {
    case 'search':
      screen = <SearchScreen initialQuery={location.query} />
      break
    case 'watch': {
      const params = watchParams(location)
      screen = (
        <WatchScreen
          key={`${params.id}-${params.type}-${params.season ?? ''}-${params.episode ?? ''}`}
          id={params.id}
          type={params.type}
          season={params.season}
          episode={params.episode}
          onBack={goBack}
        />
      )
      break
    }
    case 'settings':
      screen = (
        <SettingsScreen
          onOpenLogin={
            authOn ? () => navigate({ name: 'login' }) : undefined
          }
        />
      )
      break
    case 'login':
      if (!authOn) {
        screen = <HomeScreen />
      } else {
        screen = (
          <LoginScreen
            onBack={goBack}
            onSuccess={() => navigate({ name: 'home' })}
          />
        )
      }
      break
    case 'home':
    default:
      screen = <HomeScreen />
      break
  }

  return (
    <view className={`App${showTabs ? '' : ' App--chromeHidden'}`}>
      <view className="App__body" key={location.name}>
        {screen}
      </view>
      {showTabs ? (
        <TabBar
          active={location.name}
          onChange={(id) => navigate(tabTo(id))}
        />
      ) : null}
    </view>
  )
}
