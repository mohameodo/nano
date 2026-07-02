import { useRef, useState, useEffect } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { HiMiniRectangleStack } from "react-icons/hi2";
import { FaCheck, FaServer } from "react-icons/fa";

interface ServerInfo {
  id: string;
  name: string;
}

interface ControlsProps {
  displayTitle: string;
  servers?: ServerInfo[];
  activeServer?: string;
  setActiveServer?: (server: string) => void;
  canSkipServer?: boolean;
  onSkipServer?: () => void;
  isTv?: boolean;
  showEpisodes?: boolean;
  setShowEpisodes?: (show: boolean) => void;
  hideExtra?: boolean;
}

export default function Controls({
  displayTitle,
  servers = [],
  activeServer = "",
  setActiveServer,
  canSkipServer = false,
  onSkipServer,
  isTv = false,
  showEpisodes = false,
  setShowEpisodes,
  hideExtra = false,
}: ControlsProps) {
  const [serverOpen, setServerOpen] = useState(false);
  const serverRef = useRef<HTMLDivElement>(null);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [isMouseMoveActive, setIsMouseMoveActive] = useState(false);

  useEffect(() => {
    let timeout: any;
    const handleMouseMove = () => {
      setIsMouseMoveActive(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsMouseMoveActive(false);
      }, 3000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (serverRef.current && !serverRef.current.contains(e.target as Node)) {
        setServerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isVisible = isHeaderHovered || serverOpen || showEpisodes || isMouseMoveActive;
  const activeServerName = servers.find((s) => s.id === activeServer)?.name || activeServer;

  return (
    <header 
      className={`nano-watch-header ${isVisible ? "visible" : ""}`} 
      onMouseEnter={() => setIsHeaderHovered(true)}
      onMouseLeave={() => setIsHeaderHovered(false)}
      style={{ 
        opacity: isVisible ? 1 : 0, 
        pointerEvents: isVisible ? "auto" : "none",
        transition: "opacity 0.3s ease",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)", 
        backdropFilter: "none", 
        WebkitBackdropFilter: "none", 
        position: "absolute", 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 50 
      }}
    >
      <button
        className="nano-watch-back-btn"
        onClick={() => window.location.href = "/"}
        aria-label="Back"
      >
        <FiArrowLeft />
      </button>
      <span className="nano-watch-title">{displayTitle}</span>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
        {!hideExtra && canSkipServer && onSkipServer && (
          <button
            className="nano-watch-back-btn"
            onClick={onSkipServer}
            style={{
              borderRadius: "8px",
              width: "auto",
              height: "36px",
              padding: "0 12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "14px",
              fontWeight: 500,
              backgroundColor: "rgba(255,255,255,0.15)",
              position: "relative",
              zIndex: 200,
            }}
          >
            <span>Skip Server</span>
          </button>
        )}

        {!hideExtra && isTv && setShowEpisodes && (
          <button
            className={`nano-watch-back-btn ${showEpisodes ? "active" : ""}`}
            onClick={() => setShowEpisodes(!showEpisodes)}
            style={{ 
              borderRadius: "8px", 
              width: "auto", 
              height: "36px", 
              padding: "0 12px", 
              display: "flex", 
              alignItems: "center", 
              gap: "6px",
              fontSize: "14px",
              fontWeight: 500,
              backgroundColor: showEpisodes ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.5)"
            }}
          >
            <HiMiniRectangleStack style={{ fontSize: "16px" }} />
            <span>Episodes</span>
          </button>
        )}

        {!hideExtra && servers.length > 0 && setActiveServer && (
          <div ref={serverRef} style={{ position: "relative" }}>
            <button
              className="nano-watch-back-btn"
              onClick={() => setServerOpen((v) => !v)}
              style={{
                borderRadius: "8px",
                width: "auto",
                height: "36px",
                padding: "0 12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: 500,
                backgroundColor: serverOpen ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.5)"
              }}
            >
              <FaServer style={{ fontSize: "14px" }} />
              <span>{activeServerName}</span>
            </button>

            {serverOpen && (
              <div 
                className="nano-lang-dropdown" 
                style={{ 
                  position: "absolute", 
                  top: "42px", 
                  right: 0, 
                  backgroundColor: "rgba(20, 20, 22, 0.95)", 
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "6px",
                  minWidth: "140px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  zIndex: 100
                }}
              >
                {servers.map((server) => (
                  <button
                    key={server.id}
                    className={`nano-lang-option ${server.id === activeServer ? "nano-lang-option-active" : ""}`}
                    onClick={() => {
                      setActiveServer(server.id);
                      setServerOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "none",
                      border: "none",
                      color: "#fff",
                      fontSize: "13px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%"
                    }}
                  >
                    <span>{server.name}</span>
                    {server.id === activeServer && <FaCheck style={{ fontSize: "11px", opacity: 0.8 }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
