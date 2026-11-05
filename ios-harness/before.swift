#if DEBUG && os(iOS)
import SwiftUI

/// Temporary capture screen for PR visuals; never committed.
struct RuntimeStatesHarness: View {
    let screen = CommandLine.arguments.contains("-harness-teammate") ? 1 : CommandLine.arguments.contains("-harness-own") ? 2 : 0

    static func runtime(owner: String) -> RuntimeInstance {
        let json = #"{"id":"local_OWNER_mac","provider":"claude-code","label":"Claude Code","status":"active","kind":"local","local":{"ownerUserId":"OWNER","deviceId":"mac","deviceLabel":"Taylor’s Mac mini","signedIn":false}}"#
        return try! JSONDecoder().decode(RuntimeInstance.self, from: Data(json.replacingOccurrences(of: "OWNER", with: owner).utf8))
    }

    var body: some View {
        NavigationStack {
            if screen == 0 {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        HintRow(text: AgentChatAPI.Conflict.runtimeNotFound.errorDescription!, isError: true)
                        HintRow(text: AgentChatAPI.Conflict.runtimeOffline.errorDescription!, isError: true)
                        ShareApprovalStrip(wait: .denied, computer: "Taylor’s Mac mini").padding(.horizontal, -16)
                    }.padding(16)
                }.background(Theme.canvas).navigationTitle("Build check").navigationBarTitleDisplayMode(.inline)
            } else {
                AgentSignInInstructions(runtime: Self.runtime(owner: screen == 1 ? "taylor" : "me"))
            }
        }
    }
}
#endif
