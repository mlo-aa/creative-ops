"use client";

import { BodyText, DisplayText } from "@/core/canvas/Type";
import { Lines, PlacedLogo } from "@/core/editor/placement";
import { EditableBlock } from "@/core/editor/EditableBlock";
import { useBrand } from "@/core/project/context";
import type { PostRenderProps } from "@/core/types";

export function SendaProductValue({
  design,
  editing,
  exporting,
  onDesignChange,
}: PostRenderProps) {
  const { hex, safe, project } = useBrand();
  const ui = project.assets.find((asset) => asset.id === "receipt")?.src;
  return (
    <>
      <PlacedLogo
        design={design}
        editing={editing}
        exporting={exporting}
        onDesignChange={onDesignChange}
        height={48}
      />
      <EditableBlock
        editing={editing}
        exporting={exporting}
        x={design.headlineX}
        y={design.headlineY}
        onChange={(headlineX, headlineY) => onDesignChange?.({ headlineX, headlineY })}
        style={{ position: "absolute", top: 200, left: safe, right: safe }}
      >
        <DisplayText color={hex(design.text)} size={86}>
          <Lines text={design.headline} />
        </DisplayText>
        <div style={{ marginTop: 40, maxWidth: 640 }}>
          <BodyText color={hex(design.text)} size={28} opacity={0.72}>
            <Lines text={design.supporting} />
          </BodyText>
        </div>
      </EditableBlock>
      <div
        style={{
          position: "absolute",
          left: safe,
          right: safe,
          bottom: safe,
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 18,
        }}
      >
        <div style={{ border: `1px solid ${hex("stone")}`, background: hex("cream"), padding: "28px 30px 26px" }}>
          <p style={{ margin: 0, fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", color: hex("forest"), opacity: 0.6 }}>
            Program
          </p>
          <p style={{ margin: "10px 0 0", fontSize: 28, letterSpacing: "-0.02em", color: hex("forest") }}>
            Education Program
          </p>
          <p style={{ margin: "22px 0 0", fontSize: 22, color: hex("charcoal"), opacity: 0.7 }}>
            Connected funding, expenses and evidence
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {["Materials", "Transportation", "Field operations"].map((label) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${hex("stone")}`, padding: "14px 16px", color: hex("forest") }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: hex("lime") }} />
              {label}
            </div>
          ))}
          {ui ? (
            <div style={{ border: `1px solid ${hex("stone")}`, display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
              <img src={ui} alt="" width={72} height={56} style={{ width: 72, height: 56, objectFit: "cover" }} />
              <div>
                <p style={{ margin: 0, fontSize: 14, color: hex("forest") }}>Receipt</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: hex("charcoal"), opacity: 0.55 }}>Evidence attached</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
