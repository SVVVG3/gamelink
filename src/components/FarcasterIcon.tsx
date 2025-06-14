interface FarcasterIconProps {
  className?: string
  size?: number
}

export default function FarcasterIcon({ className = "", size = 16 }: FarcasterIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1000 1000"
      fill="currentColor"
      className={className}
    >
      <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z"/>
      <path d="M128.889 253.333L157.778 351.111H182.222L211.111 253.333H128.889Z"/>
      <path d="M788.889 253.333L817.778 351.111H842.222L871.111 253.333H788.889Z"/>
    </svg>
  )
} 