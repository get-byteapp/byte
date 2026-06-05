import iconSvg from '../../../icon.svg'

interface ByteLogoProps {
  size?: number
  className?: string
}

export function ByteLogo({ size = 20, className }: ByteLogoProps) {
  return (
    <div
      className={className}
      role="img"
      aria-label="Byte"
      style={{
        width: size,
        height: size,
        backgroundColor: 'var(--logo)',
        maskImage: `url(${iconSvg})`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskImage: `url(${iconSvg})`,
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}
