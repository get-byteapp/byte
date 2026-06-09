import type Ocr from '@gutenye/ocr-browser'

const CDN = 'https://cdn.jsdelivr.net/npm/@gutenye/ocr-models@1.4.2/assets'
const ORT_CDN = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/'

let instance: InstanceType<typeof Ocr> | null = null

async function getInstance(): Promise<InstanceType<typeof Ocr>> {
  if (instance) return instance
  const ort = await import('onnxruntime-web')
  ort.env.wasm.wasmPaths = ORT_CDN
  const { default: OcrClass } = await import('@gutenye/ocr-browser')
  instance = await OcrClass.create({
    models: {
      detectionPath: `${CDN}/ch_PP-OCRv4_det_infer.onnx`,
      recognitionPath: `${CDN}/ch_PP-OCRv4_rec_infer.onnx`,
      dictionaryPath: `${CDN}/ppocr_keys_v1.txt`,
    },
  })
  return instance
}

export async function preloadPaddleOCR(): Promise<boolean> {
  try {
    await getInstance()
    return true
  } catch {
    return false
  }
}

export async function runPaddleOCR(
  imageData: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  onProgress?.(10)
  const ocr = await getInstance()
  onProgress?.(60)
  const lines = await ocr.detect(imageData)
  onProgress?.(100)
  return lines.map(l => l.text).join('\n')
}
