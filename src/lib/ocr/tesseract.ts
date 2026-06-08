let tesseractInstance: any = null
let isLoading = false

async function loadTesseract(): Promise<any> {
  if (tesseractInstance) return tesseractInstance
  if (isLoading) {
    while (isLoading) await new Promise(r => setTimeout(r, 100))
    return tesseractInstance
  }
  isLoading = true
  try {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    script.async = true
    await new Promise((resolve, reject) => {
      script.onload = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
    // @ts-ignore
    tesseractInstance = window.Tesseract
    isLoading = false
    return tesseractInstance
  } catch (error) {
    isLoading = false
    throw new Error(`Failed to load Tesseract.js: ${error}`)
  }
}

export async function runTesseractOCR(
  imageData: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const Tesseract = await loadTesseract()
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m: any) => {
      if (onProgress && m.status === 'recognizing text') onProgress(m.progress)
    },
  })
  const { data: { text } } = await worker.recognize(imageData)
  await worker.terminate()
  return text.trim() || '[No text found]'
}

export function isTesseractLoaded(): boolean {
  return tesseractInstance !== null
}

export async function preloadTesseract(): Promise<boolean> {
  try {
    await loadTesseract()
    return true
  } catch {
    return false
  }
}
