import React from "react";
import { Composition, registerRoot } from "remotion";
import { ByteBuildsVideo } from "./ByteBuildsVideo";

const RemotionRoot = () => {
  return (
    <Composition
      id="ByteBuildsVideo"
      component={ByteBuildsVideo}
      durationInFrames={1180}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

registerRoot(RemotionRoot);
