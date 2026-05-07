import * as pdfjsLib from "pdfjs-dist";

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function convertPdfToMarkdown(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

  let markdown = `# ${file.name}\n\n`;

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
        // Check if this is a new line (Y coordinate changed significantly)
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

export async function convertFileToText(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    return convertPdfToMarkdown(file);
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
    "application/pdf",
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
