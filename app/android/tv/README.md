# Android TV stubs

Leanback launcher + banner placeholders live under `app/src/main`.

## AVD

Create a TV device in Android Studio (Device Manager → TV → e.g. Android TV API 34). Example AVD name: `shiopa_tv_api34`.

```bash
cd poprink-nano/app
pnpm build:android-tv
```

Or:

```bash
pnpm build:android
```

Then install/run on the TV emulator. Replace `res/drawable/tv_banner.xml` with a real 320×180 banner PNG (`drawable-xhdpi/tv_banner.png`) before store submission.
