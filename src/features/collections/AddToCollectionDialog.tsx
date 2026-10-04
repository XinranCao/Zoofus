import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { MAX_COLLECTION_NAME, type CollectionItem } from "./collection.schema";
import {
  useAddToCollection,
  useCollections,
  useCreateCollection,
} from "./useCollections";

/** Put the picked things into one of your collections, or into a new one. */
export function AddToCollectionDialog({
  open,
  items,
  onClose,
  onDone,
}: {
  open: boolean;
  items: CollectionItem[];
  onClose: () => void;
  onDone?: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: collections = [] } = useCollections();
  const add = useAddToCollection();
  const create = useCreateCollection();
  const [name, setName] = useState("");

  const finish = (collectionName: string) => {
    toast.push({
      kind: "success",
      title: t("collections.added", { count: items.length, name: collectionName }),
    });
    setName("");
    onClose();
    onDone?.();
  };
  const fail = () =>
    toast.push({
      kind: "error",
      title: t("auth.errors.toastTitle"),
      body: t("collections.failed"),
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width={460}
      seed="add-to-collection"
      tapes={1}
      title={t("collections.addTitle", { count: items.length })}
    >
      <div style={{ display: "grid", gap: 14, margin: "10px 0 6px" }}>
        {collections.length > 0 && (
          <ul className="zf-pick-list">
            {collections.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="zf-menu__item"
                  disabled={add.isPending}
                  onClick={() =>
                    add.mutate(
                      { id: c.id, items },
                      { onSuccess: () => finish(c.name), onError: fail },
                    )
                  }
                >
                  <Icon name="folder" />
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span className="zf-muted" style={{ fontSize: 13 }}>
                    {c.items.length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (!n) return;
            create.mutate(
              { name: n, items, existing: collections.length },
              { onSuccess: () => finish(n), onError: fail },
            );
          }}
          style={{ display: "grid", gap: 12 }}
        >
          <TextField
            label={t("collections.newName")}
            seed="newcol"
            value={name}
            maxLength={MAX_COLLECTION_NAME}
            placeholder={t("collections.namePlaceholder")}
            onChange={(e) => setName(e.target.value)}
          />
          <div>
            <Button
              variant="primary"
              type="submit"
              icon="plus"
              seed="newcol-go"
              disabled={!name.trim()}
              loading={create.isPending}
            >
              {t("collections.createAndAdd")}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
