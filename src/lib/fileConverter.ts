import { invoke } from '@tauri-apps/api/core'
import { appDataDir } from '@tauri-apps/api/path'
import { writeFile, remove } from '@tauri-apps/plugin-fs'

interface MarkitdownResult {
  success: boolean
  content?: string
  error?: string
}

export async function convertFileWithMarkitdown(file: File): Promise<string | null> {
  try {
    const dataDir = await appDataDir()
    const tempPath = `${dataDir}/tmp_${Date.now()}_${file.name}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    await writeFile(tempPath, bytes)
    const raw = await invoke<string>('convert_file_markitdown', { filePath: tempPath })
    await remove(tempPath).catch(() => {})
    const result: MarkitdownResult = JSON.parse(raw)
    if (!result.success) {
      console.warn('[MarkItDown] Conversion failed:', result.error)
      return null
    }
    return result.content ?? null
  } catch (err) {
    console.warn('[MarkItDown] Sidecar unavailable, falling back to JS:', err)
    return null
  }
}

// Polyfill Map.getOrInsertComputed for environments that don't support ES2025 (e.g. Tauri/WKWebView)
const MapProto = Map.prototype as any;
if (typeof MapProto.getOrInsertComputed === "undefined") {
  MapProto.getOrInsertComputed = function (key: any, callback: (key: any) => any): any {
    if (this.has(key)) return this.get(key);
    const value = callback(key);
    this.set(key, value);
    return value;
  };
}

import * as pdfjsLib from "pdfjs-dist";
import * as XLSX from "xlsx";
import * as mammoth from "mammoth";

if (
  typeof ReadableStream !== "undefined" &&
  !(ReadableStream.prototype as any)[Symbol.asyncIterator]
) {
  (ReadableStream.prototype as any)[Symbol.asyncIterator] = async function* () {
    const reader = this.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        yield value;
      }
    } finally {
      reader.releaseLock();
    }
  };
}

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

export async function convertPdfToMarkdown(file: File): Promise<string> {
  const markitdownResult = await convertFileWithMarkitdown(file)
  if (markitdownResult) return markitdownResult
  const arrayBuffer = await file.arrayBuffer();
  return extractPdfText(arrayBuffer, file.name);
}

export async function extractPdfTextFromBytes(bytes: ArrayBuffer | Uint8Array, fileName: string): Promise<string> {
  return extractPdfText(bytes, fileName);
}

async function extractPdfText(data: ArrayBuffer | Uint8Array, fileName: string): Promise<string> {
  const pdf = await pdfjsLib.getDocument(data).promise;

  let markdown = `# ${fileName}\n\n`;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    if (pageNum > 1) {
      markdown += "\n---\n\n";
    }

    markdown += `## Page ${pageNum}\n\n`;

    let lastY: number | null = null;
    for (const item of textContent.items) {
      if ("str" in item) {
        if (lastY !== null && Math.abs((item as any).y - lastY) > 5) {
          markdown += "\n";
        }
        markdown += item.str + " ";
        lastY = (item as any).y;
      }
    }

    markdown += "\n";
  }

  return markdown;
}

export async function renderPdfFirstPage(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, canvas, viewport }).promise;
  return canvas.toDataURL("image/png");
}

export async function renderPdfPages(file: File, onProgress?: (done: number, total: number) => void): Promise<{ page: number; dataUri: string }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
  const total = pdf.numPages;
  const results: { page: number; dataUri: string }[] = [];

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    results.push({ page: i, dataUri: canvas.toDataURL("image/png") });
    onProgress?.(i, total);
  }

  return results;
}

