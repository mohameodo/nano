import { useState, useEffect, useLayoutEffect } from "react"
import { getBrowserItems, saveBrowserItems, saveBrowserFile, deleteBrowserFile, getStoredHandle, storeHandle, clearStoredHandle, verifyPermission, loadRinkJson } from "../../lib/nano/local-library"
import type { LocalMediaItem, LocalSubtitle } from "../../lib/nano/local-library"
import Header from "./home/Header"
import { NanoDeferredShader } from "./background/NanoDeferredShader"
import { isShaderBgStyle } from "./background/shader-types"
import { poprinkConfig } from "./config.poprink"
import { TRANSLATIONS } from "./locales/translations"
import { FaFolder, FaFolderOpen, FaArrowLeft } from "react-icons/fa"
import "./nano.css"

const getBaseDirectory = (pathStr: string) => {
  if (!pathStr) return ""
  const normalized = pathStr.replace(/\\/g, "/")
  const lastSlash = normalized.lastIndexOf("/")
  if (lastSlash !== -1) {
    return pathStr.slice(0, lastSlash + 1)
  }
  return ""
}

export default function NanoAdmin({ initialUser }: { initialUser?: string }) {
  const [locale, setLocale] = useState(poprinkConfig.metadata.defaultLocale || "en")
  const [currentUser, setCurrentUser] = useState(initialUser)

  const [themeHue, setThemeHue] = useState(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("poprink-theme-hue")
      if (val) {
        const parsed = parseInt(val, 10)
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 360) {
          return parsed
        }
      }
      const domHue = document.documentElement.style.getPropertyValue("--theme-hue").trim()
      if (domHue) {
        const parsed = parseInt(domHue, 10)
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 360) {
          return parsed
        }
      }
    }
    return poprinkConfig.theme.defaultHue
  })

  const [themeMode, setThemeMode] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("poprink-theme")
      if (val === "dark" || val === "light") {
        return val
      }
      const domTheme = document.documentElement.getAttribute("data-theme")
      if (domTheme === "dark" || domTheme === "light") {
        return domTheme
      }
    }
    return poprinkConfig.theme.defaultMode
  })

  useEffect(() => {
    localStorage.setItem("poprink-theme-hue", themeHue.toString())
    document.documentElement.style.setProperty("--theme-hue", themeHue.toString())
  }, [themeHue])

  useLayoutEffect(() => {
    localStorage.setItem("poprink-theme", themeMode)
    document.documentElement.setAttribute("data-theme", themeMode)
  }, [themeMode])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"
  }, [locale])

  useEffect(() => {
    document.documentElement.style.setProperty("--bg-color-config-dark", poprinkConfig.theme.colors.bgDark)
    document.documentElement.style.setProperty("--bg-color-config-light", poprinkConfig.theme.colors.bgLight)
    document.documentElement.setAttribute("data-palette", poprinkConfig.theme.palette)
    if (poprinkConfig.theme.fontFamily) {
      document.documentElement.style.setProperty("--site-font", poprinkConfig.theme.fontFamily)
    }
  }, [])

  const t = TRANSLATIONS[locale] || TRANSLATIONS.en
  const isMonochrome = poprinkConfig.theme.palette === "monochrome"

  const [items, setItems] = useState<LocalMediaItem[]>([])
  const [editingItem, setEditingItem] = useState<LocalMediaItem | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const [tmdbId, setTmdbId] = useState("")
  const [title, setTitle] = useState("")
  const [poster, setPoster] = useState("")
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie")

  const [movieFileOption, setMovieFileOption] = useState<"path" | "file">("path")
  const [movieFilePath, setMovieFilePath] = useState("")
  const [movieFile, setMovieFile] = useState<File | null>(null)

  const [episodes, setEpisodes] = useState<Array<{ season: number; episode: number; option: "path" | "file"; path: string; file: File | null }>>([])
  const [newEpSeason, setNewEpSeason] = useState(1)
  const [newEpNumber, setNewEpNumber] = useState(1)
  const [newEpOption, setNewEpOption] = useState<"path" | "file">("path")
  const [newEpPath, setNewEpPath] = useState("")
  const [newEpFile, setNewEpFile] = useState<File | null>(null)

  const [subs, setSubs] = useState<Array<{ label: string; language: string; option: "path" | "file"; path: string; file: File | null }>>([])
  const [newSubLabel, setNewSubLabel] = useState("")
  const [newSubLang, setNewSubLang] = useState("en")
  const [newSubOption, setNewSubOption] = useState<"path" | "file">("path")
  const [newSubPath, setNewSubPath] = useState("")
  const [newSubFile, setNewSubFile] = useState<File | null>(null)

  const [error, setError] = useState("")
  const [localFolderHandle, setLocalFolderHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [localFolderConnected, setLocalFolderConnected] = useState(false)

  const [localServerPath, setLocalServerPath] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("poprink-local-server-path") || ""
    }
    return ""
  })
  const [serverStatus, setServerStatus] = useState("")

  const [saveLocationType, setSaveLocationType] = useState<"browser" | "directory" | "server">(() => {
    if (typeof window !== "undefined") {
      const serverPath = localStorage.getItem("poprink-local-server-path")
      if (serverPath) return "server"
      const handle = localStorage.getItem("dir-handle")
      if (handle) return "directory"
    }
    return "browser"
  })

  useEffect(() => {
    const savedLocale = document.cookie
      .split("; ")
      .find((row) => row.startsWith("poprink-locale="))
      ?.split("=")[1] || localStorage.getItem("poprink-locale")
    if (savedLocale && TRANSLATIONS[savedLocale]) {
      setLocale(savedLocale)
    } else {
      const browserLang = navigator.language.split("-")[0]
      if (TRANSLATIONS[browserLang]) {
        setLocale(browserLang)
      }
    }
  }, [])

  useEffect(() => {
    document.cookie = `poprink-locale=${locale}; path=/; max-age=31536000; SameSite=Lax`
    localStorage.setItem("poprink-locale", locale)
  }, [locale])

  useEffect(() => {
    loadItems()
    initLocalFolder()
  }, [localFolderConnected])

  const initLocalFolder = async () => {
    const handle = await getStoredHandle()
    if (handle) {
      setLocalFolderHandle(handle)
      try {
        const hasPerm = await verifyPermission(handle)
        if (hasPerm) {
          setLocalFolderConnected(true)
        }
      } catch (e) {}
    }
  }

  const loadItems = async () => {
    if (localServerPath.trim()) {
      try {
        const res = await fetch(`/api/library?path=${encodeURIComponent(localServerPath.trim())}`)
        if (res.ok) {
          const list = await res.json()
          setItems(list)
          await saveBrowserItems(list)
          return
        }
      } catch (e) {}
    } else if (localFolderConnected && localFolderHandle) {
      try {
        const list = await loadRinkJson(localFolderHandle)
        setItems(list)
        await saveBrowserItems(list)
        return
      } catch (e) {}
    }
    const list = await getBrowserItems()
    setItems(list)
  }

  const handleConnectLocalFolder = async () => {
    if (typeof window === "undefined" || typeof (window as any).showDirectoryPicker !== "function") {
      alert("Local Folder Access is not supported on this browser.")
      return
    }
    try {
      const handle = await (window as any).showDirectoryPicker()
      await storeHandle(handle)
      setLocalFolderHandle(handle)
      setLocalFolderConnected(true)
    } catch (e) {}
  }

  const handleDisconnectLocalFolder = async () => {
    await clearStoredHandle()
    setLocalFolderHandle(null)
    setLocalFolderConnected(false)
  }

  const handleStartAdd = () => {
    setEditingItem(null)
    setTmdbId("")
    setTitle("")
    setPoster("")
    setMediaType("movie")
    setMovieFileOption("path")
    setMovieFilePath("")
    setMovieFile(null)
    setEpisodes([])
    setSubs([])
    setError("")
    setIsAdding(true)
  }

  const handleStartEdit = (item: LocalMediaItem) => {
    setEditingItem(item)
    setTmdbId(item.id)
    setTitle(item.title)
    setPoster(item.poster || "")
    setMediaType(item.type)

    if (item.type === "movie") {
      const isPath = !item.file?.startsWith("browser_file_")
      setMovieFileOption(isPath ? "path" : "file")
      setMovieFilePath(isPath ? item.file || "" : "")
      setMovieFile(null)
    } else {
      const list: typeof episodes = []
      if (item.seasons) {
        for (const [sNum, eps] of Object.entries(item.seasons)) {
          for (const [eNum, filePath] of Object.entries(eps)) {
            const isPath = !filePath.startsWith("browser_file_")
            list.push({
              season: Number(sNum),
              episode: Number(eNum),
              option: isPath ? "path" : "file",
              path: isPath ? filePath : "",
              file: null,
            })
          }
        }
      }
      setEpisodes(list)
    }

    const subList: typeof subs = []
    if (Array.isArray(item.subtitles)) {
      for (const sub of item.subtitles) {
        const isPath = !sub.file.startsWith("browser_file_")
        subList.push({
          label: sub.label,
          language: sub.language,
          option: isPath ? "path" : "file",
          path: isPath ? sub.file : "",
          file: null,
        })
      }
    }
    setSubs(subList)
    setError("")
    setIsAdding(true)
  }

  const saveAllItems = async (newList: LocalMediaItem[]) => {
    await saveBrowserItems(newList)
    setItems(newList)

    if (localServerPath.trim()) {
      try {
        const res = await fetch("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: localServerPath.trim(), items: newList }),
        })
        if (res.ok) {
          setServerStatus(t.saveSuccess || "Successfully saved to server")
          setTimeout(() => setServerStatus(""), 3000)
        } else {
          setServerStatus(t.saveError || "Failed to save to server")
          setTimeout(() => setServerStatus(""), 3000)
        }
      } catch (err: any) {
        setServerStatus((t.saveError || "Failed to save to server") + ": " + err.message)
        setTimeout(() => setServerStatus(""), 4000)
      }
    }

    if (localFolderConnected && localFolderHandle) {
      try {
        const hasPerm = await verifyPermission(localFolderHandle, true)
        if (hasPerm) {
          const fileHandle = await localFolderHandle.getFileHandle("rink.json", { create: true })
          const writable = await fileHandle.createWritable()
          await writable.write(JSON.stringify(newList, null, 2))
          await writable.close()
        }
      } catch (e) {}
    }
  }

  const handleDelete = async (itemId: string) => {
    const confirm = window.confirm(t.confirmDelete || "Are you sure you want to delete this item?")
    if (!confirm) return

    const target = items.find((item) => item.id === itemId)
    if (target) {
      if (target.type === "movie" && target.file?.startsWith("browser_file_")) {
        await deleteBrowserFile(target.file)
      } else if (target.seasons) {
        for (const eps of Object.values(target.seasons)) {
          for (const filePath of Object.values(eps)) {
            if (filePath.startsWith("browser_file_")) {
              await deleteBrowserFile(filePath)
            }
          }
        }
      }
      if (Array.isArray(target.subtitles)) {
        for (const sub of target.subtitles) {
          if (sub.file.startsWith("browser_file_")) {
            await deleteBrowserFile(sub.file)
          }
        }
      }
    }

    const filtered = items.filter((item) => item.id !== itemId)
    await saveAllItems(filtered)
  }

  const handleAddEpisode = () => {
    if (episodes.some((e) => e.season === newEpSeason && e.episode === newEpNumber)) {
      setError(`Episode ${newEpNumber} of Season ${newEpSeason} is already added.`)
      return
    }
    if (newEpOption === "path" && !newEpPath.trim()) {
      setError("Please enter path.")
      return
    }
    if (newEpOption === "file" && !newEpFile) {
      setError("Please select file.")
      return
    }
    setEpisodes([...episodes, {
      season: newEpSeason,
      episode: newEpNumber,
      option: newEpOption,
      path: newEpPath.trim(),
      file: newEpFile,
    }])
    setNewEpNumber(newEpNumber + 1)
    setNewEpPath("")
    setNewEpFile(null)
    setError("")
  }

  const handleRemoveEpisode = (s: number, e: number) => {
    setEpisodes(episodes.filter((ep) => !(ep.season === s && ep.episode === e)))
  }

  const handleAddSub = () => {
    if (!newSubLabel.trim()) {
      setError("Please enter label.")
      return
    }
    if (newSubOption === "path" && !newSubPath.trim()) {
      setError("Please enter path.")
      return
    }
    if (newSubOption === "file" && !newSubFile) {
      setError("Please select file.")
      return
    }
    setSubs([...subs, {
      label: newSubLabel.trim(),
      language: newSubLang,
      option: newSubOption,
      path: newSubPath.trim(),
      file: newSubFile,
    }])
    setNewSubLabel("")
    setNewSubPath("")
    setNewSubFile(null)
    setError("")
  }

  const handleRemoveSub = (index: number) => {
    setSubs(subs.filter((_, idx) => idx !== index))
  }

  const fetchTmdbInfo = async () => {
    if (!tmdbId.trim()) return
    setError("")
    try {
      const res = await fetch(`/api/details?id=${tmdbId}&type=${mediaType}`)
      if (!res.ok) {
        setError("Failed to fetch TMDB details.")
        return
      }
      const data = await res.json()
      if (data.title || data.name) {
        setTitle(data.title || data.name || "")
        setPoster(data.poster_path || "")
      }
    } catch {
      setError("Failed to reach TMDB API.")
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const cleanId = tmdbId.trim()
    if (!cleanId) {
      setError("TMDB ID is required.")
      return
    }
    if (!title.trim()) {
      setError("Title is required.")
      return
    }

    let finalEpisodes = [...episodes]
    if (mediaType === "tv") {
      const epPathFilled = newEpOption === "path" && newEpPath.trim() !== ""
      const epFileFilled = newEpOption === "file" && newEpFile !== null
      if (epPathFilled || epFileFilled) {
        if (!finalEpisodes.some((ep) => ep.season === newEpSeason && ep.episode === newEpNumber)) {
          finalEpisodes.push({
            season: newEpSeason,
            episode: newEpNumber,
            option: newEpOption,
            path: newEpPath.trim(),
            file: newEpFile,
          })
        }
      }
    }

    let finalSubsList = [...subs]
    const subLabelFilled = newSubLabel.trim() !== ""
    const subPathFilled = newSubOption === "path" && newSubPath.trim() !== ""
    const subFileFilled = newSubOption === "file" && newSubFile !== null
    if (subLabelFilled && (subPathFilled || subFileFilled)) {
      finalSubsList.push({
        label: newSubLabel.trim(),
        language: newSubLang,
        option: newSubOption,
        path: newSubPath.trim(),
        file: newSubFile,
      })
    }

    if (mediaType === "movie") {
      if (movieFileOption === "path" && !movieFilePath.trim()) {
        setError("Movie file path is required.")
        return
      }
      if (movieFileOption === "file" && !movieFile && (!editingItem || editingItem.type !== "movie" || !editingItem.file?.startsWith("browser_file_"))) {
        setError("Movie file upload is required.")
        return
      }
    } else {
      if (finalEpisodes.length === 0) {
        setError("At least one episode is required.")
        return
      }
    }

    try {
      let finalMovieFile = ""
      if (mediaType === "movie") {
        if (movieFileOption === "path") {
          finalMovieFile = movieFilePath.trim()
        } else {
          const key = `browser_file_${cleanId}_movie`
          if (movieFile) {
            await saveBrowserFile(key, movieFile)
          }
          finalMovieFile = key
        }
      }

      const seasonsMap: Record<string, Record<string, string>> = {}
      if (mediaType === "tv") {
        for (const ep of finalEpisodes) {
          const sStr = String(ep.season)
          const eStr = String(ep.episode)
          if (!seasonsMap[sStr]) seasonsMap[sStr] = {}

          if (ep.option === "path") {
            seasonsMap[sStr][eStr] = ep.path
          } else {
            const key = `browser_file_${cleanId}_s${sStr}_e${eStr}`
            if (ep.file) {
              await saveBrowserFile(key, ep.file)
            }
            seasonsMap[sStr][eStr] = key
          }
        }
      }

      const finalSubs: LocalSubtitle[] = []
      for (let i = 0; i < finalSubsList.length; i++) {
        const sub = finalSubsList[i]
        if (sub.option === "path") {
          finalSubs.push({
            file: sub.path,
            label: sub.label,
            language: sub.language,
          })
        } else {
          const key = `browser_file_${cleanId}_sub_${i}`
          if (sub.file) {
            await saveBrowserFile(key, sub.file)
          }
          finalSubs.push({
            file: key,
            label: sub.label,
            language: sub.language,
          })
        }
      }

      const newItem: LocalMediaItem = {
        id: cleanId,
        type: mediaType,
        title: title.trim(),
        poster: poster.trim() || undefined,
        file: mediaType === "movie" ? finalMovieFile : undefined,
        seasons: mediaType === "tv" ? seasonsMap : undefined,
        subtitles: finalSubs.length > 0 ? finalSubs : undefined,
      }

      const updatedList = items.filter((item) => item.id !== cleanId)
      updatedList.push(newItem)

      await saveAllItems(updatedList)
      setIsAdding(false)
    } catch (err: any) {
      setError(err.message || "Failed to save")
    }
  }

  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      body: JSON.stringify({ action: "logout" }),
    })
    setCurrentUser(undefined)
  }

  const handleDownloadRinkJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2))
    const downloadAnchor = document.createElement("a")
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", "rink.json")
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const shaderBg = isShaderBgStyle(poprinkConfig.theme.bgStyle)

  const bgStyleClass = !shaderBg && poprinkConfig.theme.bgStyle && poprinkConfig.theme.bgStyle !== "none"
    ? `bg-style-${poprinkConfig.theme.bgStyle}`
    : ""

  const isPickerSupported = typeof window !== "undefined" && typeof (window as any).showDirectoryPicker === "function"

  return (
    <div className={`nano-wrapper ${shaderBg ? "nano-wrapper-shader" : ""} ${bgStyleClass}`}>
      {shaderBg && (
        <NanoDeferredShader
          key={`${themeMode}-${themeHue}-${isMonochrome ? "m" : "c"}`}
          variant={poprinkConfig.theme.bgStyle}
          themeMode={themeMode}
          themeHue={themeHue}
          monochrome={isMonochrome}
        />
      )}
      <Header
        initialUser={currentUser}
        handleLogout={handleLogout}
        themeHue={themeHue}
        setThemeHue={setThemeHue}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        locale={locale}
        setLocale={setLocale}
        t={t}
        translations={TRANSLATIONS}
        logoConfig={poprinkConfig.logo}
      />

      <div className="nano-container-results" style={{ padding: "40px 20px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
          <button 
            onClick={() => window.location.href = "/"}
            className="nano-btn-full"
            style={{ display: "flex", alignItems: "center", gap: "8px", height: "40px", padding: "0 16px" }}
          >
            <FaArrowLeft />
            <span>{t.backToLogin || "back"}</span>
          </button>
          <h2 style={{ fontSize: "2rem", margin: 0, fontWeight: 800 }}>{t.adminTitle || "Local Library Admin"}</h2>
        </div>

        {error && <div className="nano-dialog-error" style={{ marginBottom: "20px", padding: "12px", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "8px" }}>{error}</div>}

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", padding: "16px", backgroundColor: "var(--btn-bg)", borderRadius: "16px", marginBottom: "30px", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Storage:</span>
            <select
              value={saveLocationType}
              onChange={(e) => setSaveLocationType(e.target.value as any)}
              className="nano-dialog-input"
              style={{ width: "160px", height: "36px", padding: "0 8px", borderRadius: "8px", fontSize: "0.85rem", margin: 0 }}
            >
              <option value="browser">Browser</option>
              {isPickerSupported && <option value="directory">Local Folder</option>}
              <option value="server">PC Server Path</option>
            </select>
          </div>

          {saveLocationType === "server" && (
            <div style={{ display: "flex", flex: 1, gap: "8px", minWidth: "260px" }}>
              <input
                type="text"
                className="nano-dialog-input"
                value={localServerPath}
                onChange={(e) => setLocalServerPath(e.target.value)}
                placeholder="C:/Movies/rink.json"
                style={{ flex: 1, borderRadius: "8px", height: "36px", padding: "0 10px", fontSize: "0.85rem", margin: 0 }}
              />
              <button
                onClick={() => {
                  localStorage.setItem("poprink-local-server-path", localServerPath)
                  loadItems()
                  setServerStatus(t.loadSuccess || "Successfully loaded")
                  setTimeout(() => setServerStatus(""), 3000)
                }}
                className="nano-btn-full"
                style={{ height: "36px", padding: "0 12px", fontSize: "0.85rem", backgroundColor: "var(--accent-color)", color: "#000" }}
              >
                {t.savePathBtn || "Save Path"}
              </button>
            </div>
          )}

          {saveLocationType === "directory" && isPickerSupported && (
            <button
              onClick={localFolderConnected ? handleDisconnectLocalFolder : handleConnectLocalFolder}
              className="nano-btn-full"
              style={{ display: "flex", alignItems: "center", gap: "8px", height: "36px", padding: "0 16px", fontSize: "0.85rem", backgroundColor: localFolderConnected ? "rgba(255,255,255,0.1)" : "var(--accent-color)", color: localFolderConnected ? "#fff" : "#000" }}
            >
              {localFolderConnected ? <FaFolderOpen /> : <FaFolder />}
              <span>{localFolderConnected ? t.disconnect || "Disconnect" : t.connect || "Connect"}</span>
            </button>
          )}

          {saveLocationType === "browser" && (
            <button
              onClick={handleDownloadRinkJson}
              className="nano-btn-full"
              style={{ height: "36px", padding: "0 16px", fontSize: "0.85rem" }}
            >
              <span>{t.downloadRink || "Download rink.json"}</span>
            </button>
          )}

          {serverStatus && <span style={{ fontSize: "0.85rem", color: "var(--accent-color)" }}>{serverStatus}</span>}
        </div>

        {!isAdding ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "1.3rem" }}>{t.mediaItems || "Media Items"}</h3>
              <button onClick={handleStartAdd} className="nano-btn-full" style={{ height: "40px", padding: "0 20px", backgroundColor: "var(--accent-color)", color: "#000" }}>
                {t.addNewItem || "Add New Item"}
              </button>
            </div>

            {items.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 40px", textAlign: "center", backgroundColor: "var(--btn-bg)", borderRadius: "24px", border: "1px dashed var(--border-color)" }}>
                <FaFolderOpen style={{ fontSize: "3.5rem", opacity: 0.25, marginBottom: "16px", color: "var(--text-color)" }} />
                <h4 style={{ margin: "0 0 8px 0", fontSize: "1.2rem", fontWeight: 600 }}>{t.noItemsTitle || "Library is empty"}</h4>
                <p style={{ margin: "0 0 20px 0", fontSize: "0.9rem", opacity: 0.6, maxWidth: "400px" }}>{t.noItems || "No local items added yet. Click \"Add New Item\" to configure a movie or series."}</p>
                <button onClick={handleStartAdd} className="nano-btn-full" style={{ height: "40px", padding: "0 20px", backgroundColor: "var(--accent-color)", color: "#000" }}>
                  {t.addNewItem || "Add New Item"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      padding: "16px 20px", 
                      backgroundColor: "var(--btn-bg)", 
                      borderRadius: "16px",
                      border: "1px solid var(--border-color)"
                    }}
                  >
                    <div>
                      <h4 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>{item.title}</h4>
                      <div style={{ fontSize: "0.85rem", opacity: 0.5 }}>
                        {t.mediaType || "Media Type"}: {item.type === "movie" ? (t.movie || "Movie") : (t.tv || "TV Show")} • TMDB ID: {item.id}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        onClick={() => handleStartEdit(item)}
                        className="nano-btn-full"
                        style={{ height: "36px", padding: "0 16px" }}
                      >
                        {t.edit || "Edit"}
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="nano-btn-full"
                        style={{ height: "36px", padding: "0 16px", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}
                      >
                        {t.delete || "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px", backgroundColor: "var(--btn-bg)", padding: "30px", borderRadius: "24px", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{editingItem ? (t.editItem || "Edit Item") : (t.addItem || "Add Item")}</h3>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)} 
                style={{ background: "none", border: "none", color: "var(--text-color)", fontSize: "1.5rem", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            <div className="nano-dialog-input-group">
              <label className="nano-dialog-label">{t.mediaType || "Media Type"}</label>
              <select 
                className="nano-dialog-input" 
                value={mediaType} 
                onChange={(e) => setMediaType(e.target.value as any)}
                disabled={!!editingItem}
                style={{ borderRadius: "12px" }}
              >
                <option value="movie">{t.movie || "Movie"}</option>
                <option value="tv">{t.tv || "TV Show"}</option>
              </select>
            </div>

            <div className="nano-dialog-input-group">
              <label className="nano-dialog-label">TMDB ID</label>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  className="nano-dialog-input"
                  value={tmdbId}
                  onChange={(e) => setTmdbId(e.target.value)}
                  disabled={!!editingItem}
                  placeholder="e.g. 27205"
                  required
                  style={{ flex: 1, borderRadius: "12px" }}
                />
                {!editingItem && (
                  <button
                    type="button"
                    onClick={fetchTmdbInfo}
                    className="nano-btn-full"
                    style={{ height: "48px", padding: "0 16px" }}
                  >
                    {t.fetchInfo || "Fetch Info"}
                  </button>
                )}
              </div>
            </div>

            <div className="nano-dialog-input-group">
              <label className="nano-dialog-label">{t.title || "Title"}</label>
              <input
                type="text"
                className="nano-dialog-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                required
                style={{ borderRadius: "12px" }}
              />
            </div>

            <div className="nano-dialog-input-group">
              <label className="nano-dialog-label">{t.posterUrl || "Poster URL (Optional)"}</label>
              <input
                type="text"
                className="nano-dialog-input"
                value={poster}
                onChange={(e) => setPoster(e.target.value)}
                placeholder="/path.jpg"
                style={{ borderRadius: "12px" }}
              />
            </div>

            {mediaType === "movie" ? (
              <div className="nano-dialog-input-group">
                <label className="nano-dialog-label">{t.videoSource || "Video Source"}</label>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setMovieFileOption("path")}
                    className="nano-btn-full"
                    style={{ flex: 1, height: "40px", backgroundColor: movieFileOption === "path" ? "var(--accent-color)" : "var(--btn-bg)", color: movieFileOption === "path" ? "#000" : "#fff" }}
                  >
                    {t.pathUrl || "Path / URL"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovieFileOption("file")}
                    className="nano-btn-full"
                    style={{ flex: 1, height: "40px", backgroundColor: movieFileOption === "file" ? "var(--accent-color)" : "var(--btn-bg)", color: movieFileOption === "file" ? "#000" : "#fff" }}
                  >
                    {t.uploadFile || "Upload File"}
                  </button>
                </div>
                {movieFileOption === "path" ? (
                  <input
                    type="text"
                    className="nano-dialog-input"
                    value={movieFilePath}
                    onChange={(e) => setMovieFilePath(e.target.value)}
                    placeholder="e.g. C:/Movies/video.mp4"
                    style={{ borderRadius: "12px" }}
                  />
                ) : (
                  <div style={{ padding: "10px 0" }}>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setMovieFile(file)
                        if (file) {
                          const base = getBaseDirectory(localServerPath)
                          setMovieFilePath(base ? `${base}${file.name}` : file.name)
                        }
                      }}
                      style={{ color: "var(--text-color)" }}
                    />
                    {editingItem?.file?.startsWith("browser_file_") && !movieFile && (
                      <p style={{ fontSize: "0.85rem", opacity: 0.5, margin: "4px 0 0 0" }}>Currently has an uploaded video file.</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ border: "1px solid var(--border-color)", padding: "20px", borderRadius: "16px" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "1rem" }}>{t.episodes || "Episodes"}</h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="number"
                      min="1"
                      className="nano-dialog-input"
                      value={newEpSeason}
                      onChange={(e) => setNewEpSeason(Number(e.target.value))}
                      placeholder="S"
                      style={{ width: "90px", borderRadius: "12px", textAlign: "center" }}
                    />
                    <input
                      type="number"
                      min="1"
                      className="nano-dialog-input"
                      value={newEpNumber}
                      onChange={(e) => setNewEpNumber(Number(e.target.value))}
                      placeholder="E"
                      style={{ width: "90px", borderRadius: "12px", textAlign: "center" }}
                    />
                    <select
                      className="nano-dialog-input"
                      value={newEpOption}
                      onChange={(e) => setNewEpOption(e.target.value as any)}
                      style={{ flex: 1, borderRadius: "12px" }}
                    >
                      <option value="path">{t.pathUrl || "Path/URL"}</option>
                      <option value="file">{t.uploadFile || "Upload File"}</option>
                    </select>
                  </div>
                  {newEpOption === "path" ? (
                    <input
                      type="text"
                      className="nano-dialog-input"
                      value={newEpPath}
                      onChange={(e) => setNewEpPath(e.target.value)}
                      placeholder="Local path or stream URL"
                      style={{ borderRadius: "12px" }}
                    />
                  ) : (
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setNewEpFile(file)
                        if (file) {
                          const base = getBaseDirectory(localServerPath)
                          setNewEpPath(base ? `${base}${file.name}` : file.name)
                        }
                      }}
                      style={{ color: "var(--text-color)" }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleAddEpisode}
                    className="nano-btn-full"
                    style={{ height: "36px", fontSize: "0.9rem" }}
                  >
                    {t.addEpisode || "Add Episode"}
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {episodes.map((ep) => (
                    <div 
                      key={`${ep.season}-${ep.episode}`}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "8px", fontSize: "0.9rem" }}
                    >
                      <span>Season {ep.season} Episode {ep.episode}: {ep.option === "path" ? ep.path : (ep.file ? ep.file.name : "Uploaded file")}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEpisode(ep.season, ep.episode)}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1.2rem" }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ border: "1px solid var(--border-color)", padding: "20px", borderRadius: "16px" }}>
              <h4 style={{ margin: "0 0 16px 0", fontSize: "1rem" }}>{t.subtitles || "Subtitles"}</h4>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    className="nano-dialog-input"
                    value={newSubLabel}
                    onChange={(e) => setNewSubLabel(e.target.value)}
                    placeholder="Label (e.g. English)"
                    style={{ flex: 2, borderRadius: "12px" }}
                  />
                  <input
                    type="text"
                    className="nano-dialog-input"
                    value={newSubLang}
                    onChange={(e) => setNewSubLang(e.target.value)}
                    placeholder="en"
                    style={{ flex: 1, borderRadius: "12px" }}
                  />
                  <select
                    className="nano-dialog-input"
                    value={newSubOption}
                    onChange={(e) => setNewSubOption(e.target.value as any)}
                    style={{ flex: 1.5, borderRadius: "12px" }}
                  >
                    <option value="path">{t.pathUrl || "Path/URL"}</option>
                    <option value="file">{t.uploadFile || "Upload File"}</option>
                  </select>
                </div>
                {newSubOption === "path" ? (
                  <input
                    type="text"
                    className="nano-dialog-input"
                    value={newSubPath}
                    onChange={(e) => setNewSubPath(e.target.value)}
                    placeholder="Subtitle file path or URL"
                    style={{ borderRadius: "12px" }}
                  />
                ) : (
                  <input
                    type="file"
                    accept=".vtt,.srt"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setNewSubFile(file)
                      if (file) {
                        const base = getBaseDirectory(localServerPath)
                        setNewSubPath(base ? `${base}${file.name}` : file.name)
                      }
                    }}
                    style={{ color: "var(--text-color)" }}
                  />
                )}
                <button
                  type="button"
                  onClick={handleAddSub}
                  className="nano-btn-full"
                  style={{ height: "36px", fontSize: "0.9rem" }}
                >
                  {t.addSubtitle || "Add Subtitle"}
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {subs.map((sub, idx) => (
                  <div 
                    key={idx}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "8px", fontSize: "0.9rem" }}
                  >
                    <span>{sub.label} ({sub.language}): {sub.option === "path" ? sub.path : (sub.file ? sub.file.name : "Uploaded file")}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSub(idx)}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1.2rem" }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
              <button type="submit" className="nano-dialog-btn" style={{ flex: 1, margin: 0, borderRadius: "12px" }}>
                {t.save || "Save"}
              </button>
              <button
                type="button"
                className="nano-btn-full"
                onClick={() => setIsAdding(false)}
                style={{ flex: 1, height: "48px", borderRadius: "12px" }}
              >
                {t.cancel || "Cancel"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
