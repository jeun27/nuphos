## Visuals for 18745cd2: the full set

Captured at 18745cd2 (base 4b75f4cb), light theme, fixture data. The page is a fixture harness that mounts the real `DecisionCards`, `routeSend`, `answeringInbox`/badge count and toasts, with a busy agent. Before is upstream main, after is this branch. The script clicks "Keep it public" up to 3 times.

| | Before (main) | After (this PR) |
|---|---|---|
| Asked | ![before asked](https://raw.githubusercontent.com/jeun27/nuphos/43c1a2d3b46980710770fed0e1cc079507feef36/18745cd2/before-1-asked.png) | ![after asked](https://raw.githubusercontent.com/jeun27/nuphos/43c1a2d3b46980710770fed0e1cc079507feef36/18745cd2/after-1-asked.png) |
| After clicking "Keep it public" | ![before clicks](https://raw.githubusercontent.com/jeun27/nuphos/43c1a2d3b46980710770fed0e1cc079507feef36/18745cd2/before-2-after-clicks.png) | ![after clicks](https://raw.githubusercontent.com/jeun27/nuphos/43c1a2d3b46980710770fed0e1cc079507feef36/18745cd2/after-2-after-clicks.png) |

Before: 3 clicks, 3 plain messages, the card stays open and the badge stays at 1. After: the first click queues one answer with its question, the card leaves, the badge clears and the "Answer queued" toast shows. There was no card left for a second click.

Range-diff: none. This is the first head.