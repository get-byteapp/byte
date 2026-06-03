import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Mic,
  Send,
  ChevronDown,
  Square,
  Folder,
  X,
  File,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { getDisplayName, makeModelKey, resolveModel } from "../../lib/api";
import * as pdfjsLib from "pdfjs-dist";
import { convertFileToText, isTextFile, isImageFile, isPdfFile, isExcelFile, isWordFile, isPptxFile, convertPdfToMarkdown, renderPdfFirstPage, hasPdfText } from "../../lib/fileConverter";
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
  operationMode?: boolean;
  onOperationToggle?: (enabled: boolean) => void;
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
  operationMode = false,
  onOperationToggle,
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
  const [pdfErrorMsg, setPdfErrorMsg] = useState<string | null>(null);
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);
  const [visionModalAttId, setVisionModalAttId] = useState<string | null>(null);
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
    
    // Build final message with file contents
    let finalText = text.trim();
    for (const fileAtt of fileAttachments) {
      finalText += `\n\n[Attachment: ${fileAtt.fileName}]\n${fileAtt.fileContent}`;
    }
    
    // Send with image attachments (PDF content is handled in the API layer)
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
      const textContent = await convertPdfToMarkdown(file);
      const firstPageUri = await renderPdfFirstPage(file);

      if (hasPdfText(textContent)) {
        // Text PDF — send extracted text directly
        const newAttachment: ImageAttachment = {
          id: `${Date.now()}-${Math.random()}`,
          type: "image",
          fileName: file.name,
          mimeType: file.type,
          dataUri: firstPageUri,
          size: file.size,
          mode: "pdf",
          description: textContent,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      } else {
        // Scanned PDF — store PDF data for lazy rendering at send time
        const pdfDataUri = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        // Get page count from the already-loaded pdf
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

        const newAttachment: ImageAttachment = {
          id: `${Date.now()}-${Math.random()}`,
          type: "image",
          fileName: file.name,
          mimeType: file.type,
          dataUri: firstPageUri,
          size: file.size,
          mode: "ocr",
          totalPages: pdf.numPages,
          pdfData: pdfDataUri,
        };
        setAttachments((prev) => [...prev, newAttachment]);
      }
    } catch (error) {
      console.error("Error processing PDF file:", error);
      setPdfErrorMsg(`Failed to process "${file.name}". The file may be corrupted or password-protected.`);
    }
  };

  useEffect(() => {
    if (pdfErrorMsg) {
      const t = setTimeout(() => setPdfErrorMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [pdfErrorMsg]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((file) => isImageFile(file));
    const pdfFiles = Array.from(files).filter((file) => isPdfFile(file));
    const textFiles = Array.from(files).filter((file) => !isPdfFile(file) && (isTextFile(file) || isExcelFile(file) || isWordFile(file) || isPptxFile(file)));

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
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
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
    const textFiles = allFiles.filter((file) => !isPdfFile(file) && (isTextFile(file) || isExcelFile(file) || isWordFile(file) || isPptxFile(file)));

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

  const getAvailableModes = useCallback((att: Attachment): ImageMode[] => {
    const modes: ImageMode[] = [];
    if (att.type === "image" && att.description && hasPdfText(att.description)) {
      modes.push("pdf");
    }
    if (model?.capabilities?.supportsVision) {
      modes.push("vision");
    }
    if (ocrEnabled) {
      modes.push("ocr");
    }
    if (imageDescriptionModelId) {
      modes.push("describe");
    }
    return modes;
  }, [model, ocrEnabled, imageDescriptionModelId]);

  const setAttachmentMode = (id: string, newMode: ImageMode) => {
    if (visionDefaultMode !== "changeable") return;
    setAttachments((prev) =>
      prev.map((a) => (a.id === id && a.type === "image" ? { ...a, mode: newMode } : a)),
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
            position: "relative",
            border: isDragging ? "2px dashed var(--acc)" : undefined,
            background: isDragging
              ? "rgba(var(--acc-r),var(--acc-g),var(--acc-b),.05)"
              : undefined,
            transition: "border 0.2s, background 0.2s",
          }}
        >
          {/* Attachment thumbnails */}
          {attachments.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 10,
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
                        width: 88,
                        height: 88,
                        borderRadius: "var(--r-md)",
                        overflow: "hidden",
                        border: "1px solid var(--bd)",
                        background: "var(--sf2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        gap: 6,
                        padding: 8,
                        animation: "up .15s ease",
                      }}
                    >
                      <File size={28} style={{ color: "var(--tx3)" }} />
                      <span
                        style={{
                          fontSize: "10px",
                          textAlign: "center",
                          color: "var(--tx3)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          width: "100%",
                          lineHeight: 1.2,
                        }}
                        title={att.fileName}
                      >
                        {att.fileName}
                      </span>
                      <button
                        onClick={() => removeAttachment(att.id)}
                        title="Remove file"
                        style={{
                          position: "absolute",
                          top: 3,
                          right: 3,
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "rgba(0,0,0,0.65)",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          padding: 0,
                          opacity: 0,
                          transition: "opacity .15s",
                        }}
                        className="att-remove-btn"
                        onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  );
                }

                // Image and PDF attachments
                const imgAtt = att as ImageAttachment;
                const availableModes = getAvailableModes(att);
                const modeColor = getModeColor(imgAtt.mode);

                return (
                  <>
                    <div
                      key={att.id}
                      onClick={() => {
                        if (!isModeLocked && availableModes.length > 1) {
                          setVisionModalAttId(att.id);
                        }
                      }}
                      style={{
                        position: "relative",
                        width: 88,
                        height: 88,
                        borderRadius: "var(--r-md)",
                        overflow: "hidden",
                        background: "var(--sf2)",
                        border: `2px solid ${
                          isModeLocked ? "var(--bd)" : modeColor
                        }`,
                        transition: "border-color .2s, box-shadow .2s",
                        animation: "up .15s ease",
                        flexShrink: 0,
                        cursor: !isModeLocked && availableModes.length > 1 ? "pointer" : "default",
                      }}
                      onMouseEnter={() => setHoveredImageId(att.id)}
                      onMouseLeave={() => setHoveredImageId(null)}
                    >
                      <img
                        src={imgAtt.dataUri}
                        alt={imgAtt.fileName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />

                      {/* Remove button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeAttachment(att.id); }}
                        title="Remove"
                        style={{
                          position: "absolute",
                          top: 3,
                          right: 3,
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: "rgba(0,0,0,0.65)",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          padding: 0,
                          opacity: hoveredImageId === att.id ? 1 : 0,
                          transition: "opacity .15s",
                        }}
                      >
                        <X size={11} />
                      </button>
                    </div>

                    {/* Image preview modal with mode picker */}
                    {visionModalAttId === att.id && (
                      <div
                        style={{
                          position: "fixed",
                          inset: 0,
                          zIndex: 999,
                          background: "rgba(0,0,0,0.75)",
                          display: "flex",
                          flexDirection: "column",
                          padding: 0,
                        }}
                        onClick={() => setVisionModalAttId(null)}
                      >
                        {/* Image area */}
                        <div
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 24,
                            minHeight: 0,
                          }}
                          onClick={() => setVisionModalAttId(null)}
                        >
                          <img
                            src={imgAtt.dataUri}
                            alt={imgAtt.fileName}
                            style={{
                              maxWidth: "100%",
                              maxHeight: "100%",
                              objectFit: "contain",
                              borderRadius: "var(--r-md)",
                              boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
                              display: "block",
                            }}
                          />
                        </div>

                        {/* Bottom bar */}
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            background: "var(--sf)",
                            borderTop: "1px solid var(--bd)",
                            padding: "10px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          {/* File info */}
                          <div
                            style={{
                              fontSize: "calc(var(--fs) - 1px)",
                              color: "var(--tx2)",
                              fontWeight: 500,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            {imgAtt.fileName}
                          </div>

                          {/* Mode selector */}
                          <div
                            style={{
                              display: "flex",
                              gap: 2,
                              background: "var(--sf2)",
                              borderRadius: "var(--r-sm)",
                              padding: 2,
                              flexShrink: 0,
                            }}
                          >
                            {availableModes.map((mode) => {
                              const isActive = imgAtt.mode === mode;
                              const modeColors: Record<string, string> = {
                                vision: "var(--vision-color, #6366f1)",
                                ocr: "var(--ocr-color, #f59e0b)",
                                describe: "var(--describe-color, #8b5cf6)",
                                pdf: "#ef4444",
                              };
                              const modeLabels: Record<string, string> = {
                                vision: "Vision",
                                ocr: "OCR",
                                describe: "Describe",
                                pdf: "PDF",
                              };
                              const dotColor = modeColors[mode] || "var(--tx3)";
                              return (
                                <button
                                  key={mode}
                                  onClick={() => setAttachmentMode(att.id, mode)}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "5px 10px",
                                    borderRadius: "var(--r-sm)",
                                    border: "none",
                                    background: isActive ? "var(--sf)" : "transparent",
                                    cursor: "pointer",
                                    fontSize: "calc(var(--fs) - 1px)",
                                    fontWeight: isActive ? 600 : 500,
                                    color: isActive ? dotColor : "var(--tx3)",
                                    fontFamily: "var(--font)",
                                    transition: "all var(--ease)",
                                    boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isActive) e.currentTarget.style.color = "var(--tx)";
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isActive) e.currentTarget.style.color = "var(--tx3)";
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      background: dotColor,
                                      display: "inline-block",
                                      flexShrink: 0,
                                    }}
                                  />
                                  {modeLabels[mode] || mode}
                                </button>
                              );
                            })}
                          </div>

                          {/* Close button */}
                          <button
                            onClick={() => setVisionModalAttId(null)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--tx3)",
                              cursor: "pointer",
                              padding: 6,
                              display: "flex",
                              borderRadius: "var(--r-sm)",
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "var(--tx)"}
                            onMouseLeave={(e) => e.currentTarget.style.color = "var(--tx3)"}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })}
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
            accept="image/*,.pdf,.txt,.md,.json,.yaml,.yml,.xml,.csv,.ts,.tsx,.js,.jsx,.py,.java,.cpp,.go,.rb,.php,.xlsx,.xls,.docx,.pptx"
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
                operationMode={operationMode}
                onOperationToggle={onOperationToggle}
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

          {/* Drop zone overlay */}
          {isDragging && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "inherit",
                background: "rgba(var(--acc-r),var(--acc-g),var(--acc-b),.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  color: "rgba(var(--acc-r),var(--acc-g),var(--acc-b),.7)",
                }}
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span style={{ fontSize: 14, fontWeight: 500 }}>Drop files here</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>Images, PDFs, text files, and more</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Error Toast */}
      {pdfErrorMsg && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 12px",
            background: "var(--danger-fill)",
            color: "var(--white)",
            borderRadius: "var(--r-md)",
            fontSize: "calc(var(--fs) - 1px)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            animation: "up .12s ease",
          }}
        >
          <span style={{ flex: 1 }}>{pdfErrorMsg}</span>
          <button
            onClick={() => setPdfErrorMsg(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              opacity: 0.8,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

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
