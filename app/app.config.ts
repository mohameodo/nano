import { defineConfig } from '@lynx-js/rspeedy'
import { pluginQRCode } from '@lynx-js/qrcode-rsbuild-plugin'
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin'
import { pluginTypeCheck } from '@rsbuild/plugin-type-check'

const lynxConfig = defineConfig({
  source: {
    entry: {
      shiopa: './src/index.tsx',
    },
  },
  output: {
    assetPrefix: 'asset:///',
    filename: {
      bundle: '[name].lynx.bundle',
    },
  },
  plugins: [
    pluginQRCode({
      schema(url: string): string {
        return `${url}?fullscreen=true`
      },
    }),
    pluginReactLynx(),
    pluginTypeCheck(),
  ],
})

const config = {
  lynxConfig,
  appName: 'shiopa',
  platform: {
    android: {
      packageName: 'ink.popr.shiopa',
    },
    ios: {
      bundleIdentifier: 'ink.popr.shiopa',
    },
  },
  paths: {
    androidAssets: 'android/app/src/main/assets',
    iosAssets: 'ios/shiopa/Resources/Assets',
  },
  appIcon: './resource/app_icon.png',
  router: {
    shiopa: {
      path: './lynxPages/shiopa',
    },
  },
  plugin: [
    [
      'splash-screen',
      {
        backgroundColor: '#000000',
        image: './resource/app_icon.png',
        dark: {
          image: './resource/app_icon.png',
          backgroundColor: '#000000',
        },
        imageWidth: 200,
      },
    ],
  ],
}

export default config
