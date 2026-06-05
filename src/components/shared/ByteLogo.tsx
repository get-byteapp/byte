import { useEffect, useRef } from 'react'
import iconSvg from '../../../icon.svg'

interface ByteLogoProps {
  size?: number
  className?: string
}

export function ByteLogo({ size = 20, className }: ByteLogoProps) {
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const updateColor = () => {
      if (!imgRef.current) return
      const logoColor = getComputedStyle(document.documentElement).getPropertyValue('--logo').trim()
      imgRef.current.style.filter = getColorFilter(logoColor)
    }

    updateColor()
    const observer = new MutationObserver(updateColor)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <img
      ref={imgRef}
      src={iconSvg}
      alt="Byte"
      className={className}
      style={{ width: size, height: size }}
    />
  )
}

function getColorFilter(hexColor: string): string {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  const hsl = rgbToHsl(r, g, b)
  const blueHue = 240
  const hueRotate = hsl.h - blueHue

  const brightness = hsl.l < 50 ? 0.8 : 1.2
  const saturation = hsl.s > 50 ? 1.2 : 0.8

  return `hue-rotate(${hueRotate}deg) saturate(${saturation}) brightness(${brightness})`
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}
