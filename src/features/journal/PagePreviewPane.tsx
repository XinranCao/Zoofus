import { Paper } from "@/components/ui/Paper";
import type { PageSpec } from "./journal.schema";
import { PaperPreview } from "./PageSetup";

/** The paper on a scrap of the ground, as it will look. */
export function PagePreviewPane({ page }: { page: PageSpec }) {
  const w = 200;
  const h = Math.round((w * page.height) / page.width);
  return (
    <div className="zf-newjournal__preview" aria-hidden="true">
      <Paper
        seed="njprev"
        size="sm"
        tone="sheet-50"
        rotate={1}
        w={w}
        h={h}
        faceStyle={{ padding: 6 }}
      >
        <PaperPreview page={page} width={w} />
      </Paper>
    </div>
  );
}
