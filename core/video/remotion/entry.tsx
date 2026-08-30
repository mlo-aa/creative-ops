import { registerRoot } from "remotion";
import { Composition } from "remotion";
import {
  VideoDocumentComposition,
  videoCompositionMeta,
} from "./VideoDocumentRenderer";
import type { VideoDocument } from "../document";
import { blankReelDocument } from "../document";

const defaultDoc = blankReelDocument("seed", "Preview");

registerRoot(() => {
  const meta = videoCompositionMeta(defaultDoc);
  return (
    <>
      <Composition
        id="VideoDocument"
        component={VideoDocumentComposition}
        durationInFrames={meta.durationInFrames}
        fps={meta.fps}
        width={meta.width}
        height={meta.height}
        defaultProps={{ document: defaultDoc as VideoDocument }}
      />
    </>
  );
});
