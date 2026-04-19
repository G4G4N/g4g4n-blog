---
title: "Authority should travel as a capability, not hang in the air"
date: 2026-04-19 13:30:00 -0400
categories: [articles]
tags: [capabilities, authorization, security-engineering, systems-design, least-privilege, access-control, distributed-systems]
summary: "Authorization gets safer when systems stop relying on ambient permission checks and instead pass explicit, narrow capabilities that describe exactly what an operation is allowed to do."
---

Most authorization bugs are not caused by a team forgetting that permissions exist. They are caused by a team believing permissions are nearby enough.

The user is authenticated. The service account has a role. The request came through the internal gateway. The job runs in the production namespace. The database connection has access. Somewhere in the neighborhood, authority is present, and the code reaches for it as if that settles the question.

This is ambient authority: permission that exists in the environment rather than in the specific object or call being handled. It feels convenient because the code can ask the world what it is allowed to do. It is also a reliable way to make security properties depend on invisible context, accidental call paths, and the optimistic idea that nobody will ever reuse the function from the wrong place. A bold strategy, if the goal is future archaeology.

A capability is the opposite shape. It is an unforgeable reference that combines identity and authority. If code holds the capability, it can perform the operation described by that capability. If it does not, it cannot. The permission travels with the thing being used instead of floating around the process like a gas leak.

That distinction sounds academic until a system gets large. Then it becomes the difference between "this component can delete any object because it runs as the service" and "this component can delete object `A` for reason `R` until time `T` because that is the capability it was handed."

One of those designs is easier to reason about. The other is how incident reports learn the phrase "over-permissioned internal component."

## Ambient authority is a confused deputy factory

The classic failure mode is the confused deputy. A program has more authority than the caller. The caller persuades the program to use that authority on the caller's behalf, but not in the way the system intended.

This does not require movie-villain complexity. It can be painfully ordinary.

An image processing service can read from an internal storage bucket because it needs to fetch user uploads. The API accepts a path. A caller supplies a path to a sensitive internal file. The service dutifully reads it because the service account is trusted. The access check answered the wrong question: "can the service read this?" instead of "did this caller receive authority to read this object through this service?"

The same pattern appears in control planes, workflow systems, admin tools, webhooks, build systems, and internal APIs. A component has broad authority because components are annoying to permission one at a time. Then callers provide inputs that steer that authority. If the component does not require explicit proof that the caller is allowed to cause this exact effect, the system has built a deputy with a steering wheel.

Ambient authority makes these bugs natural because permissions are discovered from where code runs, which credentials are loaded, which network segment is involved, or which global context is available. Those facts may be true, but they are not the same as the caller's intent or authorization.

The deputy becomes confused because the system failed to keep those ideas separate.

## Capabilities bind authority to the operation

A capability-based design asks for a more concrete object: what may be done, to which resource, under which constraints, and by whom or what?

That object might be a signed URL, a scoped token, an object reference with embedded rights, a database row representing a one-time grant, a queue message whose consumer can only perform a named transition, or a file descriptor handed to a process that cannot open arbitrary paths itself. The implementation varies. The useful property is the same: code receives the authority it needs for the task, and not a general invitation to improvise.

<figure class="diagram-block">
  <div class="mermaid">
flowchart TD
    A["Caller requests a specific operation"] --> B["Policy service evaluates identity, resource, and context"]
    B --> C["Issue narrow capability"]
    C --> D["Worker receives capability with the job"]
    D --> E{"Capability permits this effect?"}
    E -- "Yes" --> F["Perform the bounded operation"]
    E -- "No" --> G["Reject without consulting ambient power"]
  </div>
  <figcaption>A capability does not make policy disappear. It makes the policy decision travel with the work so later components do not have to rediscover authority from broad credentials.</figcaption>
</figure>

This is a modest shift with large consequences. Instead of every downstream service asking, "what can I do from here?" the service asks, "what authority did this operation bring with it?"

That question is sharper. It is easier to log. It is easier to test. It narrows the blast radius when a worker is tricked, compromised, or reused by a future engineer who did not read the original design document because the original design document was a slide deck called Final-v7-really-final.

## Least privilege needs a carrier

Everyone likes least privilege in principle. In practice, many systems implement it by giving broad permissions to infrastructure identities and hoping application logic remembers to behave. That is not least privilege. That is maximum privilege with a motivational poster.

Least privilege needs a carrier. Something has to express the narrow right being exercised at the point where the effect occurs.

Consider a background worker that processes account closure requests. The easy version gives the worker permission to update any account record, revoke any token, delete any export, and publish any notification. Application code then checks that each queue message is legitimate. Maybe it does. Maybe every path does. Maybe a retry handler or maintenance script later bypasses the check because production is on fire and the logs are blinking in a judgmental way.

The capability version changes the shape. The queue message carries a closure capability for account `123`, issued by the policy system after the user passed the required workflow. The worker can use that capability to revoke tokens and mark that account closed. It cannot quietly close account `456` just because the worker's service account is powerful enough to do so in the abstract.

The operational difference is important. Broad credentials create a single large trust decision at deployment time. Capabilities create many small trust decisions at operation time. The latter is not free, but it matches how systems actually fail: one request, one job, one webhook, one internal endpoint used from the wrong angle.

Small authority is not only morally satisfying. It is mechanically useful.

## Capabilities make authorization auditable

Auditing ambient authority is miserable because the evidence is indirect. You have to reconstruct which process ran where, which role it had at the time, which configuration was loaded, which caller reached it, and which checks happened inside the code path. This is less an audit trail than a mystery novel with YAML.

