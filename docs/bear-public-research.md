# Public sources without a model call

In the Space companion, explicitly choose **Public sources · No model**, enter
keywords, then send. Conversation remains a separate mode.

This mode searches the current public writing catalog (at most 500 entries),
shows up to six matches and reads at most the first matching article. It makes
at most two tool calls: local catalog search and one article read. The read
must retain a verified catalog identity, use the same origin without credentials,
queries, fragments or redirects, and stay within 512 KiB. The displayed passage
is labelled as an original text excerpt, capped at 1,600 characters, with its
source; it is not a model-generated summary.

The task does not call a model/provider, read private note/draft state, or alter
the workspace. Stop, timeout (at most ten seconds), closing the window and source
withdrawal fence pending work. A failed/partial read is not marked completed.

Task mode, steps, source result and terminal status use the existing local
conversation history. Reloading displays stored records without replaying tools
or network operations. Retrying is an explicit new task in its original mode.
Public-source records stay out of later model conversation context. History
readback failure shows the existing export warning; do not rely on persistence
until the browser confirms saving.

Host Node/DOM checks cover these boundaries. Hosted CI and a rendered desktop
and narrow-window interaction check are separate release gates.
