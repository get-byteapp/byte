import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Mic,
  Send,
  ChevronDown,
  Square,
  Folder,
  X,
  HelpCircle,
  RefreshCw,
  File,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { getDisplayName, makeModelKey, resolveModel } from "../../lib/api";
import { convertFileToText, isTextFile, isImageFile, isPdfFile, convertPdfToMarkdown, renderPdfFirstPage } from "../../lib/fileConverter";
import { PlusMenu } from "./PlusMenu";
import { ModelPicker } from "./ModelPicker";
import { SlashCommandMenu } from "./SlashCommandMenu";
import type { SlashCommand } from "./SlashCommandMenu";
import type { ResponseStyleId, Attachment, ImageAttachment, FileAttachment, ImageMode } from "../../types";

interface InputBoxProps {
  variant: "home" | "chat";
  onSend: (text: string, attachments?: ImageAttachment[]) => void;
  isStreaming?: boolean;
  onStop?: () => void;
  value?: string;
  onChange?: (value: string) => void;
  responseStyle?: ResponseStyleId;
  onStyleChange?: (style: ResponseStyleId) => void;
  memoryEnabled?: boolean;
  onMemoryToggle?: (enabled: boolean) => void;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (enabled: boolean) => void;
}

export function InputBox({
  variant,
  onSend,
  isStreaming,
  onStop,
  value: externalValue,
  onChange,
  responseStyle = "normal",
  onStyleChange,
  memoryEnabled = false,
  onMemoryToggle,
  webSearchEnabled: extWebSearchEnabled,
  onWebSearchToggle,
}: InputBoxProps) {
  const [internalValue, setInternalValue] = useState("");
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [localWebSearch, setLocalWebSearch] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showFilesHelp, setShowFilesHelp] = useState(false);
  const [showNoVisionWarning, setShowNoVisionWarning] = useState(false);
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelChipRef = useRef<HTMLButtonElement>(null);
  const dragCounterRef = useRef(0);
  const {
    selectedModelId,
    providers,
    enabledModelIds,
    langSearchApiKey,
    langSearchEnabled,
    projects,
    activeChatId,
    addChatToProject,
    removeChatFromProject,
    activeProjectId,
    setActiveProjectId,
    visionDefaultMode,
    ocrEnabled,
    imageDescriptionModelId,
  } = useStore();

  const isModeLocked = visionDefaultMode !== "changeable";

  // Mode color mapping
  const getModeColor = (mode: ImageMode) => {
    switch (mode) {
      case "vision":
        return "#6366f1"; // Indigo
      case "ocr":
        return "#f59e0b"; // Amber
      case "describe":
        return "#8b5cf6"; // Violet
      case "pdf":
        return "#ef4444"; // Red
      default:
        return "#6b7280"; // Gray
    }
  };

  const getModeLabel = (mode: ImageMode) => {
    switch (mode) {
      case "vision":
        return "VISION";
      case "ocr":
        return "OCR";
      case "describe":
        return "DESIGN";
      case "pdf":
        return "PDF";
    }
  };

  const effectiveLangSearchApiKey = langSearchEnabled ? langSearchApiKey : "";
  const navigateToConnections = () => {
    useStore.getState().setSettingsSection("connections");
    useStore.getState().setActiveView("settings");
  };

  const text = externalValue !== undefined ? externalValue : internalValue;

  const enabledModels = useMemo(() => {
    return providers.flatMap((p) =>
      p.models.filter((m) =>
        enabledModelIds.includes(makeModelKey(p.id, m.id)),
      ),
    );
  }, [providers, enabledModelIds]);

  const model =
    resolveModel(providers, selectedModelId).model || enabledModels[0];

  const modelCanWebSearch = model?.capabilities?.webSearch ?? false;

  const canOpenPicker = enabledModels.length >= 2;

  const handleTextChange = useCallback(
    (newValue: string) => {
      if (onChange) {
        onChange(newValue);
      } else {
        setInternalValue(newValue);
      }

      if (newValue.startsWith("/") && !newValue.includes(" ")) {
        setShowSlashMenu(true);
        setSlashQuery(newValue.slice(1));
      } else {
        setShowSlashMenu(false);
        setSlashQuery("");
      }
    },
    [onChange],
  );

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height =
      Math.min(ta.scrollHeight, variant === "home" ? 180 : 140) + "px";
  }, [text, variant]);

  const handleSlashSelect = useCallback(
    (cmd: SlashCommand) => {
      setShowSlashMenu(false);
      setSlashQuery("");
      const insert = cmd.format ?? cmd.command + " ";
      handleTextChange(insert);
      textareaRef.current?.focus();
    },
    [handleTextChange],
  );

  const handleSend = useCallback(async () => {
    if ((!text.trim() && attachments.length === 0) || isStreaming) return;
    
    // Separate image and file attachments
    const imageAttachments = attachments.filter((a) => a.type === "image") as ImageAttachment[];
    const fileAttachments = attachments.filter((a) => a.type === "file") as FileAttachment[];
    
    // Build final message with file contents and PDF text
    let finalText = text.trim();
    for (const fileAtt of fileAttachments) {
      finalText += `\n\n[Attachment: ${fileAtt.fileName}]\n${fileAtt.fileContent}`;
    }
    for (const imgAtt of imageAttachments) {
      if (imgAtt.mode === "pdf" && imgAtt.description) {
        finalText += `\n\n[PDF: ${imgAtt.fileName}]\n${imgAtt.description}`;
      }
    }
    
    // Send with image attachments only (files are embedded in text)
    onSend(finalText, imageAttachments.length > 0 ? imageAttachments : undefined);
    handleTextChange("");
    setAttachments([]);
    setShowSlashMenu(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, attachments, isStreaming, onSend, handleTextChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showSlashMenu) return;

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [showSlashMenu, handleSend],
  );

  // Helper to check if any vision processing is available
  const checkVisionAvailable = () => {
    const hasVisionModel = providers.some(
      (p) =>
        p.apiKey &&
        p.models.some(
          (m) =>
            m.capabilities?.supportsVision &&
            enabledModelIds.includes(makeModelKey(p.id, m.id)),
        ),
    );
    return hasVisionModel || ocrEnabled || imageDescriptionModelId;
  };

  const handleAddFiles = () => {
    fileInputRef.current?.click();
  };

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;

      // Smart default based on visionDefaultMode
      let defaultMode: ImageMode;

      if (visionDefaultMode === "changeable") {
        // Use existing smart logic: vision if model supports it, otherwise OCR
        defaultMode = model?.capabilities?.supportsVision ? "vision" : "ocr";
      } else if (visionDefaultMode === "vision") {
        defaultMode = "vision";
      } else if (visionDefaultMode === "ocr") {
        defaultMode = "ocr";
      } else if (visionDefaultMode === "describe") {
        defaultMode = "describe";
      } else {
        // Fallback
        defaultMode = model?.capabilities?.supportsVision ? "vision" : "ocr";
      }

      const newAttachment: ImageAttachment = {
        id: `${Date.now()}-${Math.random()}`,
        type: "image",
        fileName: file.name,
        mimeType: file.type,
        dataUri,
        size: file.size,
        mode: defaultMode,
      };
      setAttachments((prev) => [...prev, newAttachment]);
    };
    reader.readAsDataURL(file);
  };

  const processTextFile = async (file: File) => {
    try {
      const fileContent = await convertFileToText(file);
      const newAttachment = {
        id: `${Date.now()}-${Math.random()}`,
        type: "file" as const,
        fileName: file.name,
        mimeType: file.type,
        fileContent,
        size: file.size,
      };
      setAttachments((prev) => [...prev, newAttachment]);
    } catch (error) {
      console.error("Error processing file:", error);
    }
  };

  const processPdfFile = async (file: File) => {
    try {
      const [textContent, dataUri] = await Promise.all([
        convertPdfToMarkdown(file),
        renderPdfFirstPage(file),
      ]);
      const newAttachment: ImageAttachment = {
        id: `${Date.now()}-${Math.random()}`,
        type: "image",
        fileName: file.name,
        mimeType: file.type,
        dataUri,
        size: file.size,
        mode: "pdf",
        description: textContent,
      };
      setAttachments((prev) => [...prev, newAttachment]);
    } catch (error) {
      console.error("Error processing PDF file:", error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((file) => isImageFile(file));
    const pdfFiles = Array.from(files).filter((file) => isPdfFile(file));
    const textFiles = Array.from(files).filter((file) => !isPdfFile(file) && isTextFile(file));

    // If there are image files but no vision processing available, show warning
    if (imageFiles.length > 0 && !checkVisionAvailable()) {
      setShowNoVisionWarning(true);
    } else {
      for (const file of imageFiles) {
        processImageFile(file);
      }
    }

    // Process PDF files
    for (const file of pdfFiles) {
      await processPdfFile(file);
    }

    // Process text files regardless
    for (const file of textFiles) {
      await processTextFile(file);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    console.log("[DragEnter] files:", e.dataTransfer.items.length);
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    console.log("[DragEnter] counter:", dragCounterRef.current);
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    console.log("[DragLeave] counter before:", dragCounterRef.current);
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    console.log("[DragLeave] counter after:", dragCounterRef.current);
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    console.log("[DragOver]");
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    console.log("[Drop] files:", e.dataTransfer.files.length);
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const allFiles = Array.from(e.dataTransfer.files);

    const imageFiles = allFiles.filter((file) => isImageFile(file));
    const pdfFiles = allFiles.filter((file) => isPdfFile(file));
    const textFiles = allFiles.filter((file) => !isPdfFile(file) && isTextFile(file));

    // If there are image files but no vision processing available, show warning
    if (imageFiles.length > 0 && !checkVisionAvailable()) {
      setShowNoVisionWarning(true);
    } else {
      for (const file of imageFiles) {
        processImageFile(file);
      }
    }

    // Process PDF files
    for (const file of pdfFiles) {
      await processPdfFile(file);
    }

    // Process text files regardless
    for (const file of textFiles) {
      await processTextFile(file);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    const fileItems = items.filter((item) => item.kind === "file" && !item.type.startsWith("image/"));

    // Handle image pastes
    if (imageItems.length > 0) {
      e.preventDefault();

      // Check if vision processing is available
      if (!checkVisionAvailable()) {
        setShowNoVisionWarning(true);
      } else {
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (file) {
            processImageFile(file);
          }
        }
      }
    }

    // Handle file pastes
    if (fileItems.length > 0) {
      e.preventDefault();
      for (const item of fileItems) {
        const file = item.getAsFile();
        if (file && isPdfFile(file)) {
          await processPdfFile(file);
        } else if (file && isTextFile(file)) {
          await processTextFile(file);
        }
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const cycleAttachmentMode = (id: string) => {
    // If visionDefaultMode is not "changeable", don't allow cycling (mode is locked)
    if (visionDefaultMode !== "changeable") {
      return;
    }

    setAttachments((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        
        // Only cycle for image attachments
        if (a.type !== "image") return a;

        // Determine which modes are available
        const availableModes: ImageMode[] = [];

        if (model?.capabilities?.supportsVision) {
          availableModes.push("vision");
        }
        if (ocrEnabled) {
          availableModes.push("ocr");
        }
        if (imageDescriptionModelId) {
          availableModes.push("describe");
        }

        // If no modes available or only one mode, don't cycle
        if (availableModes.length <= 1) return a;

        // Find current mode index and cycle to next available mode
        const currentIndex = availableModes.indexOf(a.mode);
        const nextIndex = (currentIndex + 1) % availableModes.length;
        const newMode = availableModes[nextIndex];

        return { ...a, mode: newMode };
      }),
    );
  };

  const handleScreenshot = () => {};
  const handleSkills = () => {};
  const handleAddConnectors = () => {};
  const handleAddChatToProject = (projectId: string) => {
    if (activeChatId) {
      addChatToProject(projectId, activeChatId);
    } else {
      setActiveProjectId(projectId);
    }
  };
  const handleStyleChange = (style: ResponseStyleId) => {
    onStyleChange?.(style);
  };

  const [isProjectHovered, setIsProjectHovered] = useState(false);

  const activeProject = useMemo(() => {
    if (activeChatId) {
      return projects.find((p) => p.chatIds.includes(activeChatId)) || null;
    }
    if (activeProjectId) {
      return projects.find((p) => p.id === activeProjectId) || null;
    }
    return null;
  }, [activeChatId, activeProjectId, projects]);

  const hasText = text.trim().length > 0;
  const webSearchEnabled =
    extWebSearchEnabled !== undefined ? extWebSearchEnabled : localWebSearch;
  const handleWebSearchToggle = onWebSearchToggle || setLocalWebSearch;

  return (
    <>
      <div className={`in-wrap${variant === "home" ? "" : ""}`}>
        <div
          className={`in-box${variant === "home" ? " home-in-box" : ""}${isDragging ? " dragging" : ""}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            border: isDragging ? "2px dashed var(--acc)" : undefined,
            background: isDragging
              ? "rgba(var(--acc-r),var(--acc-g),var(--acc-b),.05)"
              : undefined,
            transition: "border 0.2s, background 0.2s",
          }}
        >
          {/* Attachment thumbnails */}
          {attachments.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {/* FILES header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--tx3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  FILES
                </span>
                <button
                  onClick={() => setShowFilesHelp(true)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    color: "var(--tx3)",
                  }}
                >
                  <HelpCircle size={14} />
                </button>
              </div>

              {/* Separator line */}
              <div
                style={{
                  height: 1,
                  background: "var(--bd)",
                  marginBottom: 10,
                }}
              />

              {/* Image thumbnails */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {attachments.map((att) => {
                  // Handle file attachments
                  if (att.type === "file") {
                    return (
                      <div
                        key={att.id}
                        style={{
                          position: "relative",
                          width: 96,
                          height: 96,
                          borderRadius: "var(--r-md)",
                          overflow: "hidden",
                          border: "2px solid var(--p-border-subtle)",
                          background: "var(--sf2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexDirection: "column",
                          gap: 8,
                          padding: 8,
                        }}
                      >
                        <File size={32} style={{ color: "var(--p-text-secondary)" }} />
                        <span
                          style={{
                            fontSize: "10px",
                            textAlign: "center",
                            color: "var(--p-text-secondary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            width: "100%",
                          }}
                          title={att.fileName}
                        >
                          {att.fileName}
                        </span>

                        {/* Remove button */}
                        <button
                          onClick={() => removeAttachment(att.id)}
                          title="Remove file"
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "rgba(0,0,0,0.7)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            padding: 0,
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  }

                  // Handle image attachments
                  const isPdf = att.mode === "pdf";

                  return (
                    <div
                      key={att.id}
                      onMouseEnter={() => setHoveredImageId(att.id)}
                      onMouseLeave={() => setHoveredImageId(null)}
                      style={{
                        position: "relative",
                        width: 96,
                        height: 96,
                        borderRadius: "var(--r-md)",
                        overflow: "hidden",
                        background: "var(--sf2)",
                        transition: "all 0.2s ease",
                        border: `2px solid ${
                          isPdf
                            ? getModeColor("pdf")
                            : isModeLocked
                              ? "var(--bd)"
                              : getModeColor((att as ImageAttachment).mode)
                        }`,
                      }}
                    >
                      <img
                        src={att.dataUri}
                        alt={att.fileName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />

                      {/* Remove button */}
                      <button
                        onClick={() => removeAttachment(att.id)}
                        title="Remove image"
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "rgba(0,0,0,0.7)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          padding: 0,
                        }}
                      >
                        <X size={13} />
                      </button>

                      {/* Mode badge - only in flexible mode or for PDFs */}
                      {(!isModeLocked || isPdf) && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: isPdf ? 24 : 20,
                            background: getModeColor(
                              (att as ImageAttachment).mode,
                            ),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: isPdf ? "10px" : "9px",
                            fontWeight: isPdf ? 700 : 600,
                            color: "#fff",
                            transition: "opacity 0.2s ease",
                            opacity: hoveredImageId === att.id ? 0 : 1,
                            pointerEvents: "none",
                          }}
                        >
                          {getModeLabel(
                            (att as ImageAttachment).mode,
                          )}
                        </div>
                      )}

                      {/* Swap button - only show on hover in flexible mode with multiple modes available */}
                      {!isModeLocked &&
                        hoveredImageId === att.id &&
                        (att as ImageAttachment).mode !== "pdf" &&
                        (() => {
                          // Determine available modes
                          const availableModes = [];

                          // Vision is always available if there's a vision model
                          const hasVisionModel = providers.some(
                            (p) =>
                              p.apiKey &&
                              p.models.some(
                                (m) =>
                                  m.capabilities?.supportsVision &&
                                  enabledModelIds.includes(
                                    makeModelKey(p.id, m.id),
                                  ),
                              ),
                          );
                          if (hasVisionModel) availableModes.push("vision");

                          // OCR is available if enabled
                          if (ocrEnabled) availableModes.push("ocr");

                          // Describe is available if there's a description model
                          if (imageDescriptionModelId)
                            availableModes.push("describe");

                          // Only show swap if there are 2+ modes
                          return availableModes.length > 1;
                        })() && (
                          <button
                            onClick={() => cycleAttachmentMode(att.id)}
                            title={`Switch from ${(att as ImageAttachment).mode} mode`}
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: 24,
                              padding: "0 8px",
                              borderRadius: 0,
                              background: getModeColor(
                                (att as ImageAttachment).mode,
                              ),
                              border: "none",
                              cursor: "pointer",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 4,
                              animation: "swapButtonFade 0.2s ease",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <RefreshCw size={12} />
                            Swap
                          </button>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            className={variant === "home" ? "byte-ta" : "small-ta"}
            placeholder={variant === "home" ? "Ask anything…" : "Reply…"}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={variant === "home" ? 3 : 1}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.md,.json,.yaml,.yml,.xml,.csv,.ts,.tsx,.js,.jsx,.py,.java,.cpp,.go,.rb,.php"
            multiple
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          {showSlashMenu && (
            <SlashCommandMenu
              query={slashQuery}
              anchorRect={textareaRef.current?.getBoundingClientRect() ?? null}
              onSelect={handleSlashSelect}
              onClose={() => {
                setShowSlashMenu(false);
                setSlashQuery("");
              }}
              direction={variant === "chat" ? "up" : "down"}
            />
          )}

          <div
            className={variant === "home" ? "home-in-footer" : "in-row-bottom"}
          >
            <div className="in-tools">
              <PlusMenu
                onAddFiles={handleAddFiles}
                onScreenshot={handleScreenshot}
                onSkills={handleSkills}
                onAddConnectors={handleAddConnectors}
                onStyleChange={handleStyleChange}
                currentStyle={responseStyle}
                webSearchEnabled={webSearchEnabled}
                onWebSearchToggle={handleWebSearchToggle}
                memoryEnabled={memoryEnabled}
                onMemoryToggle={onMemoryToggle}
                direction="up"
                modelCanWebSearch={modelCanWebSearch}
                langSearchApiKey={effectiveLangSearchApiKey}
                onNavigateToConnections={navigateToConnections}
                projects={projects}
                activeChatId={activeChatId}
                onAddChatToProject={handleAddChatToProject}
                onRemoveChatFromProject={removeChatFromProject}
              />
              {activeProject && (
                <button
                  className="t-btn"
                  title={
                    isProjectHovered
                      ? "Remove from project"
                      : `Project: ${activeProject.name}`
                  }
                  onMouseEnter={() => setIsProjectHovered(true)}
                  onMouseLeave={() => setIsProjectHovered(false)}
                  onClick={() => {
                    if (activeChatId) {
                      removeChatFromProject(activeProject.id, activeChatId);
                    } else if (activeProjectId) {
                      setActiveProjectId(null);
                    }
                    setIsProjectHovered(false);
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--r-sm)",
                    border: "none",
                    background: isProjectHovered
                      ? "rgba(var(--acc-r),var(--acc-g),var(--acc-b),.15)"
                      : activeProject.color + "22",
                    cursor: "pointer",
                    color: isProjectHovered ? "var(--tx)" : activeProject.color,
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {isProjectHovered ? <X size={14} /> : <Folder size={14} />}
                </button>
              )}
            </div>
            <div className="in-right">
              {model &&
                (canOpenPicker ? (
                  <button
                    ref={modelChipRef}
                    className="model-chip"
                    onClick={() => setIsModelPickerOpen(!isModelPickerOpen)}
                    title="Change model"
                  >
                    {model.name || getDisplayName(model.id)}
                    <ChevronDown size={12} style={{ marginLeft: "4px" }} />
                  </button>
                ) : (
                  <span className="model-chip">
                    {model.name || getDisplayName(model.id)}
                  </span>
                ))}
              <ModelPicker
                isOpen={isModelPickerOpen}
                onClose={() => setIsModelPickerOpen(false)}
                triggerRef={modelChipRef}
                direction="up"
              />
              {isStreaming ? (
                <button
                  className="send send-stopping"
                  onClick={onStop}
                  title="Stop generation"
                  style={{
                    background: "var(--danger-fill)",
                    borderColor: "var(--danger-fill)",
                    color: "var(--white)",
                  }}
                >
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button
                  className={`send home-action-btn${hasText ? " has-text" : ""}`}
                  onClick={handleSend}
                  title={hasText ? "Send" : "Voice / Send"}
                  disabled={!hasText && !isStreaming}
                >
                  <span className="hab-voice">
                    <Mic size={14} />
                  </span>
                  <span className="hab-send">
                    <Send size={14} />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Files Help Modal */}
      {showFilesHelp && (
        <div className="modal-overlay" onClick={() => setShowFilesHelp(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--sf)",
              border: "1px solid var(--bd2)",
              borderRadius: "var(--r-lg)",
              padding: 24,
              width: "100%",
              maxWidth: 480,
              animation: "up .14s ease",
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: "calc(var(--fs) + 2px)",
                  fontWeight: 600,
                  color: "var(--tx)",
                  marginBottom: 8,
                }}
              >
                Image Processing
              </div>
              <div
                style={{
                  fontSize: "calc(var(--fs) - 1px)",
                  color: "var(--tx3)",
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}
              >
                How attached images are handled when sent to the AI. Set your
                default in Settings → Connections.
              </div>

              {/* Vision mode */}
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "var(--vision-color)",
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--tx)",
                      fontSize: "calc(var(--fs) - 1px)",
                    }}
                  >
                    Vision
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "calc(var(--fs) - 2px)",
                    color: "var(--tx2)",
                    lineHeight: 1.5,
                    paddingLeft: 20,
                  }}
                >
                  The AI directly analyzes the image content. Best for
                  understanding visual elements, scenes, objects, and context.
                </div>
              </div>

              {/* OCR mode */}
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "var(--ocr-color)",
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--tx)",
                      fontSize: "calc(var(--fs) - 1px)",
                    }}
                  >
                    OCR
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "calc(var(--fs) - 2px)",
                    color: "var(--tx2)",
                    lineHeight: 1.5,
                    paddingLeft: 20,
                  }}
                >
                  Extracts text from the image using Optical Character
                  Recognition. Best for screenshots, documents, or images with
                  text.
                </div>
              </div>

              {/* Describe mode */}
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: "var(--describe-color)",
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--tx)",
                      fontSize: "calc(var(--fs) - 1px)",
                    }}
                  >
                    Describe
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "calc(var(--fs) - 2px)",
                    color: "var(--tx2)",
                    lineHeight: 1.5,
                    paddingLeft: 20,
                  }}
                >
                  Gets a detailed description of the image first, then uses that
                  description in the conversation. Useful for complex images.
                </div>
              </div>

              {!isModeLocked && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: "var(--sf2)",
                    border: "1px solid var(--bd)",
                    borderRadius: "var(--r-md)",
                    fontSize: "calc(var(--fs) - 2px)",
                    color: "var(--tx3)",
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: "var(--tx)" }}>Tip:</strong> Hover
                  over an image and click <strong>Swap</strong> to switch between
                  available modes. Set a default mode in Settings → Connections
                  to use a single mode consistently.
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn btn-sm"
                onClick={() => setShowFilesHelp(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Vision Processing Warning Modal */}
      {showNoVisionWarning &&
        (() => {
          // Find all available vision models across providers
          const availableVisionModels = providers
            .filter((p) => p.apiKey)
            .flatMap((p) =>
              p.models
                .filter((m) => m.capabilities?.supportsVision)
                .map((m) => ({
                  name: m.name || getDisplayName(m.id),
                  providerName: p.name,
                  modelKey: makeModelKey(p.id, m.id),
                  isEnabled: enabledModelIds.includes(makeModelKey(p.id, m.id)),
                })),
            )
            .sort((a, b) => {
              // Show enabled models first
              if (a.isEnabled && !b.isEnabled) return -1;
              if (!a.isEnabled && b.isEnabled) return 1;
              return a.name.localeCompare(b.name);
            });

          return (
            <div
              className="modal-overlay"
              onClick={() => setShowNoVisionWarning(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: "var(--sf)",
                  border: "1px solid var(--bd2)",
                  borderRadius: "var(--r-lg)",
                  padding: 24,
                  width: "100%",
                  maxWidth: 520,
                  animation: "up .14s ease",
                  maxHeight: "85vh",
                  overflowY: "auto",
                }}
              >
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: "calc(var(--fs) + 2px)",
                      fontWeight: 600,
                      color: "var(--tx)",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "var(--warning)",
                        color: "var(--white)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: "bold",
                        flexShrink: 0,
                      }}
                    >
                      !
                    </span>
                    No Vision Processing Available
                  </div>
                  <div
                    style={{
                      fontSize: "calc(var(--fs) - 1px)",
                      color: "var(--tx3)",
                      lineHeight: 1.6,
                      marginBottom: 20,
                    }}
                  >
                    You need to enable at least one image processing method
                    before you can attach images.
                  </div>

                  {/* Vision Models */}
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: "calc(var(--fs) - 1px)",
                        fontWeight: 600,
                        color: "var(--tx)",
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "var(--vision-color)",
                        }}
                      />
                      Vision Models
                    </div>
                    <div
                      style={{
                        fontSize: "calc(var(--fs) - 2px)",
                        color: "var(--tx2)",
                        lineHeight: 1.5,
                        marginBottom: 10,
                        paddingLeft: 16,
                      }}
                    >
                      AI models that can directly analyze and understand image
                      content (objects, scenes, text, etc.).
                    </div>
                    {availableVisionModels.length > 0 ? (
                      <div
                        style={{
                          background: "var(--sf2)",
                          border: "1px solid var(--bd)",
                          borderRadius: "var(--r-md)",
                          padding: 10,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            fontSize: "calc(var(--fs) - 3px)",
                            color: "var(--tx3)",
                            marginBottom: 6,
                            fontWeight: 500,
                          }}
                        >
                          Available models:
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          {availableVisionModels.slice(0, 5).map((model) => (
                            <div
                              key={model.modelKey}
                              style={{
                                fontSize: "calc(var(--fs) - 3px)",
                                color: model.isEnabled
                                  ? "var(--success)"
                                  : "var(--tx3)",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: model.isEnabled
                                    ? "var(--success)"
                                    : "var(--tx4)",
                                  flexShrink: 0,
                                }}
                              />
                              {model.name} ({model.providerName})
                              {model.isEnabled && (
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: "var(--success)",
                                  }}
                                >
                                  {" "}
                                  ✓ Enabled
                                </span>
                              )}
                            </div>
                          ))}
                          {availableVisionModels.length > 5 && (
                            <div
                              style={{
                                fontSize: "calc(var(--fs) - 3px)",
                                color: "var(--tx3)",
                                fontStyle: "italic",
                              }}
                            >
                              +{availableVisionModels.length - 5} more available
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          paddingLeft: 16,
                          fontSize: "calc(var(--fs) - 2px)",
                          color: "var(--tx3)",
                          fontStyle: "italic",
                        }}
                      >
                        No vision models found. Add a provider with vision
                        support in Settings → Models.
                      </div>
                    )}
                  </div>

                  {/* OCR */}
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: "calc(var(--fs) - 1px)",
                        fontWeight: 600,
                        color: "var(--tx)",
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "var(--ocr-color)",
                        }}
                      />
                      OCR (Optical Character Recognition)
                    </div>
                    <div
                      style={{
                        fontSize: "calc(var(--fs) - 2px)",
                        color: "var(--tx2)",
                        lineHeight: 1.5,
                        paddingLeft: 16,
                      }}
                    >
                      Extracts text from images locally using Tesseract.js. Best
                      for screenshots, documents, or images with text.
                      <div style={{ marginTop: 6 }}>
                        <strong>Status:</strong>{" "}
                        <span
                          style={{
                            color: ocrEnabled
                              ? "var(--success)"
                              : "var(--warning)",
                          }}
                        >
                          {ocrEnabled ? "Enabled ✓" : "Disabled"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Image Description */}
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        fontSize: "calc(var(--fs) - 1px)",
                        fontWeight: 600,
                        color: "var(--tx)",
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "var(--describe-color)",
                        }}
                      />
                      Image Description
                    </div>
                    <div
                      style={{
                        fontSize: "calc(var(--fs) - 2px)",
                        color: "var(--tx2)",
                        lineHeight: 1.5,
                        paddingLeft: 16,
                      }}
                    >
                      Gets a detailed description of the image first, then uses
                      that in the conversation. Requires a vision model to be
                      configured.
                      <div style={{ marginTop: 6 }}>
                        <strong>Status:</strong>{" "}
                        <span
                          style={{
                            color: imageDescriptionModelId
                              ? "var(--success)"
                              : "var(--warning)",
                          }}
                        >
                          {imageDescriptionModelId
                            ? "Configured ✓"
                            : "Not configured"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="btn btn-sm"
                    onClick={() => setShowNoVisionWarning(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-sm btn-p"
                    onClick={() => {
                      setShowNoVisionWarning(false);
                      navigateToConnections();
                    }}
                  >
                    Open Settings
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}
