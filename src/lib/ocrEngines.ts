import type { OcrEngineId, SystemSpecs } from '../types'

export interface OcrEngineDefinition {
  id: OcrEngineId
  name: string
  description: string
  type: 'offline' | 'api'
  storageMb: number
  minRamGb: number
  quality: 1 | 2 | 3 | 4 | 5
  speed: 'fast' | 'medium' | 'slow'
  strengths: string[]
  apiKeyLabel?: string
  apiKeyPlaceholder?: string
  apiKeyLink?: string
  endpointLabel?: string
}

export const OCR_ENGINES: OcrEngineDefinition[] = [
  {
    id: 'tesseract',
    name: 'Tesseract',
    description: 'Lightweight offline OCR. Best for clean printed text.',
    type: 'offline',
    storageMb: 30,
    minRamGb: 1,
    quality: 3,
    speed: 'fast',
    strengths: ['Clean text', 'Low resource usage', 'No internet needed'],
  },
  {
    id: 'paddleocr',
    name: 'PaddleOCR',
    description: 'Neural network OCR by Baidu. Better accuracy on complex layouts and dense text.',
    type: 'offline',
    storageMb: 60,
    minRamGb: 2,
    quality: 4,
    speed: 'medium',
    strengths: ['Complex layouts', 'Dense text', 'Better accuracy'],
  },
  {
    id: 'ocrspace',
    name: 'OCR.space',
    description: 'Free OCR API. 25,000 requests/month free.',
    type: 'api',
    storageMb: 0,
    minRamGb: 0,
    quality: 3,
    speed: 'medium',
    strengths: ['Free tier', '30+ languages', 'No install'],
    apiKeyLabel: 'OCR.space API Key',
    apiKeyPlaceholder: 'K8...',
    apiKeyLink: 'https://ocr.space/ocrapi/freekey',
  },
  {
    id: 'azure',
    name: 'Azure Document Intelligence',
    description: 'Microsoft Azure OCR. 500 free pages/month.',
    type: 'api',
    storageMb: 0,
    minRamGb: 0,
    quality: 5,
    speed: 'medium',
    strengths: ['Best for forms', 'Table extraction', 'Structured output'],
    apiKeyLabel: 'Azure API Key',
    apiKeyPlaceholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    apiKeyLink: 'https://portal.azure.com',
    endpointLabel: 'Azure Endpoint',
  },
]

export function getOfflineEngines(): OcrEngineDefinition[] {
  return OCR_ENGINES.filter(e => e.type === 'offline')
}

export function getApiEngines(): OcrEngineDefinition[] {
  return OCR_ENGINES.filter(e => e.type === 'api')
}

export function getRecommendedEngineId(specs: SystemSpecs): OcrEngineId {
  if (specs.totalRamGb >= 2) return 'paddleocr'
  return 'tesseract'
}

export function getEngineById(id: string): OcrEngineDefinition | undefined {
  return OCR_ENGINES.find(e => e.id === id)
}
