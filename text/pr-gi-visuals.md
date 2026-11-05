Visuals for HEADSHA

iPhone 17 simulator (iOS 27.2), light mode, `xcrun simctl io screenshot` of the app only. The real `HintRow`, `ShareApprovalStrip` and `AgentSignInInstructions` views are rendered with fixture data (a runtime on "Taylor’s Mac mini") by a temporary capture screen that isn't part of this PR. Before is main 9d75be97, after is this branch.

### Runtime errors and owner declined

| Before (main) | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/3b5b5050e2503832bdc0cbcb0c8f2a5869c9d17a/pr-gi/before-errors.png" width="300"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/3b5b5050e2503832bdc0cbcb0c8f2a5869c9d17a/pr-gi/after-errors.png" width="300"> |

### Sign-in instructions, teammate's computer

| Before (main): "Sign in on Taylor’s Mac mini … Settings → Runtimes" | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/3b5b5050e2503832bdc0cbcb0c8f2a5869c9d17a/pr-gi/before-teammate.png" width="300"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/3b5b5050e2503832bdc0cbcb0c8f2a5869c9d17a/pr-gi/after-teammate.png" width="300"> |

### Sign-in instructions, your own computer

| Before (main) | After |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jeun27/nuphos/3b5b5050e2503832bdc0cbcb0c8f2a5869c9d17a/pr-gi/before-own.png" width="300"> | <img src="https://raw.githubusercontent.com/jeun27/nuphos/3b5b5050e2503832bdc0cbcb0c8f2a5869c9d17a/pr-gi/after-own.png" width="300"> |
