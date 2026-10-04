import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Paper } from "@/components/ui/Paper";
import { PatternEditor } from "@/components/ui/PatternEditor";
import { Slider } from "@/components/ui/Slider";
import { Tape } from "@/components/ui/Tape";
import { TextField } from "@/components/ui/TextField";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { tornVars } from "@/paper/torn";
import type { PatternSpec } from "@/paper/pattern";
import {
  TAPE_ENDS,
  TAPE_LIMITS,
  MAX_TAPE_NAME,
  angleFromPointer,
  clampAngle,
  type TapeEnds,
} from "./tape.schema";

const STAGE_TOP = 70;

/** The tape a user is designing: everything except the saved name. */
export interface TapeDraft {
  angle: number;
  length: number;
  thickness: number;
  /** 0.5-1 */
  opacity: number;
  ends: TapeEnds;
  pattern: PatternSpec;
}

export const DEFAULT_DRAFT: TapeDraft = {
  angle: -14,
  length: TAPE_LIMITS.length.default,
  thickness: TAPE_LIMITS.thickness.default,
  opacity: TAPE_LIMITS.opacity.default,
  ends: "torn",
  pattern: {
    kind: "pixels",
    bg: "blush-100",
    ink: "rose-400",
    scale: 10,
    angle: 0,
    weight: 0.4,
    pixels: [
      "00000000",
      "01100110",
      "11111111",
      "11111111",
      "01111110",
      "00111100",
      "00011000",
      "00000000",
    ],
  },
};

/**
 * The tape editor: turn, size, finish and print a tape, then add it to the collection. Drag the
 * round handle to any angle from −90 to 90°, or focus it and use the arrow keys (±5°).
 */
export function TapeStudio({
  draft,
  onDraft,
  defaultName,
  onAdd,
  adding,
}: {
  draft: TapeDraft;
  onDraft: (patch: Partial<TapeDraft>) => void;
  /** The suggested name, shown as the placeholder. */
  defaultName: string;
  onAdd: (name: string) => void;
  adding: boolean;
}) {
  const { t } = useTranslation();
  const stage = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [name, setName] = useState("");

  const rad = (draft.angle * Math.PI) / 180;
  const reach = draft.length / 2 + 14;
  const handleX = Math.cos(rad) * reach;
  const handleY = Math.sin(rad) * reach;

  const turn = (e: React.PointerEvent) => {
    if (!dragging.current || !stage.current) return;
    const b = stage.current.getBoundingClientRect();
    onDraft({
      angle: angleFromPointer(
        e.clientX - (b.left + b.width / 2),
        e.clientY - (b.top + STAGE_TOP),
      ),
    });
  };

  return (
    <div className="zf-studio">
      <div style={{ display: "grid", gap: 24, alignContent: "start", minWidth: 0 }}>
        <div
          ref={stage}
          className="zf-studio__stage zf-ground"
          role="group"
          aria-label={t("tape.stage")}
          onPointerMove={turn}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          <Paper
            seed="ts-scrap"
            size="md"
            tone="scrap-warm"
            rotate={1.4}
            style={{ width: "64%", margin: `${STAGE_TOP}px auto 0` }}
            faceStyle={{ height: 170, padding: "34px 22px 22px" }}
          >
            <div className="zf-h2">{t("tape.stageTitle")}</div>
          </Paper>
          <div
            data-user-tape
            style={{ position: "absolute", left: "50%", top: STAGE_TOP }}
          >
            <Tape
              pattern={draft.pattern}
              angle={draft.angle}
              length={draft.length}
              thickness={draft.thickness}
              opacity={draft.opacity}
              ends={draft.ends}
              x="0"
              y="0"
              seed={"ts" + draft.ends}
            />
            <div
              role="slider"
              tabIndex={0}
              aria-label={t("tape.turn", { angle: draft.angle })}
              aria-valuemin={TAPE_LIMITS.angle.min}
              aria-valuemax={TAPE_LIMITS.angle.max}
              aria-valuenow={draft.angle}
              className="zf-turn-handle zf-torn"
              style={{
                left: handleX,
                top: handleY,
                ...tornVars("turn-handle", {
                  size: "xs",
                  w: 32,
                  h: 32,
                  amp: 1.6,
                  res: 2,
                }),
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                dragging.current = true;
                stage.current?.setPointerCapture?.(e.pointerId);
              }}
              onKeyDown={(e) => {
                const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[
                  e.key
                ];
                if (step !== undefined) {
                  e.preventDefault();
                  onDraft({ angle: clampAngle(draft.angle + step) });
                }
                if (e.key === "Home") onDraft({ angle: TAPE_LIMITS.angle.min });
                if (e.key === "End") onDraft({ angle: TAPE_LIMITS.angle.max });
              }}
            >
              <span className="zf-face">
                <Icon name="turn" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="zf-studio__controls">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 18,
          }}
        >
          <Slider
            label={t("tape.length")}
            value={draft.length}
            min={TAPE_LIMITS.length.min}
            max={TAPE_LIMITS.length.max}
            unit=" px"
            seed="tl"
            onChange={(length) => onDraft({ length })}
          />
          <Slider
            label={t("tape.width")}
            value={draft.thickness}
            min={TAPE_LIMITS.thickness.min}
            max={TAPE_LIMITS.thickness.max}
            unit=" px"
            seed="tw"
            onChange={(thickness) => onDraft({ thickness })}
          />
          <Slider
            label={t("tape.seeThrough")}
            value={Math.round((1 - draft.opacity) * 100)}
            min={0}
            max={50}
            unit="%"
            seed="to"
            onChange={(v) => onDraft({ opacity: 1 - v / 100 })}
          />
        </div>
        <div>
          <div className="zf-label" style={{ marginBottom: 8 }}>
            {t("tape.ends")}
          </div>
          <ToggleGroup<TapeEnds>
            label={t("tape.endsLabel")}
            seed="te"
            value={draft.ends}
            options={TAPE_ENDS.map((e) => ({
              value: e,
              label: t(`tape.endsOptions.${e}`),
            }))}
            onChange={(ends) => onDraft({ ends })}
          />
        </div>
        <PatternEditor
          label={t("tape.print")}
          seed="tp"
          value={draft.pattern}
          onChange={(pattern) => onDraft({ pattern })}
        />
        <TextField
          label={t("tape.name")}
          value={name}
          placeholder={defaultName}
          maxLength={MAX_TAPE_NAME}
          seed="tname"
          onChange={(e) => setName(e.target.value)}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button
            variant="primary"
            icon="plus"
            seed="tsave"
            loading={adding}
            onClick={() => {
              onAdd(name.trim() || defaultName);
              setName("");
            }}
          >
            {adding ? t("tape.adding") : t("tape.add")}
          </Button>
        </div>
      </div>
    </div>
  );
}
