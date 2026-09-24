import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Scene2Performance: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enterOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const titleScale = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  
  // Counter animation
  const reqCount = Math.floor(interpolate(frame, [40, 90], [0, 345], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }));
  const userCount = Math.floor(interpolate(frame, [50, 100], [0, 3500], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }));

  const stat1Opacity = interpolate(frame, [40, 50], [0, 1], { extrapolateRight: "clamp" });
  const stat2Opacity = interpolate(frame, [50, 60], [0, 1], { extrapolateRight: "clamp" });
  const stat3Opacity = interpolate(frame, [80, 90], [0, 1], { extrapolateRight: "clamp" });
  const stat3Translate = interpolate(frame, [80, 100], [20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill className="items-center justify-center bg-black" style={{ opacity: enterOpacity * exitOpacity }}>
      
      {/* Background decoration */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20">
        <div className="w-[800px] h-[800px] rounded-full border-[1px] border-emerald-500 animate-[spin_10s_linear_infinite] border-dashed"></div>
        <div className="absolute w-[600px] h-[600px] rounded-full border-[2px] border-teal-500 animate-[spin_8s_linear_infinite_reverse]"></div>
      </div>

      <div className="z-10 flex flex-col items-center">
        <h2 
          className="text-6xl font-bold text-emerald-400 mb-16 uppercase tracking-widest"
          style={{ transform: `scale(${titleScale})` }}
        >
          Haute Performance
        </h2>

        <div className="flex gap-16 text-center">
          <div className="flex flex-col items-center" style={{ opacity: stat1Opacity }}>
            <span className="text-8xl font-black text-white">{reqCount}</span>
            <span className="text-2xl text-emerald-300 mt-2">Requêtes / Seconde</span>
          </div>

          <div className="flex flex-col items-center" style={{ opacity: stat2Opacity }}>
            <span className="text-8xl font-black text-white">{userCount.toLocaleString('fr-FR')}</span>
            <span className="text-2xl text-teal-300 mt-2">Utilisateurs Actifs</span>
          </div>
        </div>

        <div 
          className="mt-16 bg-emerald-900/40 border border-emerald-500/50 px-8 py-4 rounded-xl"
          style={{ opacity: stat3Opacity, transform: `translateY(${stat3Translate}px)` }}
        >
          <p className="text-3xl text-emerald-100">
            Empreinte Mémoire <span className="font-bold text-emerald-400">&lt; 150 MB</span>
          </p>
        </div>

      </div>
    </AbsoluteFill>
  );
};
