# usage: capture.sh  (builds before/after, captures 3 screens each into ~/Developer/rt-ios-shots)
set -euo pipefail
DEV=7461C865-4008-4395-B977-B37736B74F1B
OUT=~/Developer/rt-ios-shots; mkdir -p $OUT
xcrun simctl boot $DEV 2>/dev/null || true
xcrun simctl ui $DEV appearance light
for v in before after; do
  dir=~/Developer/nuphos-ios-runtime-$([ $v = after ] && echo way-forward || echo before)/apps/ios
  xcodebuild -quiet -project $dir/nuphos-ios.xcodeproj -scheme nuphos-ios -configuration Debug \
    -destination "id=$DEV" -derivedDataPath /tmp/rt-dd-$v CODE_SIGNING_ALLOWED=NO build 2>&1 | grep -E "error|BUILD" | head -20
  app=$(ls -d /tmp/rt-dd-$v/Build/Products/Debug-iphonesimulator/*.app | grep -v -i "share\|widget\|notif" | head -1)
  xcrun simctl install $DEV "$app"
  id=$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$app/Info.plist")
  for s in errors teammate own; do
    xcrun simctl terminate $DEV $id 2>/dev/null || true
    xcrun simctl launch $DEV $id -harness -harness-$s >/dev/null
    sleep 4
    xcrun simctl io $DEV screenshot $OUT/$v-$s.png >/dev/null 2>&1
  done
done
echo CAPTURE_DONE
