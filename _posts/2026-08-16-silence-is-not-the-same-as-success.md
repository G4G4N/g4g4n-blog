---
title: "Silence is not the same as success"
date: 2026-08-16 14:05:00 -0400
categories: [articles]
tags: [observability, monitoring, incident-response, security-engineering, logging, resilience, systems-design]
summary: "Most systems treat the absence of an alert as proof that everything is fine, but nothing fired and everything is fine are different claims, and the gap between them is exactly where backups quietly stop running, logs quietly stop shipping, and attackers quietly buy themselves time."
---

Ask an engineer how they know a nightly backup job is healthy, and the honest answer is often: nobody complained about it. No failure email arrived. No page fired. The dashboard, if there is one, is green — or more likely, there is no dashboard, because a job that has run without incident for two years stopped feeling like something that needed one.

That answer conflates two very different claims: "nothing told me it failed" and "it succeeded." Those are not the same statement, and treating them as interchangeable is one of the more quietly expensive habits in systems engineering. A job that silently stopped running three weeks ago produces exactly the same signal as a job that has been succeeding every night: none. The absence of an alarm is not evidence of safety. It is, at best, evidence that the alarm didn't go off — which includes the case where the alarm itself is broken, disconnected, or was never wired to this failure mode in the first place.

This is not a hypothetical concern filed under paranoia. It is the default failure mode of most monitoring designs, because most monitoring is built to detect bad events, not to detect the absence of good ones. Those are different engineering problems, and only one of them is usually solved.

## The asymmetry in what gets checked

Monitoring systems are, almost universally, built around a simple pattern: something happens, a condition is evaluated, and if the condition is bad, an alert fires. A request fails, an exception is thrown, a metric crosses a threshold — each of these is an event the system can observe and react to.

The failure mode that breaks this pattern is the one where the event never happens at all. A cron job that stops being scheduled produces no failed run to alert on — it produces no run. A log shipper that crashes produces no malformed log line to flag — it produces no log line. A security agent that gets silently killed by malware produces no suspicious alert — it produces the same clean dashboard as a healthy host, except nobody is watching anymore.

<figure class="diagram-block">
  <div class="mermaid">
flowchart TD
    A["Expected event: backup, heartbeat, log line"] --> B{"Did the event happen?"}
    B -- "Yes, and it failed" --> C["Failure signal fires"]
    C --> D["Alert — this is the easy case"]
    B -- "No, it never happened" --> E["No signal fires at all"]
    E --> F["Dashboard stays green"]
    F --> G["Absence is mistaken for success"]
  </div>
  <figcaption>Most monitoring is built to catch the left branch. The right branch — the event that should have happened but didn't — produces no signal by construction, which is exactly why it survives undetected.</figcaption>
</figure>

Systems built only to catch the left branch of that diagram have a structural blind spot, and it is not a small one. It covers every control whose job is to run continuously or periodically in the background, unattended, with no one checking that it is still there: backups, log pipelines, certificate renewal jobs, security agents, replication streams, scheduled compliance scans, health checks that check everything except their own ability to run.

## Why attackers specifically aim for this gap

Denial of visibility is not a side effect of an attack. For a competent adversary, it is frequently the first objective, pursued before anything that looks like the "real" attack begins.

Disabling logging, killing an EDR agent, clearing audit trails, or throttling telemetry to a SIEM does not trigger a security alert in a system that only watches for bad events, because none of those actions are bad events in the sense the monitoring understands. They are absences. The system doesn't see "attacker disabled logging." It sees nothing, because the thing it would have seen — the next log line — never arrives, and "no log line arrived" is not a condition most alerting pipelines evaluate.

This is why mature incident response playbooks treat a sudden drop in log volume, a gap in an audit trail, or a security agent that stopped checking in as high-priority signals in their own right — not as the absence of signal, but as a signal. A host that used to produce two thousand events an hour and now produces zero is not a quiet host. It is a host where the thing responsible for making noise has been dealt with. Treating that silence as "nothing to report" is precisely the outcome the attacker is trying to produce, and a monitoring design that only watches for explicit failures will hand it to them for free.

## Alert fatigue is silence wearing a disguise