export function hasPdfText(textContent: string): boolean {
  const content = textContent
    .replace(/# .+\n+/g, '')
    .replace(/## Page \d+\n+/g, '')
    .replace(/---\n+/g, '')
    .replace(/\d+\n/g, '')
    .trim();
  return content.length > 30;
}

export async function convertFileToText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  const isOfficeFile = name.endsWith('.xlsx') || name.endsWith('.xls') ||
    name.endsWith('.docx') || name.endsWith('.pptx') || name.endsWith('.pdf')

  if (isOfficeFile) {
    const markitdownResult = await convertFileWithMarkitdown(file)
    if (markitdownResult) return markitdownResult
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return convertExcelToMarkdown(file);
  }

  if (name.endsWith(".docx")) {
    return convertDocxToMarkdown(file);
  }

  if (name.endsWith(".pptx")) {
    return convertPptxToMarkdown(file);
  }

  // For text files, just read as text
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      // Wrap content in markdown code block if it's a source file
      const isSourceFile = /\.(ts|tsx|js|jsx|py|java|cpp|go|rb|php)$/i.test(
        file.name,
      );
      if (isSourceFile) {
        const ext = file.name.split(".").pop() || "text";
        resolve(`\`\`\`${ext}\n${content}\n\`\`\``);
      } else {
        resolve(content);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function isTextFile(file: File): boolean {
  const mimeType = file.type;
  const fileName = file.name.toLowerCase();
  
  const textMimeTypes = [
    "text/plain",
    "text/markdown", 
    "text/csv",
    "application/json",
    "application/xml",
    "application/x-yaml",
  ];
  
  const textExtensions = [
    ".md", ".txt", ".csv", ".json", ".yaml", ".yml", ".xml",
    ".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".cpp", 
    ".go", ".rb", ".php", ".c", ".h", ".css", ".html", ".sql",
  ];
  
  // Check by mime type
  if (mimeType) {
    if (textMimeTypes.includes(mimeType) || mimeType.startsWith("text/")) {
      return true;
    }
  }
  
  // Check by extension
  for (const ext of textExtensions) {
    if (fileName.endsWith(ext)) {
      return true;
    }
  }
  
  return false;
}

export function isPdfFile(file: File): boolean {
  const mimeType = file.type;
  const fileName = file.name.toLowerCase();
  if (mimeType === "application/pdf") return true;
  if (fileName.endsWith(".pdf")) return true;
  return false;
}

export function isImageFile(file: File): boolean {
  const mimeType = file.type;
  const fileName = file.name.toLowerCase();
  
  // Check by mime type
  if (mimeType && mimeType.startsWith("image/")) {
    return true;
  }
  
  // Check by extension for common image types
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".heic", ".heif"];
  for (const ext of imageExtensions) {
    if (fileName.endsWith(ext)) {
      return true;
    }
  }
  
  return false;
}

export function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".xlsx") || name.endsWith(".xls");
}

export function isWordFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".docx");
}

export function isPptxFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".pptx");
}

export async function convertExcelToMarkdown(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const lines: string[] = [`# ${file.name}\n`];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    if (json.length === 0) continue;

    lines.push(`## Sheet: ${sheetName}\n`);

    const maxCols = Math.max(...json.map((r) => r?.length || 0));
    const separator = "| " + Array(maxCols).fill("---").join(" | ") + " |";

    for (let i = 0; i < json.length; i++) {
      const row = json[i] || [];
      const padded = Array.from({ length: maxCols }, (_, ci) =>
        row[ci] !== undefined && row[ci] !== null ? String(row[ci]) : ""
      );
      lines.push("| " + padded.join(" | ") + " |");
      if (i === 0) lines.push(separator);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export async function convertDocxToMarkdown(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return `# ${file.name}\n\n` + result.value;
}

export async function convertPptxToMarkdown(file: File): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const data = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(data);

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort();

  const lines: string[] = [`# ${file.name}\n`];

  for (let i = 0; i < slideFiles.length; i++) {
    const xmlStr = await zip.files[slideFiles[i]].async("text");
    const texts = extractPptxText(xmlStr);
    if (texts.length === 0) continue;
    lines.push(`## Slide ${i + 1}\n`);
    lines.push(texts.join("\n") + "\n");
  }

  return lines.join("\n");
}

function extractPptxText(xml: string): string[] {
  const texts: string[] = [];
  const tagRegex = /<a:t[^>]*>([^<]+)<\/a:t>/g;
  let match;
  while ((match = tagRegex.exec(xml)) !== null) {
    const t = match[1].trim();
    if (t) texts.push(t);
  }
  return texts;
}
