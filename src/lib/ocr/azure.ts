export async function runAzureOCR(
  imageData: string,
  apiKey: string,
  endpoint: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  onProgress?.(0.1)

  const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData
  const mimeType = imageData.startsWith('data:')
    ? imageData.split(';')[0].split(':')[1]
    : 'image/png'

  const byteChars = atob(base64)
  const byteArr = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i)
  const blob = new Blob([byteArr], { type: mimeType })

  const baseUrl = endpoint.endsWith('/') ? endpoint : endpoint + '/'
  const analyzeUrl = `${baseUrl}vision/v3.2/read/analyze`

  const submitResp = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': mimeType,
    },
    body: blob,
  })

  if (!submitResp.ok) throw new Error(`Azure OCR submit error: ${submitResp.status}`)

  const operationUrl = submitResp.headers.get('Operation-Location')
  if (!operationUrl) throw new Error('Azure OCR: no operation URL returned')

  onProgress?.(0.3)

  let result: any = null
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(r => setTimeout(r, 500))
    const pollResp = await fetch(operationUrl, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    })
    result = await pollResp.json()
    onProgress?.(0.3 + attempt * 0.03)
    if (result.status === 'succeeded') break
    if (result.status === 'failed') throw new Error('Azure OCR analysis failed')
  }

  const lines = result?.analyzeResult?.readResults
    ?.flatMap((page: any) => page.lines?.map((l: any) => l.text) ?? [])
    ?? []

  onProgress?.(1)
  return lines.join('\n').trim() || '[No text found]'
}
