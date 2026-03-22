---
title: "Good automation should feel boring in production"
date: 2026-03-17 08:55:00 -0400
categories: [articles]
tags: [automation, security-engineering, reliability]
summary: "The best automation rarely looks clever when it is running. It looks predictable, well-governed, and almost suspiciously calm."
---

Security teams often talk about automation as if the main goal were to look futuristic in a demo. Buttons get pressed, alerts get enriched, tickets blossom, and somebody in the room uses the word orchestration with enough reverence to frighten normal people. Then production arrives, the edge cases start breeding, and everyone discovers that impressive automation is not the same thing as trustworthy automation.

Good automation should feel boring in production because boredom is what stability feels like from the operator’s chair. A well-built workflow takes a messy but common class of work and makes it consistent, bounded, observable, and reversible. It does not need applause. It needs to avoid surprising the humans who inherit its consequences. If your automation frequently produces adrenaline, you have not built a helper. You have built a coworker who should not have shell access.

The core design mistake is usually overreach. Teams try to automate the full decision instead of automating the parts that are reliably machine-friendly. Enrichment, normalization, correlation, context gathering, routing, and pre-validated containment suggestions are often great candidates. Fully autonomous action across messy environments with inconsistent data, political ownership gaps, and uncertain blast radius is where the plot gets unnecessarily exciting. Security engineering already contains enough drama without inventing new genres.

The boringness standard also forces better engineering hygiene. Reliable automation needs versioning, guardrails, rollback paths, idempotence, structured logging, test cases, and clear ownership. That list is less sexy than “AI-driven autonomous triage,” which is unfortunate for marketing and excellent for outcomes. The systems that save real time are the ones that fail gracefully, expose their decisions, and make it easy for an operator to understand what happened without consulting a mystic.

There is a cultural benefit here too. Teams adopt automation more readily when it behaves like a dependable tool rather than an unpredictable personality. Analysts will trust workflows that consistently reduce toil and preserve context. They will route around workflows that occasionally create more cleanup than the manual path they replaced. Trust is earned in production one uneventful run at a time.

This is why I like to judge automation less by how much it can do and more by how safely it can do the thing it does most often. If the workflow enriches every phishing ticket cleanly and saves hours per week, that is real value. If it sometimes quarantines the wrong account because a dependency hiccuped and a field mapped badly, congratulations, the workflow has become a management problem with JSON in it.

So the bar is simple. Build automation that narrows ambiguity, not automation that merely relocates it. Make it inspectable. Make it interruptible. Make it good at the common path and honest about the weird path. If it ends up looking boring when it runs, that is not a design failure. That is what maturity looks like after the demo lights go off.
