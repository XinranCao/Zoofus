# Data model

All paths are Firestore unless marked _Storage_. Reads are validated with zod and are lenient (older documents still load).

## Per user: `users/{uid}`

| Path                                                       | Holds                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `users/{uid}`                                              | profile: nickname, avatar (`avatarUrl`, `avatarKind`), language                                                                                                                                                                                                                                                                                                                      |
| `users/{uid}/stickers/{id}`                                | name, image URL and size, edge and print (`edge`, `seed`). To redo the edge later it keeps `outline` (the lasso outline as text, a few KB) and `cut` (where the cut-out sits in the stored picture); "Edit edge" rebuilds the edge-less cut-out from the sticker itself. Stickers made before v1.5 keep a second picture (`sourcePath`) instead, and still work                      |
| `users/{uid}/tapes/{id}`                                   | a tape: name, pattern, thickness, opacity, ends (all editable after creation)                                                                                                                                                                                                                                                                                                        |
| `users/{uid}/journals/{id}`                                | a journal: page spec, `items` (stickers by reference to a sticker id, tapes inline, text, strokes as compact base36 delta strings), thumbnail URL, counts. One document keeps reads cheap; the gallery needs only the thumbnail and counts                                                                                                                                           |
| `users/{uid}/collections/{id}`                             | name and a list of references `{k: sticker \| tape \| journal, id}`; nothing is copied                                                                                                                                                                                                                                                                                               |
| `users/{uid}/requests`, `sentRequests`, `friends`          | friend requests (both directions) and friendships (two documents, written in one batch)                                                                                                                                                                                                                                                                                              |
| `users/{uid}/inbox/{sid}`, `sent/{sid}`, `shareDone/{sid}` | what friends shared with me (with `seen` and `saved`: a share can be kept once), and what I shared (with the file paths, so a share can be taken back). When a friend keeps or puts away a share they write `shareDone/{sid}` in the sender's tree; the sender's app then deletes the files made for that friend and the `sent` record, since what was kept is the friend's own copy |

Public, get-only (no listing): `publicProfiles/{uid}` (nickname, friend code, and a small copy of the picture kept inside the document as a `data:` URL, with `avatarKey` saying which picture it was made from: friends cannot read my files, so they are never asked to) and `friendCodes/{code}` (code → uid).

## Working together: `workspaces/{id}`

`members`, `invited`, `ownerUid`, `title`, `page`, `thumb` (a small picture of the page as last changed, kept by whoever edited, as a `data:` URL up to 60 KB, for the list). Subcollections: `items/{itemId}` (one document per object on the page, so two people editing different objects never collide), `assets/{aid}` (the shelf: a sticker as a shrunk picture kept inside the entry as a `data:` URL, up to 150 KB, so it costs no Storage and members need no access to each other's files; or a tape's print), `presence/{uid}` (a heartbeat every 20 s; "online" means seen within 70 s). Edits to objects are gathered and written at most every 250 ms per object (`together/batcher.ts`), so dragging costs a few writes, not dozens a second.

Members come in by accepting an invitation (a transaction that checks the limit of 8), and leave or decline in the same way. Ending a page removes everything; "Save a copy" copies the pictures into the saver's own journal folder, so a copy never depends on someone else's files.

## Storage

`{uid}/stickers/`, `{uid}/profile/`, `{uid}/journals/{id}/` (thumbnails and copied pictures), `{uid}/shares/{sid}/` (pictures copied for a share, so the sender can delete theirs), `{uid}/collab/{wid}/` (what a member brought to a shelf). Pictures are served through token download URLs, which is how another person's image is shown. Uploads are capped (see `storage.rules`).

## Rules

`firestore.rules` and `storage.rules` are owner-only, with narrow exceptions for friends (writing into my inbox, never reading my data) and workspace members. `npm run test:rules` covers them. **Deploying rules changes production**; deploy before releasing an app version that uses new collections.

## Cleanup

Deleting an account removes everything above that belongs to the person: stickers, tapes, journals, collections, shared files, pages they own (they leave the others), friendships, requests, inbox/sent and the public profile (`src/features/account/account.api.ts`).
