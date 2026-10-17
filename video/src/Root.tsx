import React from "react";
import { Composition } from "remotion";
import { LastBuyVideo } from "./LastBuyVideo";
import timeline from "./timeline.json";

export const Root: React.FC = () => (
  <Composition
    id="LastBuy"
    component={LastBuyVideo}
    durationInFrames={timeline.durationInFrames}
    fps={timeline.fps}
    width={1920}
    height={1080}
  />
);
