# usage: apply.sh <ios dir> <before|after>
set -e
cd "$1"
curl -fsSL "$BASE/ios-harness/$2.swift" -o nuphos-ios/Views/ZZRuntimeStatesHarness.swift
sed -i '' 's/if CommandLine.arguments.contains("-scroll-regression") {/if CommandLine.arguments.contains("-harness") { RuntimeStatesHarness() } else if CommandLine.arguments.contains("-scroll-regression") {/' nuphos-ios/NuphosApp.swift
sed -i '' 's/^private struct AgentSignInInstructions/struct AgentSignInInstructions/' nuphos-ios/Views/Home/RuntimesPage.swift
