import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Scene5Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  
  const titleScale = spring({ frame: frame - 20, fps, config: { damping: 14 } });
  
  const subtitleOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });
  const subtitleTranslate = interpolate(frame, [50, 70], [30, 0], { extrapolateRight: "clamp" });

  const btnOpacity = interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" });
  const btnScale = spring({ frame: frame - 80, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill className="items-center justify-center bg-gradient-to-tr from-blue-900 via-black to-slate-900" style={{ opacity: enterOpacity }}>
      
      <div className="flex flex-col items-center z-10">
        <h2 
          className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 drop-shadow-2xl text-center mb-8"
          style={{ transform: `scale(${titleScale})` }}
        >
          Prêt à Propulser<br/>Votre Marketplace ?
        </h2>

        <p 
          className="text-3xl text-blue-200 font-light tracking-wide mb-16"
          style={{ opacity: subtitleOpacity, transform: `translateY(${subtitleTranslate}px)` }}
        >
          Découvrez ZennShop v2 dès aujourd'hui.
        </p>

        <div 
          className="px-12 py-6 bg-blue-600 rounded-full shadow-[0_0_40px_rgba(37,99,235,0.6)]"
          style={{ opacity: btnOpacity, transform: `scale(${btnScale})` }}
        >
          <span className="text-3xl font-bold text-white uppercase tracking-widest">
            Lancer le Déploiement
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
