---
name: email-triage
description: Triages a user's inbox into Reply / FYI / Archive buckets with a concise, scannable summary. Use when the user asks to triage, clear, or summarize their inbox, or asks what email needs their attention.
trigger: model
keywords:
  - triage
  - inbox
  - unread email
required_tools:
  - gmail
---

# Email triage

Help the user get through their inbox fast. The goal is a short, decision-ready
summary — not a wall of text.

## Before you start

You need a connected email tool (e.g. the Gmail toolkit). If no email tool is
available this turn, don't guess: tell the user you can triage their inbox once
they connect email (say *"connect Gmail"*), then stop.

## Steps

1. Fetch unread/recent messages (last 24h unless the user says otherwise). Cap at
   ~20 so the summary stays readable.
2. Classify each message into exactly one bucket:
   - *Reply* — needs a response or a decision from the user.
   - *FYI* — informational; worth knowing, no action.
   - *Archive* — newsletters, receipts, notifications safe to skip.
3. Surface the result grouped by bucket, most important first.

## Output format

Use Slack mrkdwn. Keep it tight:

```
*Reply (3)*
• <sender> — <one-line ask> 
*FYI (2)*
• <sender> — <one-line gist>
*Archive (8)* — newsletters & receipts, nothing actionable
```

For *Reply* items, offer to draft responses: *"Want me to draft replies to any of
these?"* Never send or archive anything without explicit confirmation — read-only
by default.
