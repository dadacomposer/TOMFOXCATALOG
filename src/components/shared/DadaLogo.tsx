export function DadaLogo({ color = 'currentColor', className = '', style }: { color?: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="28" height="28" viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id="wavy-mask-dada-logo">
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <path d="M 10 -2 C 13 4, 7 10, 10 16 C 13 22, 9 24, 10 26" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 15 -2 C 18 4, 12 10, 15 16 C 18 22, 14 24, 15 26" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 20 -2 C 23 4, 17 10, 20 16 C 23 22, 19 24, 20 26" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </mask>
      </defs>
      <circle cx="12" cy="12" r="12" mask="url(#wavy-mask-dada-logo)" />
    </svg>
  );
}
