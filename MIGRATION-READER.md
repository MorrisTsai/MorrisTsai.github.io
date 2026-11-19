# Migration Reading Room

The existing public reading room is published at https://www.rewardschool.com.au/migration/.
This is the primary publication target, including all future reading-room updates
(user instruction, 2026-11-19). The homepage opens with the existing consultation photograph and study, migration
and visa planning introduction. The dedicated illustrated migration section follows
as the second section, with question lookup, bilingual library and case-study links.
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
link to Reward School. It excludes the generated Worker and configures the public
search API base URL. `migration-release.json` records the shipped file hashes.
Do not manually repeat application edits in the exported `migration/` directory.
The `.openai` identity, Git data, research files and private downloads are not copied.

The original Sites URL remains available. Browser reading records stay with the
origin on which they were created; users can export/import the existing JSON backup
through the reading room's My Bookmarks interface when changing origins.

## Search backend

GitHub Pages serves the frontend at `/migration/`; it does not execute backend
code. The browser sends its two sequential search requests to the existing Sites
Cloudflare Worker. `mrr-search-api` is the public endpoint configuration, never an
API key. The Worker explicitly accepts the www and apex Reward School origins and
handles JSON preflights. Credentials are omitted; only the question and selected
public law sources are processed. DeepSeek's key remains a Sites runtime secret.

After API changes, publish the Sites backend as well as this static frontend.
After either kind of release, verify the real Reward School search page and exact
paragraph links. Do not claim a complete release based only on the secondary URL.
