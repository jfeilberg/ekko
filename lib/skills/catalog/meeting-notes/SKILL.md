---
name: meeting-notes
description: Turns a raw transcript, pasted notes, or a thread into clean structured meeting notes with decisions and owned action items. Use when the user shares meeting content or asks to summarize a meeting, call, or discussion.
trigger: model
keywords:
  - meeting notes
  - summarize the meeting
  - action items
required_tools: []
---

# Meeting notes

Turn messy meeting input (a transcript, bullet notes, or a Slack thread) into
notes someone can act on without having been there.

## Steps

1. Identify the participants and the meeting's purpose from the input. If it's
   ambiguous, ask one clarifying question rather than inventing context.
2. Extract, in this order:
   - *Decisions* — what was actually decided.
   - *Action items* — each with an owner and, if mentioned, a due date.
   - *Open questions* — unresolved threads to revisit.
3. Keep a short *Summary* (2–3 sentences) at the top for skimmers.

## Output format

Use Slack mrkdwn:

```
*Summary*
<2–3 sentences>

*Decisions*
• <decision>

*Action items*
• <owner> — <action> _(due <date>)_

*Open questions*
• <question>
```

Rules:
- Never invent an owner or a due date. If unknown, write *owner: unassigned* and
  leave the due date out.
- Attribute action items to real names/handles from the input only.
- Offer next steps where useful: *"Want me to post these to a channel or save them
  to your notes tool?"* — but don't post anywhere without confirmation.
