import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Scene4Ecosystem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enterOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const titleScale = spring({ frame: frame - 15, fps, config: { damping: 14 } });
  
  const box1Opacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });
  const box1Scale = spring({ frame: frame - 40, fps, config: { damping: 12 } });

  const box2Opacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" });
  const box2Scale = spring({ frame: frame - 60, fps, config: { damping: 12 } });

  const box3Opacity = interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" });
  const box3Scale = spring({ frame: frame - 80, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill className="items-center justify-center bg-amber-950" style={{ opacity: enterOpacity * exitOpacity }}>
      
      {/* African pattern inspired background */}
      <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0yMCAwbDIwIDIwLTIwIDIwTDAgMjB6IiBmaWxsPSIjZjU5ZTBiIiBmaWxsLW9wYWNpdHk9IjAuNCIgLz4KPC9zdmc+')]"></div>

      <div className="z-10 flex flex-col items-center max-w-6xl w-full px-8">
        <h2 
          className="text-6xl font-bold text-amber-500 mb-20 uppercase tracking-widest text-center"
          style={{ transform: `scale(${titleScale})` }}
        >
          L'Écosystème Africain
        </h2>

        <div className="grid grid-cols-3 gap-8 w-full">
          
          <div 
            className="flex flex-col items-center bg-amber-900/50 p-10 rounded-2xl border-2 border-amber-600/50 shadow-2xl"
            style={{ opacity: box1Opacity, transform: `scale(${box1Scale})` }}
          >
            <div className="w-24 h-24 mb-6 rounded-full bg-amber-500 flex items-center justify-center">
              <span className="text-4xl">📱</span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-4 text-center">Mobile Money</h3>
            <p className="text-lg text-amber-200 text-center">Intégration native pour les paiements locaux fluides.</p>
          </div>

          <div 
            className="flex flex-col items-center bg-amber-900/50 p-10 rounded-2xl border-2 border-amber-600/50 shadow-2xl"
            style={{ opacity: box2Opacity, transform: `scale(${box2Scale})` }}
          >
            <div className="w-24 h-24 mb-6 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-4xl">💳</span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-4 text-center">FedaPay</h3>
            <p className="text-lg text-amber-200 text-center">Passerelle sécurisée, webhooks signés par HMAC SHA-256.</p>
          </div>

          <div 
            className="flex flex-col items-center bg-amber-900/50 p-10 rounded-2xl border-2 border-amber-600/50 shadow-2xl"
            style={{ opacity: box3Opacity, transform: `scale(${box3Scale})` }}
          >
            <div className="w-24 h-24 mb-6 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-4xl">📦</span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-4 text-center">Temps Réel</h3>
            <p className="text-lg text-amber-200 text-center">Gestion des stocks et vitrines marchandes instantanées.</p>
          </div>

        </div>
      </div>
    </AbsoluteFill>
  );
};
