# poprink nano

minimalist web interface for poprink

## features

- dynamic time greetings
- live search suggestions
- custom html5 video player
- range request proxy for video streaming
- 16 languages translation support

## commands

install dependencies:
```bash
pnpm install
```

configure application:
```bash
node setup.js
```

compile application:
```bash
pnpm build
```

run local development server:
```bash
pnpm dev
```

## docker

### host with docker

```bash
docker build -t nano .
docker run -p 3000:3000 -e SITE_NAME="my nano site" nano
```

### environment variables

you can customize the application at runtime using environment variables:

- `TMDB_API_KEY` - tmdb api key (optional, has built-in fallback)
- `TMDB_ACCESS_TOKEN` - tmdb access token (optional)
- `DATABASE_URL` - postgres database connection string (optional, defaults to local json database)
- `DATABASE_TYPE` - `postgres` or `json` (defaults to `json` or auto-detects from database url)
- `SITE_NAME` - name of your site (default `poprink`)
- `THEME_HUE` - default accent color hue 0-360 (default `310`)
- `THEME_MODE` - default color scheme `dark` or `light` (default `dark`)
- `METADATA_TITLE` - browser window title (default `poprink nano`)
- `METADATA_DESCRIPTION` - meta description for seo
- `DEFAULT_LOCALE` - default interface language code (default `en`)
- `SHOW_WATERMARKS` - show matrix overlay grid background `true` or `false` (default `true`)
- `SHOW_TRENDING` - show trending movies on homepage `true` or `false` (default `false`)
- `SHOW_QUICK_TAGS` - show genres tags `true` or `false` (default `false`)
- `ENABLE_AUTH` - enable simple local login page `true` or `false` (default `false`)
- `AUTOPLAY` - start video automatically on load `true` or `false` (default `true`)
- `USE_VIDSTACK` - use advanced custom player controls `true` or `false` (default `true`)