There is a second path to the same blind spot that has nothing to do with an adversary: alert fatigue. A system that pages on every transient blip trains its responders to stop trusting pages. After enough false alarms, a real one gets acknowledged, dismissed, and forgotten in the same ten seconds as the noise around it — functionally identical to no alert having fired at all, except now there is a log entry proving someone saw it and moved on anyway, which tends to make the postmortem worse rather than better.

Silence, in other words, isn't only the literal absence of a signal. It's also the practical absence of a signal that technically exists but has been engineered — through sheer volume and imprecision — to be ignored. A monitoring system that cries wolf a hundred times a day has built the same blind spot as one with no monitoring at all. It has just hidden the construction cost inside a dashboard that looks, at a glance, like due diligence.

## Designing for the presence of a signal, not just the absence of a bad one

The fix is a genuine inversion of the default pattern: instead of only asking "did something bad happen," systems that care about this gap also ask "did the expected good thing happen, on schedule, and can I prove it." That second question needs its own infrastructure, because nothing else produces it automatically.

**Dead man's switches.** The clearest version of this pattern: instead of a job alerting when it fails, a separate watcher alerts when the job hasn't reported success within an expected window. The job has to actively check in — "I ran, and I ran successfully" — and if that check-in doesn't arrive on schedule, the watcher treats the missing check-in itself as the failure. This flips the default assumption from innocent-until-proven-guilty to a system that has to keep proving it's alive.

**Freshness checks, not just existence checks.** A backup file existing in storage is not the same claim as a backup file that was written in the last 24 hours. A log stream having historical data is not the same claim as a log stream that is currently receiving events. Every control whose value depends on staying current needs a check on *when* it last did its job, not merely *whether* it has ever done its job.

**Synthetic transactions and canary events.** Rather than waiting for real traffic to reveal a broken path, inject a known, expected event on a schedule and verify it comes out the other end: a synthetic login that should produce an audit log entry, a canary file written specifically to confirm the backup job picked it up, a heartbeat metric emitted purely so its absence is meaningful. The event's only job is to prove the pipeline that carries it is still alive.

**Monitoring the monitor.** The alerting pipeline is itself a system that can silently fail — the paging integration can lose its API key, the log forwarder that feeds the alerting system can crash, the on-call schedule can have a gap nobody caught. Every layer that exists to catch silence can itself go silent, which means the question "who alerts if the alerting pipeline goes down" needs an actual answer, ideally one that lives outside the pipeline it's watching. A smoke detector that shares a circuit breaker with the fire is not a smoke detector.

**Distinguishing "quiet because healthy" from "quiet because broken" in the data itself.** Where possible, design signals so that health is something the system actively asserts rather than something inferred from a lack of complaints. A component that emits "I am healthy" every sixty seconds gives you a positive claim with a timestamp. A component that just doesn't emit "I am broken" gives you nothing to check freshness against, and no way to tell a five-minute-old outage from a five-day-old one.

## A design test for this gap

For any control that is supposed to run continuously or on a schedule, unattended:

1. If this stopped running entirely — not failing loudly, just never executing again — what would notice, and how long would it take?
2. Does the alerting for this control depend on the control itself producing the failure signal, or does something independent verify that the control is still alive?
3. Is there a distinction anywhere in the system between "this has never failed" and "this has recently succeeded"? If not, the two are being treated as identical, and only one of them is true.
4. How many alerts does this system produce in a normal week, and would a responder actually notice one more real failure buried in that volume?
5. If an adversary's first move were to disable this control's ability to report at all, would that show up as an incident, or as nothing?

None of these questions assume malice. They are equally true of a cron entry that got dropped during a server migration, a log agent that silently OOM-killed itself, and an attacker who disabled auditing on the way in. That is precisely the point: the fix for accidental silence and the fix for deliberate silence are the same fix, because both exploit the identical gap — a system that only knows how to notice when something goes wrong, and has no mechanism for noticing when something simply stops.

Success is not the default state a system reverts to when nobody is complaining. It is a claim that has to be actively made, checked, and timestamped, or it isn't a claim at all — just an absence that everyone has agreed, usually without saying so out loud, to interpret optimistically.
