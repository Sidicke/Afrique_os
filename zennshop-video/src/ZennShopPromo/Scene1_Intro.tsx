import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Scene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Entrance animations
  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const logoOpacity = interpolate(frame, [10, 20], [0, 1], { extrapolateRight: "clamp" });

  const textOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const textTranslate = interpolate(frame, [30, 50], [50, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Exit animations (from duration - 30 to duration)
  const exitOpacity = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill className="items-center justify-center bg-gradient-to-br from-indigo-950 via-black to-slate-900" style={{ opacity: exitOpacity }}>
      <div 
        className="flex flex-col items-center"
        style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity
        }}
      >
        <h1 className="text-8xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]">
          ZennShop <span className="text-blue-500">v2</span>
        </h1>
        
        <div 
          className="mt-8 overflow-hidden"
          style={{ opacity: textOpacity, transform: `translateY(${textTranslate}px)` }}
        >
          <p className="text-4xl font-light text-slate-300 tracking-wide uppercase">
            Le futur de l'E-commerce en Afrique
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
