import { runTesseractOCR, preloadTesseract, isTesseractLoaded } from './tesseract'
import { runPaddleOCR, preloadPaddleOCR } from './paddleocr'
import { runOcrSpaceOCR } from './ocrspace'
import { runGoogleVisionOCR } from './google-vision'
import { runAzureOCR } from './azure'

export { preloadTesseract, isTesseractLoaded, preloadPaddleOCR }

export async function extractTextOCR(
  imageData: string,
  options: {
    engineId: string | null
    apiConfigs: Record<string, { apiKey: string; endpoint?: string }>
    onProgress?: (progress: number) => void
  }
): Promise<string> {
  const { engineId, apiConfigs, onProgress } = options

  if (!engineId) throw new Error('No OCR engine configured')

  switch (engineId) {
    case 'tesseract':
      return runTesseractOCR(imageData, onProgress)

    case 'paddleocr':
      return runPaddleOCR(imageData, onProgress)

    case 'ocrspace': {
      const cfg = apiConfigs['ocrspace']
      if (!cfg?.apiKey) throw new Error('OCR.space API key not configured')
      return runOcrSpaceOCR(imageData, cfg.apiKey, onProgress)
    }

    case 'google-vision': {
      const cfg = apiConfigs['google-vision']
      if (!cfg?.apiKey) throw new Error('Google Vision API key not configured')
      return runGoogleVisionOCR(imageData, cfg.apiKey, onProgress)
    }

    case 'azure': {
      const cfg = apiConfigs['azure']
      if (!cfg?.apiKey) throw new Error('Azure API key not configured')
      if (!cfg?.endpoint) throw new Error('Azure endpoint not configured')
      return runAzureOCR(imageData, cfg.apiKey, cfg.endpoint, onProgress)
    }

    default:
      throw new Error(`Unknown OCR engine: ${engineId}`)
  }
}
