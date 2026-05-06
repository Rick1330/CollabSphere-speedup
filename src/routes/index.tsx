import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Boxes,
  Cpu,
  GitBranch,
  Network,
  Shield,
  Terminal,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AHP — Agent Harness Protocol" },
      {
        name: "description",
        content:
          "AHP is an open protocol for orchestrating, sandboxing, and observing autonomous agents at scale.",
      },
      { property: "og:title", content: "AHP — Agent Harness Protocol" },
      {
        property: "og:description",
        content:
          "An open protocol for orchestrating, sandboxing, and observing autonomous agents.",
      },
    ],
  }),
  component: Index,
});

function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-mono text-sm font-bold">
          <span className="grid place-items-center w-7 h-7 rounded-md bg-primary text-primary-foreground">
            <Boxes className="w-4 h-4" />
          </span>
          <span>ahp<span className="text-primary">/</span>v0.4</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground font-mono">
          <a href="#protocol" className="hover:text-foreground transition">protocol</a>
          <a href="#runtime" className="hover:text-foreground transition">runtime</a>
          <a href="#docs" className="hover:text-foreground transition">docs</a>
          <a href="#changelog" className="hover:text-foreground transition">changelog</a>
        </nav>
        <a
          href="#install"
          className="font-mono text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-accent transition"
        >
          npm i @ahp/core
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-12">
      <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="relative flex flex-col items-center text-center gap-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-xs text-muted-foreground">
          <span className="pulse-dot" />
          <span>spec frozen · rfc-0014 shipping q3</span>
        </div>
        <h1 className="font-mono text-5xl md:text-7xl font-bold tracking-tight max-w-4xl">
          The harness layer for{" "}
          <span className="text-gradient">autonomous agents</span>.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">
          AHP is an open protocol for orchestrating, sandboxing, and observing
          long-running agents — so your tools, models, and policies stay
          interoperable across runtimes.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href="#install"
            className="group inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-3 font-mono text-sm font-semibold hover:bg-accent transition"
          >
            Read the spec
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
          </a>
          <a
            href="#runtime"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/40 px-5 py-3 font-mono text-sm text-foreground hover:border-primary/40 transition"
          >
            <Terminal className="w-4 h-4" />
            Try the runtime
          </a>
        </div>
      </div>
    </section>
  );
}

function CodeBlock() {
  return (
    <div className="bento-card scan-line p-6 md:p-7 h-full">
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-accent/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-primary/70" />
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">harness.ts</span>
      </div>
      <pre className="relative font-mono text-[13px] leading-relaxed text-muted-foreground overflow-x-auto">
{`import { Harness } from "@ahp/core";

const agent = new Harness({
  model: "gpt-5.1",
  policy: "least-privilege",
  sandbox: "wasm",
})
  .tool("fs.read", readFile)
  .tool("http.get", fetch)
  .on("step", (s) => trace.log(s));

await agent.run("ship the release notes");`}
      </pre>
    </div>
  );
}

const features = [
  {
    icon: Network,
    title: "Protocol-first",
    body: "A single wire format for tool calls, traces, and policy across vendors.",
  },
  {
    icon: Shield,
    title: "Sandboxed by default",
    body: "WASM and microVM isolation with capability-scoped tool grants.",
  },
  {
    icon: GitBranch,
    title: "Deterministic replay",
    body: "Every step recorded. Branch any decision, re-run with new prompts.",
  },
  {
    icon: Cpu,
    title: "Model agnostic",
    body: "Drop-in adapters for OpenAI, Anthropic, local llama.cpp and vLLM.",
  },
];

function Bento() {
  return (
    <section id="protocol" className="mx-auto max-w-7xl px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-5 auto-rows-[minmax(200px,auto)]">
        {/* Big code card */}
        <div className="md:col-span-4 md:row-span-2">
          <CodeBlock />
        </div>

        {/* Stat */}
        <div className="md:col-span-2 bento-card p-7 flex flex-col justify-between">
          <span className="font-mono text-xs text-muted-foreground">throughput</span>
          <div>
            <div className="font-mono text-5xl font-bold text-gradient">12.4k</div>
            <div className="text-sm text-muted-foreground mt-1">
              steps / sec on a single node
            </div>
          </div>
        </div>

        {/* Pulse */}
        <div className="md:col-span-2 bento-card p-7 flex flex-col justify-between">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="pulse-dot" /> live mesh
          </div>
          <div className="flex items-end gap-1 h-20">
            {[40, 65, 30, 80, 55, 90, 45, 70, 60, 95, 50, 75].map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-sm bg-primary/70"
                style={{
                  height: `${h}%`,
                  opacity: 0.4 + (h / 100) * 0.6,
                }}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            48 agents · 6 regions · p99 41ms
          </div>
        </div>

        {/* Features */}
        {features.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="md:col-span-3 lg:col-span-3 bento-card p-7 flex flex-col gap-3"
          >
            <div className="grid place-items-center w-10 h-10 rounded-lg bg-secondary text-primary float-slow">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-mono text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Install() {
  return (
    <section id="install" className="mx-auto max-w-7xl px-6 py-16">
      <div className="bento-card p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="max-w-xl">
          <div className="font-mono text-xs text-primary mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> get started
          </div>
          <h2 className="font-mono text-3xl md:text-4xl font-bold mb-3">
            One install. Any agent.
          </h2>
          <p className="text-muted-foreground">
            The reference runtime ships as a single binary and a typed SDK.
            Bring your model, your tools, your traces.
          </p>
        </div>
        <div className="w-full md:w-auto bg-background/60 border border-border rounded-lg px-5 py-4 font-mono text-sm flex items-center gap-3">
          <span className="text-primary">$</span>
          <span>curl -fsSL ahp.dev/install | sh</span>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-muted-foreground">
        <div>© 2026 AHP working group · MIT licensed</div>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-foreground transition">github</a>
          <a href="#" className="hover:text-foreground transition">discord</a>
          <a href="#" className="hover:text-foreground transition">rfcs</a>
        </div>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <Bento />
      <Install />
      <Footer />
    </div>
  );
}
