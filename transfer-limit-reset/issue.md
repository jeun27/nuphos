local_upload does not tell the agent when the hourly transfer limit resets

When a team uses up its hourly file-transfer limit, `local_upload` returns only `file_transfer_rate_limited`. The agent is not told when the limit resets or that retrying will not help. So it retries, and each call fails the same way until the hour turns. Meanwhile the person is not told why the file did not come in.

Expected: the result says when the limit resets (`retryAfter`) and tells the agent not to retry. The tool description and the file-transfer skill tell the agent to pass that on to the person instead of retrying.
