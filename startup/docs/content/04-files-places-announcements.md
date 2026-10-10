---
id: files-places-announcements
title: 4. Files, places & announcements
sidebar_position: 4
keywords: [files, drive, upload, download, delete file, attachment, geography, places, country, state, district, city, zone, site, tree, announcement, banner, notice, broadcast]
---

# 4. Files, places & announcements {#files-places-announcements}

Three shared tools that most screens lean on.

## Files {#files}

Upload, browse and manage the company's files. Found under **Masters → Drive**.

- **Upload** — **Upload**, pick a file (up to 10 MB by default), optionally tie it to a record (object name + id).
- **Browse** — your files, or all company files where permitted; each shows name, size, type, who uploaded it and when.
- **Download** — open a file and **Download**.
- **Delete** — removes both the record and the stored file.

## Places (geography) {#geography}

Every place the app knows — country, state, district, city, zone, site — kept as one tree. Reach for it before anything that needs a place: an address, a filter, a report grouped by region. Found under **Masters → Geography**.

### Add a place {#add-place}

1. Hover the place it belongs under and click **+** on that card (or **Add place** in the header for a top-level one).
2. Name it. The level is carried down from the parent and can be changed.
3. Optionally give it a **code** — what other systems call this place.
4. Save.

### Move or rename a place {#move-place}

Hover the card, click the pencil, change its name, code, level or parent, and save. Everything under it moves with it — a place stores only what contains it, so a whole branch re-parents in one change.

### Delete a place {#delete-place}

Requires `Geography.delete`. Hover a place with nothing under it, click the bin, confirm. A place that still holds others is refused and tells you how many — empty it first.

### Tree or list {#geography-view}

The header switches between them. The tree shows where something sits; the list searches, sorts and exports every place at once.

## Announcements {#announcements}

Show a banner across the app — to the whole company or to chosen roles, between chosen dates. Use it for planned downtime, a release note, anything everyone must read once. Found under **Masters → Announcements**.

### Post an announcement {#post-announcement}

1. **Add announcement**.
2. Write the title and message.
3. Choose the level — **Information**, **Warning** or **Critical** (this styles the banner).
4. Choose who sees it. Leave the roles empty for everyone in the company.
5. Set **Shown from** and **Shown until**. Leave either empty for "from now" / "until stopped".
6. Save.

### Stop an announcement {#stop-announcement}

Open it, clear **Running** (or set **Shown until** to now), and save. It disappears for everyone at once.

### What a reader sees {#announcement-reader}

The banner sits above the page, never over it. Dismissing one hides it for that reader on that browser only; editing an announcement brings it back, because an edited announcement is a new thing to say.
