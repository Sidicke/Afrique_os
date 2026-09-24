import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import { Scene1Intro } from "./Scene1_Intro";
import { Scene2Performance } from "./Scene2_Performance";
import { Scene3Security } from "./Scene3_Security";
import { Scene4Ecosystem } from "./Scene4_Ecosystem";
import { Scene5Outro } from "./Scene5_Outro";

export const Main: React.FC = () => {
  return (
    <AbsoluteFill className="bg-black text-white">
      {/* 
        We could add a background track here if we had one:
        <Audio src={staticFile("bgm.mp3")} volume={0.5} /> 
      */}

      <Sequence from={0} durationInFrames={180}>
        <Scene1Intro />
      </Sequence>

      <Sequence from={150} durationInFrames={210}>
        <Scene2Performance />
      </Sequence>

      <Sequence from={330} durationInFrames={240}>
        <Scene3Security />
      </Sequence>

      <Sequence from={540} durationInFrames={210}>
        <Scene4Ecosystem />
      </Sequence>

      <Sequence from={720} durationInFrames={180}>
        <Scene5Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
