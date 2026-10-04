import { Icon } from "./Icon";

/**
 * The tick on a tile in bulk-select mode. Selected is lime with a check, not colour alone; the
 * mark is a small irregular scrap, never a round or square form control.
 */
export function SelectMark({ selected }: { selected: boolean }) {
  return (
    <span className={"zf-selmark" + (selected ? " is-on" : "")} aria-hidden="true">
      {selected && <Icon name="check" />}
    </span>
  );
}
