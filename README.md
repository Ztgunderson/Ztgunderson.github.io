# Portfolio timeline (GitHub Pages / Jekyll)

- `_data/chapters.yml` — the three chapters and their intros
- `_data/timeline.yml` — one-moment events: summary, sources, status, optional `story` link
- `_data/tracks.yml` — things that ran over time (sports, jobs, clubs). Each is a colored line;
  overlapping tracks run in parallel lanes. Needs `start` and `end` (YYYY-MM).
- `stories/*.md` — longer pages for the events that deserve more history

To add depth to an event: create `stories/<name>.md` with `layout: story`,
then set `story: /stories/<name>/` on the event. Its dot turns solid.

Publish: push to a repo, Settings > Pages > Deploy from branch (main, root).

## Streams (focused timelines)
- `_data/streams.yml` lists the streams (education, ai-safety, advocacy, leadership, entrepreneurship).
  A stream with `parent: ai-safety` shows as a second row of filters on the AI Safety page (technical, governance, field-building).
- Tag any event or track with `tags: [leadership]` and it appears on `/streams/leadership/`.
- To add a stream: add it to `streams.yml` and copy `streams/leadership.html` with the new id.

## Coming up
Any event dated after the visitor's today shows in a "Coming up" block above Today, and moves into the timeline by itself once the date passes. Update its wording when it does.

## Focused landing pages
`/full/` is the complete timeline (same as `/`, the link to share). `/founder/` and `/safety-gov/` show a curated slice of the timeline with their own headline and intros. Edit `_data/profiles.yml` to change which entries each one includes.
