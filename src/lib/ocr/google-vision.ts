export async function runGoogleVisionOCR(
  imageData: string,
  apiKey: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  onProgress?.(0.1)

  const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData

  const body = {
    requests: [{
      image: { content: base64 },
      features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
    }],
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )

  onProgress?.(0.9)

  if (!response.ok) throw new Error(`Google Vision API error: ${response.status}`)

  const json = await response.json()

  if (json.error) throw new Error(`Google Vision error: ${json.error.message}`)

  const text = json.responses?.[0]?.fullTextAnnotation?.text?.trim()

  onProgress?.(1)
  return text || '[No text found]'
}
