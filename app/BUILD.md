# shiopa Lynx build

ReactLynx app bootstrapped with `create-rspeedy` (official Lynx / Rspeedy template). Native packaging follows Lynx's integrate-with-existing-apps / Sparkling app-framework flow.

## Install

```bash
cd poprink-nano/app
pnpm install
```

`.npmrc` sets `ignore-workspace=true` so deps land in this app's `node_modules`. Node `^20.19 || >=22.12` required.

## Android emulator preview (no web)

Uses the Android emulator + [Lynx Explorer](https://lynxjs.org/guide/start/quick-start.html) APK.

| AVD | Image |
| --- | --- |
| `shiopa_api34` | API 34 google_apis x86_64 (phone, default) |
| `shiopa_tv_api34` | API 34 android-tv x86 |

```bash
cd poprink-nano/app
pnpm emulator
pnpm preview:android
```

TV:

```powershell
$env:SHIOPA_AVD = "shiopa_tv_api34"
pnpm emulator
pnpm preview:android
```

`pnpm preview:android` starts the AVD if needed, installs Lynx Explorer (`LynxExplorer-noasan-release.apk` from Lynx 3.9.0), then runs `rspeedy dev`.

In Lynx Explorer on the emulator: paste the card URL from the terminal into **Enter Card URL** and tap **Go**. Hot reload works over that URL — do not use `pnpm preview` (web).

```bash
pnpm build:android
pnpm emulator
pnpm dev:android
```

Manual:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
& "$env:ANDROID_HOME\emulator\emulator.exe" -avd shiopa_api34
adb install -r "$env:ANDROID_HOME\shiopa\LynxExplorer-noasan-release.apk"
```

## Android TV

Manifest includes leanback (`LEANBACK_LAUNCHER`), `android.software.leanback` (not required), touchscreen optional, and `android:banner` stubs under `android/app/src/main/res/drawable/`.

```bash
pnpm build:android-tv
```

Same as `build:android` plus a TV AVD note. Create a TV emulator (Device Manager → TV → API 34), e.g. AVD name `shiopa_tv_api34`. Replace the shape drawable with a real **320×180** banner before store upload. See `android/tv/README.md`.

D-pad: tabs, media cards, and player retry controls use large focus borders (`:focus` / `focusable`).

## Dev (Lynx Explorer)

```bash
pnpm dev
```

Scan the QR code with [Lynx Explorer](https://lynxjs.org/guide/start/quick-start.html), or paste the card URL on the emulator as above.

```bash
pnpm dev:ios
pnpm dev:android
```

## Production Lynx bundle

```bash
pnpm build
```

Output: `dist/shiopa.lynx.bundle`

## iOS / Android bundle copy

```bash
pnpm build:ios
pnpm build:android
pnpm build:android-tv
```

Builds the Lynx bundle and copies it into:

- `android/app/src/main/assets/shiopa.lynx.bundle` (and `main.lynx.bundle`)
- `ios/shiopa/Resources/Assets/shiopa.lynx.bundle` (and `main.lynx.bundle`)

Also syncs `assets/shiopa.png` into native icon slots and `resource/app_icon.png`.

`build:android-tv` is the Android build with TV packaging notes (leanback stubs already in the manifest).
## Run native hosts

```bash
pnpm run:ios
pnpm run:android
```

These build + copy, then use Sparkling CLI when a full host exists; otherwise print Lynx Explorer instructions.

Wire a LynxView host with [Integrate with Existing Apps](https://lynxjs.org/guide/start/integrate-with-existing-apps.html), or scaffold shells via [Sparkling](https://lynxjs.org/guide/start/build-with-app-framework.html) (`pnpm create sparkling-app@latest`).

## Config

| File | Role |
| --- | --- |
| `lynx.config.ts` | Rspeedy / ReactLynx build |
| `app.config.ts` | Sparkling `AppConfig` (`appName: shiopa`) |
| `app.manifest.json` | App identity / icon / platform ids (`name: shiopa`) |
| `assets/shiopa.png` | App icon source |

## Preview

Web preview (`pnpm preview`) is not the Android path. Prefer `pnpm preview:android` above.