Capabilities produce better records because the authority object has a name, scope, issuer, subject, resource, action, constraints, and expiration. A log line can say: capability `cap_7f3` allowed `export:read` on report `r42`, issued by policy version `p19`, used by worker `w8`, expires at `14:05`.

That is the kind of fact responders can use.

It also improves negative evidence. If a worker attempts an operation without the right capability, the system can reject and log that mismatch cleanly. With ambient authority, the worker may succeed because its environment is blessed, and the security team later has to infer that the success was not supposed to happen. Inferring unauthorized success after the fact is an expensive hobby.

Good capability design also makes reviews less theatrical. Instead of asking whether a service's enormous role is safe because the code is careful, reviewers can inspect the capability types that service accepts and the operations each type permits. The question moves from vibes to interface.

Security reviews should have fewer vibes. Vibes do not diff well.

## Expiration and scope are not decorative

A capability that lasts forever and grants broad authority is just ambient authority wearing a name tag. The value comes from tight scope and a lifetime that matches the job.

Scope should be specific enough to prevent useful confusion:

- action: `read`, `write`, `rotate`, `approve`, `delete`, or another named effect
- resource: the exact object or bounded collection
- audience: the service or component allowed to consume it
- constraints: size limits, state preconditions, caller identity, approval chain, network zone, or other meaningful checks
- expiration: short enough that stolen or stranded capabilities age out

These fields are not bureaucracy. They are the control surface.

The audience field is especially underrated. A token that authorizes a storage download should not be accepted by the billing service just because both services can validate the signature. Capabilities need consumers as well as subjects. Otherwise a grant minted for one context becomes portable into another, and portability is not always a feature. Sometimes it is how a bug packs luggage.

State constraints matter too. A capability to approve an invoice should probably be valid only while the invoice is still pending, below a certain amount, and associated with the same approval request. If the object changes, the old capability should fail rather than bless a new reality it never evaluated.

This is where capability design becomes systems design. The authority object has to describe not only who may act, but what world the authorization was based on.

## Do not confuse tokens with capabilities

Many systems already pass tokens around, but a token is not automatically a capability. A bearer token that says "this is Alice" is identity. A bearer token that says "Alice may read object `r42` for the next five minutes through service `reports`" is closer to capability authority.

Identity is often necessary, but identity alone is a poor substitute for authorization. If every service receives the same user token and independently maps it to whatever permissions it believes apply, the system has recreated ambient authority at a different layer. The authority is still being rediscovered from broad context. The confusion has merely become distributed, which is rarely an improvement outside load balancing.

This matters in microservice systems where a frontend request fans out across internal services. Passing the user's identity everywhere can be useful for audit and policy. But internal services should not treat identity propagation as permission to do anything that user could theoretically do. The operation needs its own bounded grant, especially when asynchronous jobs, retries, caches, or downstream effects enter the picture.

The question is not "who is this about?" It is "what exact authority was delegated to this component for this operation?"

## The hard parts are revocation and ergonomics

Capabilities are not magic, and pretending otherwise is how good ideas become conferences.

Revocation is hard. If a capability is self-contained and valid until expiration, the system may not be able to revoke it instantly without checking a central store. If every use checks a central store, some of the scaling and simplicity benefits shrink. The right answer depends on the risk. Short-lived capabilities may be enough for routine operations. High-risk grants may need server-side state, version checks, or revocation lists. Very high-risk grants may need all three, plus a human who can read logs without developing a facial twitch.

Ergonomics are also hard. Developers will route around capability systems that are painful, poorly documented, or slower than copying a god token from a wiki. The API has to make the secure path boring. Issuing a narrow grant should be easier than asking for broad service permissions. Validating a grant should be a library call with obvious failure modes. Logs should show the capability's meaning without requiring every engineer to decode a compact serialization format by candlelight.

Capabilities fail when they become ceremonial. They work when they become the normal way work moves through the system.

## A useful design test

For any security-sensitive workflow, ask these questions:

1. Which component performs the final side effect?
2. What broad authority does that component have merely because of where it runs?
3. What exact authority should this operation carry to that component?
4. Can the component perform the side effect without that operation-specific authority?
5. If the request is replayed, delayed, queued, or redirected, does the same capability still mean the same thing?

The fourth question is the uncomfortable one. If the answer is yes, then the capability may be advisory rather than enforcing. Advisory security controls are fine for dashboards and terrible for boundaries.

The fifth question catches another class of mistakes. A capability should not silently expand as context changes. If it was issued for one object, one state, one consumer, or one window of time, those facts should remain part of its meaning. Otherwise the system has built a permission slip that can be redeemed in a different universe.

Different universes are difficult to support in production.

## Let authority move deliberately

Security engineering is often described as deciding who is allowed to do what. That is true, but incomplete. In real systems, you also have to decide how that decision moves.

If authority hangs in the air, every component has to breathe it carefully. Call paths matter too much. Deployment roles become overloaded. Internal services become deputies. Audits turn into reconstructions. A bug in one workflow can borrow power from the environment and spend it somewhere else.

If authority travels as a capability, the system has something concrete to pass, constrain, inspect, expire, and deny. The permission is no longer an ambient property of being in the right process or network. It is a bounded object attached to the work.

That does not remove the need for policy. It makes policy operational. A policy decision that cannot survive the trip from the gateway to the worker is not really a decision. It is a suggestion with latency.

Build systems where the right to act is explicit at the moment of action. Give components the authority they need for the operation in front of them, not the authority they might need someday if the architecture diagram gets ambitious. The result is less convenient than ambient power, but it is much easier to defend, audit, and repair.

And when a service is tricked into doing something strange, it is better for it to ask, "where is the capability for that?" than to look around, notice it is trusted, and proceed with confidence. Confidence is a wonderful quality in people. In over-permissioned software, it is mostly foreshadowing.
