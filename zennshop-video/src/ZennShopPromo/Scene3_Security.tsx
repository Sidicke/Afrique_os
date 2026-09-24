import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Scene3Security: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enterOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const titleScale = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  
  const shieldScale = spring({ frame: frame - 40, fps, config: { damping: 10 } });

  const feature1Opacity = interpolate(frame, [60, 75], [0, 1], { extrapolateRight: "clamp" });
  const feature1Translate = interpolate(frame, [60, 75], [20, 0], { extrapolateRight: "clamp" });
  
  const feature2Opacity = interpolate(frame, [80, 95], [0, 1], { extrapolateRight: "clamp" });
  const feature2Translate = interpolate(frame, [80, 95], [20, 0], { extrapolateRight: "clamp" });

  const scoreOpacity = interpolate(frame, [110, 130], [0, 1], { extrapolateRight: "clamp" });
  const scoreScale = spring({ frame: frame - 110, fps, config: { damping: 12 } });
  const scoreValue = interpolate(frame, [110, 150], [0, 99.8], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill className="items-center justify-center bg-zinc-950" style={{ opacity: enterOpacity * exitOpacity }}>
      
      {/* Background Matrix-like lines */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(255,0,0,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,0,0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      <div className="z-10 flex flex-col items-center max-w-5xl text-center">
        <h2 
          className="text-6xl font-bold text-rose-500 mb-12 uppercase tracking-widest"
          style={{ transform: `scale(${titleScale})` }}
        >
          Sécurité Infaillible
        </h2>

        <div className="flex w-full items-center justify-between gap-12">
          <div className="flex-1 flex flex-col gap-8 text-left">
            <div style={{ opacity: feature1Opacity, transform: `translateY(${feature1Translate}px)` }} className="bg-zinc-900/80 p-6 border-l-4 border-rose-500 rounded-r-lg">
              <h3 className="text-3xl font-bold text-white mb-2">Chiffrement AES-256-GCM</h3>
              <p className="text-xl text-zinc-400">Messagerie protégée de bout en bout. Zéro message en clair.</p>
            </div>
            
            <div style={{ opacity: feature2Opacity, transform: `translateY(${feature2Translate}px)` }} className="bg-zinc-900/80 p-6 border-l-4 border-rose-500 rounded-r-lg">
              <h3 className="text-3xl font-bold text-white mb-2">Isolation Anti-BOLA & Anti-DDoS</h3>
              <p className="text-xl text-zinc-400">Transactions atomiques et gardes stricts sur chaque endpoint.</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Shield Icon or Score */}
            <div 
              className="relative flex items-center justify-center w-64 h-64 rounded-full border-4 border-rose-600 bg-zinc-900 shadow-[0_0_50px_rgba(225,29,72,0.4)]"
              style={{ transform: `scale(${shieldScale})` }}
            >
              <div style={{ opacity: scoreOpacity, transform: `scale(${scoreScale})` }} className="flex flex-col items-center">
                <span className="text-7xl font-black text-white">{scoreValue.toFixed(1)}</span>
                <span className="text-xl text-rose-400 mt-2 font-bold uppercase tracking-widest">Score Audit</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </AbsoluteFill>
  );
};
