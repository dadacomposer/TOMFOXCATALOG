import { siGoogle, siAnthropic, siNike, siAdidas, siNewyorktimes } from 'simple-icons';

const VOX_OFFICIAL_PATH = "M54.9.8h1.7l.2-.8H35.4l-.2.8h3.1c2.7 0 4.9 1.9 4.9 5.6 0 2.1-.9 4.8-2.4 8.1L26.9 45.2 23.5 5.3C23.2 2.2 24.8.8 28.3.8h2l.2-.8H.3L0 .8h1.9c2.4 0 3.3 1.5 3.5 4.3l5.4 51.6h12.7l21.3-45.1C48.1 4.9 51.5.8 54.9.8zm-2.5 56.1c-1.9 0-3.1-.6-3.1-3.8 0-4 1.5-11.9 3.1-19.1.2 3.3 2.5 6.6 5.9 6.6.8 0 1.5-.1 2.2-.2-3.2 13.7-4.4 16.5-8.1 16.5zM113 29.8c4 0 6.6-3.3 6.6-7.1 0-3.2-2.3-5.6-5.6-5.6-5.9 0-8.7 4.7-13.6 13.3-1-5.4-3.5-12.4-9.7-12.4-7 0-15.1 10-22.5 16.2-3.4 2.9-7.1 4.7-10.1 4.7-3.1 0-4.9-3.1-4.9-8.6 2.2-9 3.3-11.3 6.7-11.3 2.3 0 3.3 1.3 3.3 4 0 2.9-.6 7.7-1.9 13.8 3.3-1 8.3-5.2 12.5-9.7-2.2-5.3-7-8.9-13.8-8.9-12.7 0-23.9 11.4-23.9 24.2 0 8.8 6.3 15.5 16.1 15.5 16.2 0 23-14 23-23.8 0-1.4-.1-2.4-.2-3.7 2.5-2.7 5.7-5.3 8.3-5.3 3 0 5.4 7.5 7.7 18.8-2.1 2.3-4.2 6.7-5.2 7.5-.4-4-3.1-6.5-6.6-6.5-4 0-6.7 3.8-6.7 7 0 3.6 2.5 6 5.8 6 6.9 0 8.8-6.5 13.1-12.3 1.3 6.2 4.4 12.3 9.7 12.3 6.3 0 12.1-5.4 15.1-9.2l-.6-.9c-1.9 1.9-3.8 3.1-6 3.1-3.9 0-6.7-8.4-8.8-18.6 1.3-1.7 3.3-6.1 4.7-7.7.9 1.8 2.9 5.2 7.5 5.2z";
const VOX_OFFICIAL_VIEWBOX = "-17.94 -14.475 155.48 86.85";

const LogoItem = ({ svgPath, name, textMode, label, imageUrl, viewBox }: { svgPath?: string, name: string, textMode?: boolean, label?: React.ReactNode, imageUrl?: string, viewBox?: string }) => {
  if (imageUrl) {
    return (
      <div className="flex items-center justify-center h-12 px-6">
        <img src={imageUrl} alt={name} className="h-8 md:h-10 w-auto opacity-40 brightness-0 invert pointer-events-none select-none" />
      </div>
    );
  }
  
  if (textMode || !svgPath) {
    return (
      <div className="flex items-center justify-center h-12 px-6">
        <span className="font-bold text-xl md:text-2xl tracking-tighter text-white/50 whitespace-nowrap cursor-default pointer-events-none">
          {label || name}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center h-12 px-6">
      <svg
        viewBox={viewBox || "0 0 24 24"}
        fill="currentColor"
        className="h-8 md:h-10 w-auto text-white/40 cursor-default pointer-events-none"
      >
        <path d={svgPath} />
      </svg>
    </div>
  );
};

const GOOGLE_G_PATH = "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09zM12 22.9c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 22.9 12 22.9zM5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62zM12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.37 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z";

export default function LogoTicker() {
  const logos = [
    { name: "Google", svgPath: GOOGLE_G_PATH },
    { name: "Vox", svgPath: VOX_OFFICIAL_PATH, viewBox: VOX_OFFICIAL_VIEWBOX },
    { name: "Nike", svgPath: siNike.path },
    { name: "Johnny Harris", textMode: true, label: <span className="text-base md:text-lg block"><span className="block text-center leading-[1]">Johnny</span><span className="block text-center leading-[1]">Harris</span></span> },
    { name: "Adidas", svgPath: siAdidas.path },
    { name: "Tunnel Vision", textMode: true, label: <span className="font-sans italic font-bold tracking-tight lowercase">tunnel_vision</span> },
    { name: "Anthropic", svgPath: siAnthropic.path },
    { name: "NY Times", svgPath: siNewyorktimes.path },
  ];

  return (
    <div className="w-full border-b-2 border-black/10 overflow-hidden flex bg-black py-10 select-none pointer-events-none full-bleed">
      <div className="flex whitespace-nowrap animate-marquee w-max">
        {/* Render the logos array multiple times for a seamless loop */}
        {[...Array(4)].map((_, groupIndex) => (
          <div key={groupIndex} className="flex items-center gap-32 px-16">
            {logos.map((logo, index) => (
              <LogoItem key={`${groupIndex}-${index}`} {...logo} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
