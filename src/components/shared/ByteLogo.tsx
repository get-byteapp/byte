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
    window.addEventListener('change', updateColor)
    const observer = new MutationObserver(updateColor)
    observer.observe(document.documentElement, { attributes: true })

    return () => {
      window.removeEventListener('change', updateColor)
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
  const r = parseInt(hex.substr(0, 2), 16) / 255
  const g = parseInt(hex.substr(2, 2), 16) / 255
  const b = parseInt(hex.substr(4, 2), 16) / 255

  const h = Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI
  const hueRotate = h + 210

  return `hue-rotate(${hueRotate}deg) saturate(1.5) brightness(${Math.max(r, g, b) > 0.5 ? 0.9 : 1.1})`
}
