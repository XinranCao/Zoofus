ConfirmDialog asks "Are you sure?" for something that cannot be undone.

**Anatomy.** A small Dialog (420px) with a title that names the thing ("Delete 'Pear'?"), one line that says what is lost, a quiet Cancel and a `plum` danger confirm that repeats the verb ("Delete"). The confirm shows a busy state while the work runs.

**Rules.** Like every Dialog it starts on its first visible field (here, its title) and returns focus to its opener. Something that can be undone (a single sticker delete) uses an Undo toast instead of this dialog where it can.
