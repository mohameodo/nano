# Configure Shiopa

You can set up Shiopa two ways. Use the settings panel if you just want to try things. Use `.env` when you deploy your own copy.

## Settings panel (no code)

1. Open the home page.
2. Click the gear icon next to the theme pill.
3. Flip a switch or pick from a dropdown.
4. Close the panel. Your picks stay saved in this browser.

### What each setting does

| Setting | What it does |
| --- | --- |
| Trending | Shows a popular row on home |
| Quick tags | Genre buttons under search |
| Watermarks | Small footer labels |
| Greeting | Animated hello or pet on home |
| Login | Shows sign in in the header |
| Local library | Lets you play your own files |
| Autoplay | Starts video on the watch page |
| Ghost hat / fly / voice | Fun pet extras on home |
| Theme / color / language | Header controls on or off |
| Default source | Which stream source loads first |
| Home style | Pet, logo, slogans, icon, or gif |
| Background | Home background look |
| Palette | Full color or monochrome |
| Logo size | How big the home logo or pet is |

## `.env` file (for your server)

Copy `.env.example` to `.env`.

Common values:

```env
SITE_NAME=shiopa
METADATA_TITLE=shiopa
DEFAULT_SERVER=shiopa
THEME_MODE=dark
THEME_HUE=200
AUTOPLAY=true
SHOW_TRENDING=false
SHOW_QUICK_TAGS=false
```

Add TMDB keys when you want search and details:

```env
TMDB_API_KEY=your_key
TMDB_ACCESS_TOKEN=your_token
```

Restart the dev server after you change `.env`.

## CLI setup

```bash
npm i -g shiopa
shiopa clone
cd shiopa
shiopa config
pnpm dev
```

`shiopa config` walks you through the main options and writes `.env` for you.

## Add more stream sources

```bash
shiopa list
shiopa add rei
```

Sources install as encrypted modules. The built-in **Shiopa** source is already included.
