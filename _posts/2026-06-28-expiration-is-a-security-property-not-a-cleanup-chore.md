---
title: "Expiration is a security property, not a cleanup chore"
date: 2026-06-28 13:20:00 -0400
categories: [articles]
tags: [expiration, ttl, credentials, sessions, security-engineering, access-control, systems-design]
summary: "Expiration bounds how long a leaked credential, cached permission, or stale grant remains useful, which makes time-to-live a security control in its own right rather than a background cleanup detail."
---

Ask a team why a session lasts thirty days, why an API key has no expiration, or why a signed URL stays valid for a year, and you will rarely hear a security argument. You will hear a convenience argument. Users hate logging in. Rotating keys breaks something. Nobody wanted to think about it during the sprint, so the default won by default.

That is how expiration ends up classified as a usability tax instead of a control. It shows up in the same mental bucket as cookie banners and log rotation: background hygiene, not security architecture. This is a mistake, and it is a specific kind of mistake worth naming, because it leaves a control sitting unused while teams spend their attention budget on scope instead.

Most access control thinking is obsessed with one dimension: who can do what. Roles, permissions, capabilities, network zones. That dimension matters enormously. But authorization actually has two dimensions, not one. The second dimension is *for how long*. A grant that is perfectly scoped but never expires is still a liability with no statute of limitations. It just takes longer to notice.

## Scope answers "what." Duration answers "how long does that answer matter."

Security reviews are good at scope questions. Does this service account need write access to that bucket? Does this role really need `*` instead of three specific actions? Does this token need every scope or just the one the integration actually uses? These are the right questions, and most mature teams ask them.

Far fewer reviews ask the duration question with the same seriousness: how long does this grant remain valid after it is issued, and does that lifetime match how long the underlying trust decision should be considered good?

The two questions are not interchangeable. A narrowly scoped credential that never expires is still exploitable forever once it leaks. A broadly scoped credential that expires in five minutes is unattractive to almost anyone who finds it lying around, because by the time they notice it, it is already worthless.

Neither property substitutes for the other. Good systems need both. But scope gets the workshops, the policy engines, and the diagrams. Duration usually gets a default value nobody remembers choosing.

## Every unbounded grant is a liability with no expiration date

Think about what a credential, session, or cached permission actually represents: a decision, made at some point in the past, that a particular action should be allowed. That decision was made with the information available at the time. People change roles. Laptops get stolen. Vendors get breached. Source repositories get scraped by bots looking for exactly this kind of thing.

If the grant has no expiration, the original decision keeps being honored indefinitely, regardless of whether the conditions that justified it still hold. The system is not enforcing "this was authorized." It is enforcing "this was authorized once, and nobody has gotten around to revisiting that."

This is why credential leaks are so often more damaging than they needed to be. The leak itself — a key committed to a public repository, a token printed in a log line, a cookie captured by a malicious extension — is frequently an accident that nobody could fully prevent. What turns the accident into an incident is how long the leaked artifact remains useful after the accident happens. A key with no expiration is exploitable from the moment it leaks until someone notices and rotates it, which in practice can be months. A key that expires in an hour is exploitable for, at most, the remainder of that hour.

Same mistake, same leak, wildly different blast radius. The only difference is a clock.

<figure class="diagram-block">
  <div class="mermaid">
flowchart TD
    A["Credential issued"] --> B["Credential used normally"]
    B --> C["Credential leaks: log, repo, screenshot, phishing"]
    C --> D{"Has the TTL already passed?"}
    D -- "Yes" --> E["Leak is worthless on arrival"]
    D -- "No, still valid" --> F["Leak is exploitable until expiration or revocation"]
  </div>
  <figcaption>The leak event is usually outside your control. The exploitable window after it is not — that window is exactly as long as the credential's lifetime.</figcaption>
</figure>

## Expiration bounds blast radius in time, the way scope bounds it in space

Least privilege is usually described spatially: narrow the set of things a credential can touch. Expiration does the same work along a different axis: it narrows the *interval* during which that credential's permissions are honored at all.

Put those together and you get a more honest description of exposure: not "what could this credential do," but "what could this credential do, multiplied by how long it could do it." A narrowly scoped, long-lived credential and a broadly scoped, short-lived one can end up with comparable risk, depending on the numbers. Teams that only optimize scope are solving half the equation and reporting the result as if it were the whole answer.

This is also why short-lived, broadly-scoped credentials — the kind issued by workload identity systems, cloud STS tokens, and just-in-time access grants — are often a real improvement over narrowly-scoped, long-lived ones, even though the scope story sounds worse on a slide. A token valid for fifteen minutes is hard to weaponize even if it is fairly powerful, because the attacker needs to catch it, use it, and finish before the clock runs out. A token valid for a year is dangerous even if its scope is modest, because an attacker who finds it has all the time in the world to figure out what to do with it.

