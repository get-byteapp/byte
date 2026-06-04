import { useState } from "react";
import { useStore } from "../../store/useStore";
import ReactMarkdown from "react-markdown";

export function UpdateCard() {
  const { updateAvailable, setUpdateAvailable } = useStore();
  const [expanded, setExpanded] = useState(false);

  if (!updateAvailable) return null;

  const { version, installing, installed, releaseNotes } = updateAvailable;

  const isMac = navigator.userAgent.toLowerCase().includes("mac");

  const handleInstall = async () => {
    if (isMac) {
      window.open("https://github.com/usebyte/byte/releases/latest", "_blank");
      return;
    }

    setUpdateAvailable({ ...updateAvailable, installing: true, installed: false });
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        setUpdateAvailable({ ...updateAvailable, installing: false, installed: true });
      }
    } catch {
      setUpdateAvailable({ ...updateAvailable, installing: false, installed: false });
    }
  };

  return (
    <div className="upd-card">
      <div className="upd-card-header">
        <div className="upd-card-title">
          <span className="upd-card-badge">New</span>
          <span>Byte {version}</span>
        </div>
        <button className="upd-card-dismiss" onClick={() => setUpdateAvailable(null)}>
          &times;
        </button>
      </div>

      {installing && <div className="upd-card-progress">Installing...</div>}
      {installed && <div className="upd-card-progress installed">Installed! Restart to apply.</div>}

      {releaseNotes && (
        <button
          className="upd-card-notes-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Hide notes" : "Release notes"}
          <span className={`upd-card-chevron ${expanded ? "open" : ""}`}>
            &#9662;
          </span>
        </button>
      )}

      {expanded && releaseNotes && (
        <div className="upd-card-notes">
          <ReactMarkdown>{releaseNotes}</ReactMarkdown>
        </div>
      )}

      <button
        className="upd-card-action"
        onClick={handleInstall}
        disabled={installing || installed}
      >
        {installing
          ? "Installing..."
          : installed
            ? "Restart to apply"
            : isMac
              ? "Download on GitHub"
              : "Install Update"}
      </button>
    </div>
  );
}
