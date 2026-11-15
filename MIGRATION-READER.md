# Migration Reading Room

The existing public reading room is published at https://www.rewardschool.com.au/migration/.
The main navigation places its entrance before PTE coaching. The shared navigation
and HTML fallbacks use the same URL, including school profiles in subdirectories.

The original application source remains in the sibling Migration workspace:
`../Migration/migration-reader`. After changing and validating that application,
run from this checkout:

```
node scripts/sync-migration-reader.mjs
```

An alternate source `dist` path can be supplied as the first argument. The exporter
copies only static output and adds this deployment's canonical URL and a return
link to Reward School. `migration-release.json` records the shipped file hashes.
Do not manually repeat application edits in the exported `migration/` directory.
The `.openai` identity, Git data, research files and private downloads are not copied.

The original Sites URL remains available. Browser reading records stay with the
origin on which they were created; users can export/import the existing JSON backup
through the reading room's My Bookmarks interface when changing origins.
