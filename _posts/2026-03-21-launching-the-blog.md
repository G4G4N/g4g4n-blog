---
title: "Launching the blog"
date: 2026-03-21 09:00:00 -0400
categories: [notes]
tags: [automation, publishing, github-pages]
summary: "Why this site exists and how it becomes the canonical home for daily writing."
popular: true
---

This blog exists so writing has a stable home that I control.

Medium can still be useful for reach, but `blog.g4g4n.com` is the source of truth. That keeps archives, SEO, and future automation under my control instead of being coupled to a third-party publishing product.

The operating model is simple:

1. Draft in Markdown.
2. Publish to GitHub Pages.
3. Optionally syndicate selected posts to Medium with a canonical link back here.

That structure works especially well for daily teaching series, build notes, incident-response lessons, and opinionated commentary on security engineering.

## Why the source of truth matters

Owning the publishing surface changes the incentives.

On a third-party platform, your writing is always downstream of someone else’s product direction, editor, distribution algorithm, and API lifecycle. On your own domain, the post URL, archive structure, design system, and automation layer stay stable.

That matters because the blog is not just content. It is infrastructure:

- a canonical archive for long-term search relevance
- a clean destination for future teaching series
- a dependable target for Codex-generated drafts
- a place where the visual language can actually match the rest of the portfolio

## The editorial bar

This site should reward readers who are busy and technical.

That means posts need to answer at least one of these questions:

1. How do I build this?
2. How do I think about this?
3. What should I do next if I own the system?

If a post does not improve one of those outcomes, it is noise.

> The archive should feel like an operator handbook, not a stream of filler.

## The workflow

In practical terms, the workflow looks like this:

```text
idea -> markdown draft -> review -> git push -> pages publish -> optional medium syndication
```

The beauty of that pipeline is that it stays simple. There is no CMS fragility, no editor lock-in, and no awkward split between “where the post lives” and “where the post was written.”

## What comes next

The near-term roadmap is straightforward:

1. daily teaching series on security automation patterns
2. short security-news interpretations with actual operator takeaways
3. essays on AI-assisted workflows, design taste, and judgment in security engineering

That is the shape of the archive this site is meant to become.
