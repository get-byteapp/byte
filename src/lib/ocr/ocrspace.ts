export async function runOcrSpaceOCR(
  imageData: string,
  apiKey: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  onProgress?.(0.1)

  const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData
  const mimeType = imageData.startsWith('data:')
    ? imageData.split(';')[0].split(':')[1]
    : 'image/png'

  const formData = new FormData()
  formData.append('apikey', apiKey)
  formData.append('language', 'eng')
  formData.append('isOverlayRequired', 'false')
  formData.append('base64Image', `data:${mimeType};base64,${base64}`)

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  })

  onProgress?.(0.9)

  if (!response.ok) throw new Error(`OCR.space API error: ${response.status}`)

  const json = await response.json()

  if (json.IsErroredOnProcessing) {
    throw new Error(`OCR.space error: ${json.ErrorMessage?.[0] ?? 'Unknown error'}`)
  }

  const text = json.ParsedResults
    ?.map((r: any) => r.ParsedText)
    .join('\n')
    .trim()

  onProgress?.(1)
  return text || '[No text found]'
}
