---
title: "A migration is a security incident you scheduled yourself"
date: 2026-09-06 13:40:00 -0400
categories: [articles]
tags: [migrations, trust-boundaries, identity, systems-design, security-engineering, rollback, technical-debt]
summary: "Migrations get planned as project-management problems — timeline, feature parity, a rollback button — but for the duration of the cutover, two systems disagree about the truth at once, and that disagreement is indistinguishable from the trust-boundary failures we normally call incidents."
---

Pull the postmortems for a handful of breaches that involved an authentication system, an identity provider, or a database of record, and a pattern shows up more often than coincidence should allow: the organization was migrating something. Moving from one SSO provider to another. Splitting a monolith's user table into a new service. Rolling out a new password-hashing scheme, a new API version, a new region. The breach didn't happen because the migration was implemented badly in some narrow technical sense. It happened because for the weeks or months the migration was in flight, the system was, provably, in a different security posture than the one anybody had reviewed — and nobody had treated that interval as the incident it structurally was.

This is worth stating plainly, because it cuts against how migrations get planned. A migration plan is a project-management artifact: a timeline, a cutover date, a feature-parity checklist, a rollback button in case something breaks. It is almost never built around the question a security review would ask first, which is: for however long this takes, what can succeed that shouldn't, and who is watching for it? The answer, most of the time, is "we didn't write that part down," because the plan was optimized for shipping the migration, not for defending the state the migration passes through on its way there.

## Two systems that disagree are not a technical footnote

The mechanism is almost always the same shape, whatever's being migrated. To move users, requests, or data from an old system to a new one without an outage, you run both at once for a while — dual writes, dual reads, a shim that checks the new system first and falls back to the old one, or the reverse. This is good engineering. It's also, for as long as it lasts, two independent implementations of the same trust decision, and a system is only as strong as the weaker of the two.

<figure class="diagram-block">
  <div class="mermaid">
flowchart TD
    A["Incoming auth request"] --> B{"New system available?"}
    B -- "Yes, and it accepts" --> C["Authenticated via new system"]
    B -- "No, or it rejects" --> D["Fall back to old system"]
    D --> E{"Old system accepts?"}
    E -- "Yes" --> C
    E -- "No" --> F["Rejected"]
    C --> G["Same downstream access either way"]
  </div>
  <figcaption>A fallback path that grants the same access as the primary path means an attacker only has to defeat the weaker of the two systems, not the one you meant to be defending.</figcaption>
</figure>

Consider a password-hashing migration — moving from an older, faster hash to something like `bcrypt` or `argon2`. The standard approach is to check the new hash first, and if a user hasn't logged in since the migration started, fall back to verifying against the old hash and re-hashing on success. That's the correct engineering answer to "how do I avoid forcing every user to reset their password on migration day." It is also, for every account that hasn't logged in yet, a live acceptance path through the exact weak hash the migration exists to retire. If the old hash is crackable, it stays crackable for every one of those accounts for as long as the fallback path is wired in — which is often "until someone remembers to remove it," a date that, unlike the migration's start, rarely appears on anyone's calendar.

The same shape recurs with identity-provider migrations, where a new IdP is stood up and trusted alongside the old one during cutover; with API versioning, where a v1 endpoint with looser validation stays reachable after v2 ships because some client hasn't upgraded; with database migrations, where a read replica still gets written to directly by a script nobody remembered exists. In each case, the vulnerability isn't in either system alone — it's in the disjunction between them, and disjunctions are exactly the kind of thing code review, threat modeling, and monitoring dashboards are built around a single system, not two, to catch.

## The old system doesn't stop being attacked when you stop watching it

There's a second failure hiding in the same interval, and it's less about the mechanism and more about attention. The moment a migration "starts," in most organizations' mental model, the new system becomes the thing that matters — it's what gets code review, what the security team threat-modeled before launch, what shows up in the architecture diagram going forward. The old system quietly downgrades from "the system" to "the thing we're migrating away from," and maintenance follows that downgrade: patches slow down, alerting rules stop getting tuned, on-call familiarity fades, because everyone's attention, correctly by their own incentives, has moved to the new thing.