## Where this shows up, beyond the obvious

Session cookies and API keys are the cases everyone thinks of first, but the same property is load-bearing in places people rarely audit:

- **Signed URLs**, which often default to long or unset expirations because the developer just wanted the download link to work reliably
- **Cached authorization decisions**, where a service checks permissions once and reuses the result for some TTL that nobody chose deliberately
- **OAuth and JWT access tokens**, where the `exp` claim is sometimes copied from an example and never revisited as scopes grow
- **Temporary cloud credentials**, where session duration is configurable and frequently set to the maximum allowed instead of the minimum needed
- **DNS and certificate lifetimes**, where long validity windows mean a compromised key stays trusted for longer after compromise
- **Build artifacts and CI tokens**, which are often scoped reasonably but live for the entire pipeline run, or longer, with no one tracking where they ended up

None of these are exotic. Most teams already have an opinion about scope for each one. Far fewer have an explicit, deliberate opinion about lifetime. The lifetime is usually whatever the library defaulted to, or whatever made a flaky integration test stop flaking.

## Revocation is expiration's slower, more expensive cousin

The standard objection is: "we don't need expiration, we can just revoke it if something goes wrong." This is true in the same way that you don't need a seatbelt if you're confident you won't crash.

Revocation depends on three things going right: someone noticing the compromise, someone with authority acting on it, and every system that holds a cached copy of the old decision actually checking back in before honoring it again. That third part is the quiet killer. Distributed systems cache aggressively, by design, because checking a central authority on every request is slow and expensive. A revocation list that nothing consults is a security control that exists only in documentation.

Expiration does not have this dependency. It does not need anyone to notice anything. It does not need a central system to be reachable, healthy, or even aware that a compromise happened. It is a default-deny clock that fires on its own. Revocation is what you reach for *in addition to* expiration, for the cases where you cannot afford to wait out the TTL. It is not a substitute for having one.

This is the same reason fire doors close automatically instead of relying on someone remembering to shut them. The automatic mechanism does not require anyone to be paying attention at the right moment.

## The cost is real, and it is operational, not moral

None of this means shorter is always better with no engineering cost. Aggressive expiration without a matching refresh path produces its own outages: tokens expiring mid-request, refresh storms when a large batch of credentials all renew at the same moment, services that fail hard instead of refreshing transparently, clock skew between issuer and consumer turning a valid credential into a rejected one a few seconds early.

Good expiration design budgets for this. It pairs short lifetimes with quiet, automatic renewal well before expiry, jitter to avoid synchronized refresh stampedes, and a clear, tested answer to "what does this system do at the exact moment a credential it's using expires mid-operation." Skipping that engineering and just shortening every TTL to look responsible on a compliance checklist is how teams turn a security improvement into a reliability incident, then quietly revert it and stop trying.

The point is not that short is virtuous. The point is that lifetime is a parameter you are responsible for choosing, the same way scope is, with real trade-offs on both ends — and that "as long as possible" is not a neutral choice just because it's the path of least resistance.

## A useful design test

For any credential, session, token, signed reference, or cached permission in your system, ask:

1. If this leaked right now, how long would the leak matter?
2. What is the shortest lifetime that does not break the legitimate workflow it supports?
3. Did this live forever by deliberate decision, or did it just start that way and nobody revisited it?
4. When this expires, does the system fail closed, fail open, or refresh transparently — and has anyone actually tested that path?
5. Is the expiration enforced by the issuer, by the consumer, or only by convention that a future engineer could quietly break?

The third question is the one that catches the most real systems. Most unbounded lifetimes were never chosen. They were inherited from a default, a tutorial, or a constraint that no longer applies, and then never looked at again because nothing forced anyone to look.

## Treat the clock as part of the control

Security engineering spends a lot of energy deciding who is allowed to do what. It spends comparatively little energy deciding how long that decision should keep being honored, even though the second question is just as capable of turning a minor exposure into a serious one.

Expiration is unglamorous. It does not show up on an architecture diagram as a box with a lock icon. It is a number in a config file, a claim in a token, a column in a table that says when a row stops mattering. But it is doing real work every time a leaked secret turns out to be worthless, every time a stale session stops being a standing invitation, every time a cached permission ages out before anyone has to remember to revoke it by hand.

Treat the lifetime of every grant as a decision, not a default. Write it down. Justify it the same way you would justify a scope. And when you are reviewing a system for security, ask not only what it can do, but for how long that answer is allowed to stay true.
