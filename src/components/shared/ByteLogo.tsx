import iconSvg from '../../../icon.svg?url'

interface ByteLogoProps {
  size?: number
  className?: string
}

export function ByteLogo({ size = 20, className }: ByteLogoProps) {
  return (
    <img
      src={iconSvg}
      alt="Byte"
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
