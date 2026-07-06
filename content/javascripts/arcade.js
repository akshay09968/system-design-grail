/* Grail Arcade: three client-side games with localStorage high scores. */
(function () {
  "use strict";

  var ROUNDS = 10;

  /* ---------------------------------------------------------- data */

  var ESTIMATION = [
    { q: "A main-memory reference costs about…", c: ["~1 ns", "~100 ns", "~10 µs", "~1 ms"], a: 1, n: "Memory ≈100 ns — ~1000× faster than SSD. (Estimation)" },
    { q: "An NVMe random read costs about…", c: ["~100 ns", "~5 µs", "~50 µs", "~5 ms"], a: 2, n: "NVMe random read ≈20–100 µs. (Estimation)" },
    { q: "A round trip within one AZ costs about…", c: ["~5 µs", "~0.5 ms", "~5 ms", "~50 ms"], a: 1, n: "Same-AZ RTT ≈0.5 ms. (Estimation)" },
    { q: "An intercontinental round trip (NY↔Sydney) costs about…", c: ["~20 ms", "~60 ms", "~200 ms", "~1 s"], a: 2, n: "≈200 ms — physics, not code. (Estimation)" },
    { q: "A spinning-disk (HDD) seek costs about…", c: ["~100 µs", "~1 ms", "~8 ms", "~80 ms"], a: 2, n: "HDD seek ≈5–10 ms — why databases fled to SSD. (Storage engines)" },
    { q: "Seconds per day, for estimation math?", c: ["~10⁴", "~10⁵", "~10⁶", "~10⁷"], a: 1, n: "86,400 ≈ 10⁵ — the divisor in every QPS recipe. (Estimation)" },
    { q: "100M DAU × 10 actions/day ≈ average QPS?", c: ["~1k", "~10k", "~100k", "~1M"], a: 1, n: "10⁹/day ÷ 10⁵ ≈ 10k QPS. (Estimation)" },
    { q: "Standard peak-to-average traffic factor?", c: ["~1.2×", "~3×", "~10×", "~30×"], a: 1, n: "Plan peak ≈ 2–5× average; 3× is the default. (Estimation)" },
    { q: "1M log lines/s × 300 B ≈ daily raw volume?", c: ["~2.6 TB", "~26 TB", "~260 TB", "~2.6 PB"], a: 1, n: "300 MB/s ≈ 26 TB/day — the log-pipeline math. (Estimation)" },
    { q: "One tuned Redis core handles about…", c: ["~1k ops/s", "~10k ops/s", "~100k+ ops/s", "~10M ops/s"], a: 2, n: "≈100k+ ops/s/core — memory + single thread + event loop. (Redis)" },
    { q: "One Kafka partition sustains about…", c: ["~1 MB/s", "~15 MB/s", "~150 MB/s", "~1.5 GB/s"], a: 1, n: "≈10–20 MB/s per partition — the partition-count math. (Kafka)" },
    { q: "Postgres, simple indexed queries, one good node?", c: ["~500 QPS", "~30k QPS", "~500k QPS", "~5M QPS"], a: 1, n: "≈10–50k QPS — the boring-tech headroom. (SQL at scale)" },
    { q: "2³⁰ bytes is…", c: ["~1 MB", "~1 GB", "~1 TB", "~1 PB"], a: 1, n: "2¹⁰≈KB, 2²⁰≈MB, 2³⁰≈GB, 2⁴⁰≈TB. (Estimation)" },
    { q: "10M rate-limit buckets × 80 B each ≈ …", c: ["~80 MB", "~800 MB", "~8 GB", "~80 GB"], a: 1, n: "800 MB — one Redis node; the 'is it even distributed?' check. (Rate limiter)" },
    { q: "Fan-out to 100 backends, each fast 99% of the time — P(all fast)?", c: ["~90%", "~63%", "~37%", "~13%"], a: 2, n: "0.99¹⁰⁰ ≈ 37% — tail amplification. (Latency & throughput)" },
    { q: "Five 99.9%-available services in series compose to…", c: ["~99.9%", "~99.5%", "~99.0%", "~95%"], a: 1, n: "0.999⁵ ≈ 99.5% — serial availabilities multiply. (Reliability)" },
    { q: "99.9% availability = monthly downtime budget of…", c: ["~4 min", "~43 min", "~7 h", "~3.6 days"], a: 1, n: "≈43.8 min/month. (Reliability)" },
    { q: "99.99% availability = yearly downtime of…", c: ["~5 min", "~53 min", "~9 h", "~3.7 days"], a: 1, n: "≈52.6 min/year — automation territory. (Reliability)" },
    { q: "One hour of 1080p video ≈ …", c: ["~200 MB", "~2 GB", "~20 GB", "~200 GB"], a: 1, n: "≈5 Mbps ≈ 2 GB/hour. (Estimation)" },
    { q: "2,000 req/s at 50 ms mean latency → requests in flight?", c: ["10", "100", "1,000", "4,000"], a: 1, n: "L = λ×W = 2000 × 0.05 = 100. Little's law. (Latency & throughput)" },
    { q: "Erasure coding 6+3: storage overhead vs the data?", c: ["~1.1×", "~1.5×", "~2×", "~3×"], a: 1, n: "9 fragments for 6 data = 1.5× — vs 3× for replication. (Object storage)" },
    { q: "Cache hit rate 90% → 99%: origin load…", c: ["drops ~10%", "halves", "drops 10×", "drops 100×"], a: 2, n: "Origin ∝ (1−hit rate): 10% → 1% = ÷10. (CDN)" },
    { q: "Cross-region RTT, same continent?", c: ["~3 ms", "~30–80 ms", "~300 ms", "~1 s"], a: 1, n: "≈30–80 ms — the PACELC tax in milliseconds. (Estimation)" },
    { q: "Snowflake IDs devote how many bits to the timestamp?", c: ["21", "41", "53", "64"], a: 1, n: "41 bits of ms + 10 node + 12 sequence. (Time & ordering)" },
    { q: "TLS 1.3 cold handshake costs how many round trips?", c: ["0", "1", "2", "3"], a: 1, n: "1 RTT (TLS 1.2 took two); 0-RTT on resumption. (Networking fundamentals)" },
    { q: "Internet egress from a big cloud, per GB?", c: ["~$0.005", "~$0.07", "~$0.70", "~$7"], a: 1, n: "≈$0.05–0.09/GB — why CDNs and topology matter. (Cost & capacity)" }
  ];

  var FAILURES = [
    { q: "A hot key's TTL expires; the database suddenly receives 10,000 identical recompute queries.", c: ["Cache stampede", "Cache avalanche", "Cache penetration", "Hot key"], a: 0, n: "One key, many concurrent misses → single-flight + stale-while-revalidate. (Cache failure modes)" },
    { q: "A midnight cron warmed the cache with identical TTLs; hit rate cliffs to zero exactly one TTL later.", c: ["Cache stampede", "Cache avalanche", "Big key", "Metastable failure"], a: 1, n: "Mass synchronized expiry → TTL jitter, always. (Cache failure modes)" },
    { q: "Attackers iterate /user/999999999…; the cache never helps and the DB is hammered by misses.", c: ["Hot key", "Cache avalanche", "Cache penetration", "Stampede"], a: 2, n: "Keys that don't exist bypass cache → negative caching + Bloom filter. (Cache failure modes)" },
    { q: "One viral post; a single cache node is pegged while the cluster average looks green.", c: ["Big key", "Hot key", "Avalanche", "Penetration"], a: 1, n: "Hashing balances keys, not traffic → L1 cache + key replication. (Cache failure modes)" },
    { q: "The trigger was fixed an hour ago, but load is still pinned at 100% — retries are the load now.", c: ["Cascading failure", "Gray failure", "Metastable failure", "Thundering herd"], a: 2, n: "A sustaining feedback loop — fix by breaking the loop, not the trigger. (Failure modes)" },
    { q: "A node passes /healthz in 2 ms but serves real queries in 8 seconds.", c: ["Crash-stop failure", "Gray failure", "Split brain", "Metastable failure"], a: 1, n: "Passes checks, fails work → balance on observed latency, not self-report. (Failure modes)" },
    { q: "The old primary kept accepting writes while a new primary was elected elsewhere.", c: ["Failover", "Split brain", "Gray failure", "Replication lag"], a: 1, n: "Two divergent histories — why fencing is non-negotiable. (Replication)" },
    { q: "One service slows; timeouts fire upstream; retries triple the load; neighbors fall in sequence.", c: ["Metastable failure", "Cascading failure", "Avalanche", "Split brain"], a: 1, n: "Redistribution + retry amplification → breakers, budgets, shedding. (Failure modes)" },
    { q: "Established connections work fine, but every NEW connection through the NAT silently vanishes.", c: ["FD exhaustion", "Conntrack table full", "SYN flood", "TIME_WAIT exhaustion"], a: 1, n: "The most confusing incident shape in networking. (Networking fundamentals)" },
    { q: "CPU idle, service 'healthy', but accept() fails with EMFILE.", c: ["File-descriptor exhaustion", "Conntrack full", "OOM kill", "CPU throttling"], a: 0, n: "Connections are inventory — graph FDs, find the leak. (Linux fundamentals)" },
    { q: "A proxy making rapid short-lived outbound connections suddenly can't open new ones.", c: ["Conntrack full", "TIME_WAIT / ephemeral-port exhaustion", "FD leak", "SYN backlog overflow"], a: 1, n: "Closed sockets linger ~60 s; fix with connection reuse. (Networking fundamentals)" },
    { q: "A deploy added a per-pod label to one metric; the monitoring system OOMs within the hour.", c: ["Cardinality bomb", "Scrape gap", "Query of death", "Retention overflow"], a: 0, n: "Identifiers belong in logs/traces, never metric labels. (Observability)" },
    { q: "Cassandra reads crawl — each read scans thousands of delete markers.", c: ["Hot partition", "Tombstone storm", "Compaction stall", "Read repair storm"], a: 1, n: "Deletes are writes; queue-like patterns are the classic cause. (NoSQL)" },
    { q: "User posts a comment, refreshes, it's gone — then reappears a minute later.", c: ["Split brain", "Write skew", "Replication-lag anomaly (read-your-writes)", "Lost update"], a: 2, n: "Read hit a lagging replica → leader reads or LSN tokens. (Consistency models)" },
    { q: "A shared dependency blipped for 5 s and the load balancer ejected every backend at once.", c: ["Outlier ejection", "Deep health-check cascade", "Panic threshold", "Gray failure"], a: 1, n: "Deep checks fail fleet-wide together — keep LB checks shallow. (Load balancing)" },
    { q: "Client got a 504, but the order exists — twice, after their retry.", c: ["Idempotency-key collision", "Timeout-ladder inversion", "Split brain", "At-most-once delivery"], a: 1, n: "Inner timeout > outer → work completes after caller gave up. Timeouts decrease inward. (Proxies & gateways)" },
    { q: "Pods die randomly under load with exit code 137.", c: ["CPU throttling", "OOMKill — memory limit exceeded", "Liveness-probe restart", "Node pressure eviction"], a: 1, n: "cgroup ceiling → OOM killer. Set limits from measured RSS. (Linux fundamentals)" },
    { q: "p99 spikes but average CPU looks low; cfs throttled_periods is climbing.", c: ["CPU throttling", "OOM pressure", "Run-queue saturation", "GC pauses"], a: 0, n: "CPU limits pause bursty services — the invisible p99 killer. (K8s autoscaling)" },
    { q: "After a gateway deploy, 2M clients reconnect at once and the auth tier melts.", c: ["Cache avalanche", "Reconnect thundering herd", "Metastable failure", "Retry storm"], a: 1, n: "Drain slowly, jitter reconnects — every socket fleet's deploy risk. (Chat case study)" },
    { q: "Kafka producers suddenly block; a broker fell out of the ISR and min.insync can't be met.", c: ["Rebalance storm", "ISR shrink durability stall", "Unclean leader election", "Hot partition"], a: 1, n: "Blocking beats losing acked data — that's the contract you chose. (Kafka)" }
  ];

  var OPS = [
    { name: "L1 cache reference", ns: 1 },
    { name: "Main-memory reference", ns: 100 },
    { name: "Compress 1 KB (snappy)", ns: 2000 },
    { name: "NVMe random read", ns: 50000 },
    { name: "Read 1 MB sequentially from NVMe", ns: 300000 },
    { name: "Round trip within one AZ", ns: 500000 },
    { name: "NVMe fsync", ns: 1000000 },
    { name: "HDD seek", ns: 8000000 },
    { name: "Cross-region round trip (same continent)", ns: 60000000 },
    { name: "Intercontinental round trip", ns: 200000000 }
  ];

  /* ---------------------------------------------------------- helpers */

  function fmt(ns) {
    if (ns < 1000) return ns + " ns";
    if (ns < 1e6) return (ns / 1000).toFixed(ns < 10000 ? 1 : 0) + " µs";
    if (ns < 1e9) return (ns / 1e6).toFixed(ns < 1e7 ? 1 : 0) + " ms";
    return (ns / 1e9).toFixed(1) + " s";
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function best(key) { return parseInt(localStorage.getItem("grail-arcade:" + key) || "0", 10); }
  function saveBest(key, score) {
    if (score > best(key)) { localStorage.setItem("grail-arcade:" + key, String(score)); return true; }
    return false;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* Build one quiz round: {q, choices:[{label, correct}], note} */
  function quizRounds(data) {
    return shuffle(data).slice(0, ROUNDS).map(function (item) {
      return {
        q: item.q,
        choices: item.c.map(function (label, i) { return { label: label, correct: i === item.a }; }),
        note: item.n
      };
    });
  }

  function fasterRounds() {
    var rounds = [], guard = 0;
    while (rounds.length < ROUNDS && guard++ < 500) {
      var pair = shuffle(OPS).slice(0, 2);
      var ratio = Math.max(pair[0].ns, pair[1].ns) / Math.min(pair[0].ns, pair[1].ns);
      if (ratio < 3) continue;
      rounds.push({
        q: "Which is faster?",
        choices: pair.map(function (op) { return { label: op.name, correct: op.ns === Math.min(pair[0].ns, pair[1].ns) }; }),
        note: pair.map(function (op) { return op.name + " ≈ " + fmt(op.ns); }).join("  ·  ")
      });
    }
    return rounds;
  }

  /* ---------------------------------------------------------- engine */

  function runGame(root, key, makeRounds) {
    root.replaceChildren();
    var rounds = makeRounds();
    var score = 0, idx = 0;

    var head = el("div", "arcade-head");
    var progress = el("span", "arcade-progress");
    var scoreEl = el("span", "arcade-score");
    head.appendChild(progress); head.appendChild(scoreEl);
    var qEl = el("p", "arcade-q");
    var choicesEl = el("div", "arcade-choices");
    var noteEl = el("p", "arcade-note");
    var nextBtn = el("button", "md-button arcade-next", "Next →");
    nextBtn.style.display = "none";
    root.appendChild(head); root.appendChild(qEl); root.appendChild(choicesEl);
    root.appendChild(noteEl); root.appendChild(nextBtn);

    function show() {
      var r = rounds[idx];
      progress.textContent = "Question " + (idx + 1) + " / " + rounds.length;
      scoreEl.textContent = "Score " + score;
      qEl.textContent = r.q;
      noteEl.textContent = "";
      nextBtn.style.display = "none";
      choicesEl.replaceChildren();
      shuffle(r.choices).forEach(function (ch) {
        var b = el("button", "arcade-choice", ch.label);
        b.addEventListener("click", function () {
          if (choicesEl.classList.contains("answered")) return;
          choicesEl.classList.add("answered");
          if (ch.correct) { score++; b.classList.add("correct"); }
          else {
            b.classList.add("wrong");
            Array.prototype.forEach.call(choicesEl.children, function (other) {
              if (other.dataset.correct === "1") other.classList.add("correct");
            });
          }
          scoreEl.textContent = "Score " + score;
          noteEl.textContent = r.note;
          nextBtn.style.display = "inline-block";
          nextBtn.textContent = idx + 1 < rounds.length ? "Next →" : "Finish";
        });
        b.dataset.correct = ch.correct ? "1" : "0";
        choicesEl.appendChild(b);
      });
      choicesEl.classList.remove("answered");
    }

    nextBtn.addEventListener("click", function () {
      idx++;
      if (idx < rounds.length) { show(); }
      else { finish(); }
    });

    function finish() {
      var isRecord = saveBest(key, score);
      root.replaceChildren();
      var end = el("div", "arcade-end");
      end.appendChild(el("p", "arcade-final", score + " / " + rounds.length));
      var verdict = score >= 9 ? "Staff-grade recall." : score >= 7 ? "Solid — re-drill the misses." : score >= 5 ? "The pages await you." : "Time for a re-read — start with the cheat sheets.";
      end.appendChild(el("p", "arcade-verdict", (isRecord ? "🏆 New personal best! " : "") + verdict));
      end.appendChild(el("p", "arcade-note", "Personal best: " + best(key) + " / " + ROUNDS));
      var again = el("button", "md-button md-button--primary", "Play again");
      again.addEventListener("click", function () { runGame(root, key, makeRounds); });
      end.appendChild(again);
      root.appendChild(end);
    }

    show();
  }

  function initStart(root, key, makeRounds) {
    if (root.dataset.init) return;
    root.dataset.init = "1";
    root.replaceChildren();
    var start = el("button", "md-button md-button--primary", "Start — " + ROUNDS + " questions");
    var bestEl = el("p", "arcade-note", best(key) ? "Personal best: " + best(key) + " / " + ROUNDS : "No score yet — set the bar.");
    start.addEventListener("click", function () { runGame(root, key, makeRounds); });
    root.appendChild(start);
    root.appendChild(bestEl);
  }

  var GAMES = {
    estimation: function (root) { initStart(root, "estimation", function () { return quizRounds(ESTIMATION); }); },
    failure: function (root) { initStart(root, "failure", function () { return quizRounds(FAILURES); }); },
    faster: function (root) { initStart(root, "faster", fasterRounds); }
  };

  function initAll() {
    document.querySelectorAll(".arcade-game").forEach(function (root) {
      var game = GAMES[root.dataset.game];
      if (game) game(root);
    });
  }

  if (typeof document$ !== "undefined") { document$.subscribe(initAll); }
  else { document.addEventListener("DOMContentLoaded", initAll); }
})();
