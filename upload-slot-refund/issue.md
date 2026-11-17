A failed upload from a computer still uses one of the team's hourly transfer slots

Each team can start 60 file transfers per UTC hour. A `local_upload` takes a slot as soon as its transfer is created, even if the file never reaches storage, for example when the computer cannot read it or its upload fails. An agent that retries a failing upload can use up the team's hour on transfers that delivered nothing, and then real transfers are refused until the hour turns.

Expected: an upload whose file never reached storage gives its slot and bytes back, exactly once. A transfer whose file was delivered keeps its slot. A file that lands after its slot was given back is never delivered.
