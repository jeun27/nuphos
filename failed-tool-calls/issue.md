Desktop transcript: a tool call that failed reads like a success

When an agent's tool call fails, its row in the Desktop transcript looks the same as a call that worked. Tools like `local_upload` report a failure as a normal result (`{ "error": "file_not_found" }`), so the call even folds into "Activity" with the routine work once the reply is done. To see that an upload failed, a person has to open the call or read the agent's prose.

Expected: a finished call that failed says so on its row, with the reason when the tool gave one. A closed run of several calls says how many of them failed. A call that returned an error stays visible instead of folding away.