But the old system is usually still authoritative for a meaningful slice of production — the accounts that haven't logged in yet, the tenants on the legacy plan, the service integration nobody scheduled to cut over. It is live, reachable, and now unmonitored relative to its actual exposure, for exactly the population most likely to be behind on the migration for a reason (dormant accounts, unmaintained integrations, edge-case tenants) that correlates with being the least resilient part of the estate. Attackers don't need to find a zero-day in the new system when the old one is sitting there with last quarter's attention budget and this quarter's exposure.

## Rollback plans protect availability, not security

Every competent migration plan includes a rollback path, and that's correct — you should be able to back out of a bad cutover. But rollback plans are almost always designed against the failure mode of "the new system broke and users can't get in," which is an availability concern. They are rarely designed against the question "does reverting also revert the security property the migration existed to fix?"

If you migrated away from an authentication method because it had a known weakness — a shared secret with too much blast radius, a token format without expiration, a hashing scheme that's crackable at scale — then your rollback plan, by construction, re-enables that exact weakness the moment something goes wrong with the new system and someone reaches for the rollback switch under pressure. This isn't a hypothetical: it's the direct consequence of building the rollback as a mirror image of the cutover instead of as its own reviewed transition. A rollback executed at 2 a.m. during an incident is not the moment anyone is going to stop and ask whether reverting reopens the hole the migration closed. That question needs an answer before the rollback exists as an option, not during the page.

## The parts nobody labeled "in scope"

Migration plans need a scope, and scoping is a reasonable thing to do — you can't migrate everything atomically. The problem is what happens to what's outside the scope line. Legacy tenants on an old pricing tier, service accounts nobody remembers provisioning, accounts tied to an email domain the company no longer owns, integrations built by a team that no longer exists — these get excluded from the migration plan not because someone decided they should stay on the weaker system indefinitely, but because nobody could confidently say what would happen if they were included, so they got deferred. Deferred, in practice, usually means permanent, because a migration that already shipped rarely gets reopened to sweep up its exceptions. The population most likely to be excluded from a migration's scope is, again, the population least likely to be actively maintained — which makes "out of scope" and "least defended, indefinitely" the same bucket more often than any migration plan admits out loud.

## A design test for migrations

Before a migration ships — and again before its rollback path is finalized — it's worth answering these directly, in writing, not as a retrospective exercise:

1. **During the transition, can a request succeed via the weaker of the two systems?** If dual-running means either system's acceptance is sufficient, the migration hasn't raised your security bar yet — it's only added a second way to clear the old one.
2. **Who is still watching the system you're migrating away from, and until when?** If the answer is "nobody, once the new system is live," name the date monitoring drops off and treat everything still routing through the old system after that date as an open exception, not a rounding error.
3. **Does your rollback path re-enable the specific weakness the migration exists to fix?** If yes, the rollback needs its own review and its own mitigations before it's wired up, not just before it's exercised.
4. **What happens to identities, accounts, or records that don't map cleanly between old and new?** These are usually the ones nobody wants to hold up the timeline for, and usually the ones an attacker will find first, precisely because they're the ones nobody's watching.
5. **What is your actual definition of "done" — and does anything still silently depend on the old system after that date?** A migration without an explicit, checked decommission date for the old path isn't finished; it's paused, and paused migrations are exactly where the exceptions above go to become permanent.

None of this argues against migrating things — systems need to change, and refusing to migrate because migrations are risky just trades a known future risk for accumulating the exact debt the migration would have paid down. The argument is narrower: a migration is a period where your system's actual security posture and your last threat model of it have diverged, on purpose, with a deadline. That's close enough to the definition of an incident that it deserves the same discipline — a defined blast radius, active monitoring for the duration, and someone whose job for that window is asking what could go wrong, not just tracking whether the timeline is going to slip.
