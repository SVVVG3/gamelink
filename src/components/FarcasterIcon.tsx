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
      <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333S337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z"/>
      <path d="M128.889 253.333L157.778 351.111H182.222V746.667C182.222 790.498 218.169 826.444 262 826.444H738C781.831 826.444 817.778 790.498 817.778 746.667V351.111H842.222L871.111 253.333H746.667V155.556C746.667 69.8 676.867 0 591.111 0H408.889C323.133 0 253.333 69.8 253.333 155.556V253.333H128.889Z"/>
    </svg>
  )
} 