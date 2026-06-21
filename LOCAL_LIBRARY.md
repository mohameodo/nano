# Local Library Configuration

To host your own movies and tv shows, enable the local library features in your configuration.

## 1. Enable Configuration
Set these environment variables or update `config.poprink.ts`:
```env
ENABLE_LOCAL_LIBRARY=true
ENABLE_LOCAL_LIBRARY_EDITING=true
```

## 2. Add Content
Once enabled:
1. Open the homepage.
2. Click **Manage** in the **Local Library** section.
3. Choose **Add New Item**.
4. Enter TMDB ID, title, and choose whether to specify a file path/URL or upload a video file.
5. Save the item. It will appear on your homepage and can be played instantly.

For TV Shows, you can map multiple seasons and episodes. You can also upload subtitle tracks (`.srt` or `.vtt`).
