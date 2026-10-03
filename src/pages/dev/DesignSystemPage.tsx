import { useState, type ReactNode } from "react";
import {
  ART_NAMES,
  Avatar,
  Button,
  Chip,
  ColorPicker,
  ColorPickerPopover,
  Dialog,
  DialogBody,
  Divider,
  EmptyState,
  Icon,
  ICONS,
  Paper,
  Reel,
  Scribble,
  Skeleton,
  Slider,
  Sticker,
  Tape,
  TextField,
  ToastNote,
  ToggleGroup,
  Tooltip,
  Typing,
  Wordmark,
  useToast,
  type IconName,
} from "@/components/ui";
import { USER_COLORS } from "@/paper/pattern";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <div className="zf-kicker">Primitive</div>
      <h2 className="zf-h1" style={{ margin: "4px 0 18px" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

const Row = ({ children, gap = 16 }: { children: ReactNode; gap?: number }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap, alignItems: "center" }}>
    {children}
  </div>
);

/**
 * Dev-only gallery (route /dev/design-system): every primitive in every state, mirroring
 * design-system/components/*\/preview.html. Not included in production builds.
 */
export default function DesignSystemPage() {
  const toast = useToast();
  const [mode, setMode] = useState("select");
  const [slider, setSlider] = useState(40);
  const [colour, setColour] = useState("sheet-50");
  const [open, setOpen] = useState(false);

  return (
    <main className="zf-page" id="main">
      <div className="zf-kicker">No. 00 · Design system</div>
      <h1 className="zf-display" style={{ margin: "6px 0 28px" }}>
        Zoofus components
      </h1>

      <Section title="Wordmark and type">
        <Row gap={32}>
          <Wordmark />
          <span className="zf-display">Display 44</span>
          <span className="zf-h1">Heading 30</span>
          <span className="zf-h2">Heading 22</span>
          <span className="zf-label">Label 15</span>
          <span className="zf-kicker">Kicker · No. 02</span>
        </Row>
        <p>Body 16 in Courier Prime. 中文使用小赖字体,等宽,和打字机的节奏接近。</p>
      </Section>

      <Section title="Paper tones and tears">
        <Row gap={24}>
          {(["xs", "sm", "md", "lg", "xl"] as const).map((size, i) => (
            <Paper
              key={size}
              seed={"dev-paper-" + size}
              size={size}
              tone={["scrap", "scrap-warm", "scrap-cool", "scrap-pink", "sheet-50"][i]}
              rotate={1.5}
              faceStyle={{ padding: 22, minWidth: 110 }}
            >
              <span className="zf-label">{size}</span>
            </Paper>
          ))}
        </Row>
      </Section>

      <Section title="Buttons">
        <Row>
          <Button variant="primary" seed="dp1">
            Primary
          </Button>
          <Button variant="secondary" seed="dp2">
            Secondary
          </Button>
          <Button variant="quiet" seed="dp3">
            Quiet
          </Button>
          <Button variant="danger" seed="dp4">
            Danger
          </Button>
          <Button variant="primary" seed="dp5" disabled>
            Disabled
          </Button>
          <Button variant="primary" seed="dp6" loading>
            Saving
          </Button>
        </Row>
        <div style={{ height: 16 }} />
        <Row>
          <Button size="sm" variant="secondary" seed="dp7">
            Small
          </Button>
          <Button size="md" variant="secondary" seed="dp8" icon="download">
            Medium
          </Button>
          <Button size="lg" variant="primary" seed="dp9" icon="upload">
            Large
          </Button>
          <Button variant="secondary" seed="dp10" state="hover">
            Hover
          </Button>
          <Button variant="secondary" seed="dp11" state="active">
            Active
          </Button>
          <Button variant="secondary" seed="dp12" state="focus">
            Focus
          </Button>
        </Row>
      </Section>

      <Section title="Chips and toggle group">
        <Row>
          <Chip seed="c1">Unselected</Chip>
          <Chip seed="c2" selected>
            Selected
          </Chip>
          <Chip seed="c3" disabled>
            Disabled
          </Chip>
          <ToggleGroup
            label="Mode"
            seed="dev-mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "select", label: "Select", icon: "plus" },
              { value: "deselect", label: "Deselect", icon: "minus" },
            ]}
          />
        </Row>
      </Section>

      <Section title="Text field">
        <div style={{ display: "grid", gap: 18, maxWidth: 380 }}>
          <TextField
            label="Email"
            defaultValue="mei@example.com"
            seed="tf1"
            hint="We never share it."
          />
          <TextField
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            seed="tf2"
            state="focus"
          />
          <TextField
            label="Nickname · 昵称"
            seed="tf3"
            error="Pick a name between 1 and 40 characters."
            defaultValue=""
          />
          <TextField label="Disabled" seed="tf4" disabled defaultValue="Locked" />
        </div>
      </Section>

      <Section title="Slider and colour picker">
        <div style={{ display: "grid", gap: 24, maxWidth: 380 }}>
          <Slider
            label="Edge width"
            value={slider}
            onChange={setSlider}
            unit=" px"
            seed="dev-slider"
          />
          <ColorPicker value={colour} onChange={setColour} label="Border colour" />
          <ColorPicker
            value="plum-900"
            onChange={() => {}}
            colors={USER_COLORS}
            columns={8}
            label="Ink colour"
          />
          <ColorPickerPopover value={colour} onChange={setColour} />
        </div>
      </Section>

      <Section title="Tape (decorative; at most about six per viewport)">
        <Paper
          seed="dev-tape-card"
          size="md"
          tone="scrap"
          rotate={1}
          faceStyle={{ padding: "34px 24px", minWidth: 340 }}
          tape={
            <>
              <Tape seed="t1" x="12%" y="4px" color="tape-mustard" />
              <Tape seed="t2" x="50%" y="2px" color="tape-celery" />
              <Tape seed="t3" x="88%" y="4px" color="tape-pink" />
            </>
          }
        >
          <span className="zf-label">Held down with tape</span>
        </Paper>
        <div style={{ height: 24 }} />
        <Row gap={32}>
          {(["torn", "cut", "pinked"] as const).map((ends) => (
            <div key={ends} style={{ position: "relative", width: 150, height: 40 }}>
              <Tape
                seed={"te" + ends}
                ends={ends}
                length={130}
                thickness={22}
                angle={-8}
                color="tape-pink"
                x="50%"
                y="50%"
              />
            </div>
          ))}
        </Row>
      </Section>

      <Section title="Lines">
        <div style={{ maxWidth: 380 }}>
          <Scribble seed="s1" />
          <Scribble seed="s2" variant="wave" />
          <Divider seed="d1" />
        </div>
      </Section>

      <Section title="Dialog, toast, tooltip">
        <Row>
          <Button variant="primary" seed="dlg" onClick={() => setOpen(true)}>
            Open dialog
          </Button>
          <Button
            seed="ts"
            onClick={() =>
              toast.push({
                kind: "success",
                title: "Saved to your book",
                body: "Find it under My sticker book.",
              })
            }
          >
            Success toast
          </Button>
          <Button
            seed="te"
            onClick={() =>
              toast.push({
                kind: "error",
                title: "That didn’t work",
                body: "Try again in a moment.",
              })
            }
          >
            Error toast
          </Button>
          <Tooltip label="Undo (⌘Z)">
            <Button variant="quiet" seed="tt" icon="undo">
              Hover me
            </Button>
          </Tooltip>
        </Row>
        <div style={{ height: 20 }} />
        <Row>
          <ToastNote kind="success" title="Saved to your book" seed="dev-t1" />
          <ToastNote
            kind="error"
            title="That didn’t work"
            body="Email or password is wrong."
            seed="dev-t2"
          />
        </Row>
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="Reset your password"
          kicker="Forgot it?"
          width={420}
          seed="dev-dialog"
          actions={
            <>
              <Button variant="quiet" seed="dc" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" seed="ds" onClick={() => setOpen(false)}>
                Send link
              </Button>
            </>
          }
        >
          <DialogBody>We’ll email you a link. It works for 30 minutes.</DialogBody>
          <div style={{ marginBottom: 20 }}>
            <TextField label="Email" seed="dev-reset" defaultValue="mei@example.com" />
          </div>
        </Dialog>
      </Section>

      <Section title="Avatar, loaders, empty state">
        <Row gap={28}>
          <Avatar name="Mei" size={40} asStatic />
          <Avatar size={72} asStatic />
          <Avatar name="Mei" size={34} state="focus" />
          <Typing label="Saving" />
          <Reel label="Opening photo" />
          <Skeleton seed="dev-sk" width={120} height={120} />
        </Row>
        <div style={{ height: 28 }} />
        <EmptyState
          seed="dev-empty"
          kicker="Nothing here yet"
          title="Your book is empty"
          art={<Sticker art="star" size={70} />}
          action={
            <Button variant="primary" seed="eu" icon="upload">
              Make your first sticker
            </Button>
          }
        >
          Stickers you cut out land here. Rename them, reuse them, or download them again.
        </EmptyState>
      </Section>

      <Section title="Stickers: edge shapes">
        <Row gap={28}>
          {(["smooth", "wobbly", "torn"] as const).map((shape) => (
            <div key={shape} style={{ textAlign: "center" }}>
              <Sticker
                art="pear"
                size={130}
                rotate={0}
                seed={"dev-" + shape}
                edge={{ shape, scale: 1, fill: { kind: "solid", bg: "sheet-50" } }}
              />
              <div className="zf-tile__meta">{shape}</div>
            </div>
          ))}
          {ART_NAMES.map((a) => (
            <Sticker key={a} art={a} size={92} />
          ))}
        </Row>
      </Section>

      <Section title="Icons">
        <Row gap={20}>
          {(Object.keys(ICONS) as IconName[]).map((n) => (
            <span key={n} title={n}>
              <Icon name={n} style={{ width: 24, height: 24 }} />
            </span>
          ))}
        </Row>
      </Section>
    </main>
  );
}
