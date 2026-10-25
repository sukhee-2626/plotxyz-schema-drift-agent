import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  History,
  Layers,
  Loader2,
  Network,
  Play,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { agent } from "./agentConfig";

const API = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000"
).replace(/\/$/, "");

type Values = Record<string, string | boolean>;
type JsonRecord = Record<string, unknown>;

interface ProviderStatus {
  ollama_compatible: boolean;
  openai_compatible: boolean;
}

interface Meta {
  agent: string;
  title: string;
  tagline: string;
  version: string;
  features: string[];
  limitations: string[];
  providers: ProviderStatus;
  max_payload_chars: number;
}

interface AgentResult {
  agent: string;
  summary: string;
  result: JsonRecord;
  warnings: string[];
  task_id: number | null;
}

interface HistoryItem {
  id: number;
  created_at: string;
  summary: string;
  payload: JsonRecord;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function display(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function blankValues(): Values {
  const next: Values = {};
  for (const field of agent.fields) next[field.name] = field.type === "checkbox" ? false : "";
  return next;
}

function sampleValues(): Values {
  const next: Values = {};
  for (const field of agent.fields) {
    const sample = agent.sample[field.name];
    next[field.name] = field.type === "checkbox" ? Boolean(sample) : sample === undefined ? "" : String(sample);
  }
  return next;
}

function GraphView({ graph }: { graph: JsonRecord }) {
  const nodes = (Array.isArray(graph.nodes) ? graph.nodes : []).filter(isRecord).slice(0, 16);
  const edges = (Array.isArray(graph.edges) ? graph.edges : []).filter(isRecord);
  if (nodes.length === 0) return null;
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
    positions.set(String(node.id ?? node.label ?? index), {
      x: 320 + 125 * Math.cos(angle),
      y: 165 + 120 * Math.sin(angle),
    });
  });
  return (
    <div className="panel graph-panel">
      <h3>
        <Network size={16} /> Relationship graph
      </h3>
      <svg viewBox="0 0 640 340" role="img" aria-label="Relationship graph">
        {edges.map((edge, index) => {
          const source = positions.get(String(edge.source ?? ""));
          const target = positions.get(String(edge.target ?? ""));
          if (!source || !target) return null;
          return (
            <line
              key={`edge-${index}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              className="graph-edge"
            />
          );
        })}
        {nodes.map((node, index) => {
          const id = String(node.id ?? node.label ?? index);
          const position = positions.get(id);
          if (!position) return null;
          return (
            <g key={`node-${id}`}>
              <circle cx={position.x} cy={position.y} r={6} className="graph-node" />
              <text x={position.x} y={position.y - 13} textAnchor="middle" className="graph-label">
                {String(node.label ?? id).slice(0, 24)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ChartView({ chart }: { chart: JsonRecord }) {
  const values = (Array.isArray(chart.values) ? chart.values : []).map((value) => Number(value) || 0).slice(0, 16);
  const labels = (Array.isArray(chart.labels) ? chart.labels : []).map(String).slice(0, 16);
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="panel">
      <h3>
        <BarChart3 size={16} /> Chart
      </h3>
      <div className="chart" role="img" aria-label="Bar chart">
        {values.map((value, index) => (
          <div className="chart-column" key={`bar-${index}`}>
            <span className="chart-value">{value.toLocaleString()}</span>
            <div className="chart-bar" style={{ height: `${Math.max(4, (value / max) * 100)}%` }} />
            <span className="chart-label">{labels[index] ?? index + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableView({ table }: { table: JsonRecord }) {
  const columns = (Array.isArray(table.columns) ? table.columns : []).map(String);
  const rows = (Array.isArray(table.rows) ? table.rows : []).filter(Array.isArray) as unknown[][];
  if (columns.length === 0) return null;
  return (
    <div className="panel table-panel">
      <h3>
        <FileText size={16} /> Result table
      </h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="muted">No rows returned.</td></tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`row-${index}`}>
                  {columns.map((_, cell) => <td key={`cell-${cell}`}>{display(row[cell])}</td>)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResultView({ result }: { result: AgentResult }) {
  const data = result.result;
  const metrics = isRecord(data.metrics) ? data.metrics : null;
  const findings = (Array.isArray(data.findings) ? data.findings : []).filter(isRecord);
  const items = (Array.isArray(data.items) ? data.items : []).filter((item) => typeof item === "string") as string[];
  const patches = (Array.isArray(data.patches) ? data.patches : []).filter(isRecord);
  return (
    <div className="result-stack">
      <div className="summary">
        <CheckCircle2 size={20} />
        <div>
          <span>Agent summary</span>
          <p>{result.summary}</p>
        </div>
      </div>
      {result.warnings.length > 0 && (
        <div className="warnings">
          <AlertTriangle size={17} />
          <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      )}
      {metrics && Object.keys(metrics).length > 0 && (
        <div className="metric-grid">
          {Object.entries(metrics).map(([key, value]) => (
            <div className="metric" key={key}>
              <span>{key.replace(/_/g, " ")}</span>
              <strong>{display(value)}</strong>
            </div>
          ))}
        </div>
      )}
      {findings.length > 0 && (
        <div className="panel">
          <h3><AlertTriangle size={16} /> Findings</h3>
          <ul className="findings">
            {findings.map((finding, index) => (
              <li key={`finding-${index}`} className={`finding sev-${String(finding.severity ?? "info")}`}>
                <span className="sev-label">{String(finding.severity ?? "info")}</span>
                <div>
                  <strong>{display(finding.title)}</strong>
                  <p>{display(finding.detail)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {isRecord(data.table) && <TableView table={data.table} />}
      {isRecord(data.graph) && <GraphView graph={data.graph} />}
      {isRecord(data.chart) && <ChartView chart={data.chart} />}
      {patches.length > 0 && (
        <div className="panel">
          <h3><Wrench size={16} /> Proposed patches</h3>
          {patches.map((patch, index) => (
            <div className="patch" key={`patch-${index}`}>
              <strong>{display(patch.title)}</strong>
              <div className="patch-grid">
                <div><span>Before</span><pre>{display(patch.before)}</pre></div>
                <div><span>After</span><pre>{display(patch.after)}</pre></div>
              </div>
            </div>
          ))}
        </div>
      )}
      {typeof data.markdown === "string" && (
        <div className="panel">
          <h3><FileText size={16} /> Generated document</h3>
          <pre className="markdown">{data.markdown}</pre>
        </div>
      )}
      {items.length > 0 && (
        <div className="panel">
          <h3><Layers size={16} /> Recommended next steps</h3>
          <ul className="chips">{items.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}
      {data.data !== undefined && (
        <div className="panel">
          <h3><Layers size={16} /> Output data</h3>
          <pre className="code">{JSON.stringify(data.data, null, 2)}</pre>
        </div>
      )}
      {(typeof data.patched_code === "string" || typeof data.refactored_code === "string") && (
        <details className="panel raw">
          <summary>View proposed code</summary>
          <pre className="code">{String(data.patched_code ?? data.refactored_code)}</pre>
        </details>
      )}
      <details className="panel raw">
        <summary>Raw JSON</summary>
        <pre className="code">{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );
}

export default function App() {
  const [values, setValues] = useState<Values>(sampleValues);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const provider = meta?.providers;
  const providerActive = Boolean(provider?.ollama_compatible || provider?.openai_compatible);

  useEffect(() => {
    void loadMeta();
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMeta() {
    try {
      const response = await fetch(`${API}/api/meta`);
      if (response.ok) setMeta((await response.json()) as Meta);
    } catch {
      /* The status pill stays in deterministic mode if the API is offline. */
    }
  }

  async function loadHistory() {
    try {
      const response = await fetch(`${API}/api/history?limit=12`);
      if (!response.ok) return;
      const data = (await response.json()) as { items?: HistoryItem[] };
      setHistory(Array.isArray(data.items) ? data.items : []);
    } catch {
      /* History is optional; the main workflow remains usable. */
    }
  }

  function loadSample() {
    setValues(sampleValues());
    setResult(null);
    setError("");
  }

  function clearForm() {
    setValues(blankValues());
    setResult(null);
    setError("");
  }

  async function runAgent(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    const payload: JsonRecord = {};
    for (const field of agent.fields) {
      const value = values[field.name];
      if (field.type === "checkbox") payload[field.name] = Boolean(value);
      else if (field.type === "number") {
        if (value !== "") payload[field.name] = Number(value);
      } else payload[field.name] = value;
    }
    try {
      const response = await fetch(`${API}/api/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const body = (await response.json().catch(() => ({}))) as { detail?: string };
      if (!response.ok) throw new Error(body.detail || `Request failed with status ${response.status}`);
      setResult(body as unknown as AgentResult);
      await loadHistory();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The agent request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access was denied. Use Export instead.");
    }
  }

  function exportResult() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${agent.slug}-result.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function restore(item: HistoryItem) {
    const next: Values = {};
    for (const field of agent.fields) {
      const value = item.payload[field.name];
      next[field.name] = field.type === "checkbox" ? Boolean(value) : value === undefined ? "" : String(value);
    }
    setValues(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function clearHistory() {
    if (!window.confirm("Delete the local task history for this agent?")) return;
    try {
      await fetch(`${API}/api/history`, { method: "DELETE" });
      setHistory([]);
    } catch {
      setError("Could not clear history while the API is offline.");
    }
  }

  return (
    <div className="app" style={{ "--accent": agent.accent } as CSSProperties}>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="PlotXYZ.ai home">
          <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" className="brand-mark">
            <rect x="4" y="20" width="6" height="12" rx="2" fill="currentColor" />
            <rect x="15" y="11" width="6" height="21" rx="2" fill="currentColor" opacity="0.72" />
            <rect x="26" y="4" width="6" height="28" rx="2" fill="currentColor" opacity="0.45" />
            <circle cx="29" cy="7" r="3.2" fill="var(--accent)" />
          </svg>
          <span className="brand-text"><strong>PlotXYZ<span>.ai</span></strong><small>Agents</small></span>
        </a>
        <nav className="nav" aria-label="Main navigation">
          <a href="#workspace">Workspace</a>
          <a href={`${API}/docs`} target="_blank" rel="noreferrer">API docs <ExternalLink size={13} /></a>
          <button type="button" className="icon-button" onClick={() => setShowSettings((open) => !open)} aria-expanded={showSettings} aria-label="Toggle settings">
            <Settings2 size={18} />
          </button>
        </nav>
        <span className={`provider ${providerActive ? "on" : ""}`} title={providerActive ? "A model provider is configured" : "Deterministic baseline mode"}>
          <span className="provider-dot" />
          {providerActive ? "Provider connected" : "Deterministic mode"}
        </span>
      </header>

      {showSettings && (
        <section className="settings-bar" aria-label="Settings and provider status">
          <div><span>API endpoint</span><code>{API}</code></div>
          <div><span>Agent version</span><code>{meta?.version ?? "1.0.0"}</code></div>
          <div><span>Ollama adapter</span><code>{provider?.ollama_compatible ? "configured" : "not configured"}</code></div>
          <div><span>OpenAI-compatible</span><code>{provider?.openai_compatible ? "configured" : "not configured"}</code></div>
          <div><span>Payload limit</span><code>{meta?.max_payload_chars?.toLocaleString() ?? "200,000"} chars</code></div>
          <div><span>Docs</span><a href={`${API}/docs`} target="_blank" rel="noreferrer">OpenAPI <ExternalLink size={12} /></a></div>
        </section>
      )}

      <section className="hero" id="top">
        <div className="eyebrow"><Sparkles size={14} /> PlotXYZ.ai · specialized intelligence</div>
        <h1>{agent.title}</h1>
        <p className="tagline">{agent.tagline}</p>
        <p className="purpose">{agent.purpose}</p>
        <div className="chips hero-chips">
          {agent.features.map((feature) => <span key={feature}>{feature}</span>)}
        </div>
      </section>

      <main id="workspace" className="workspace">
        <section className="card form-card">
          <div className="card-head">
            <h2>Run the agent</h2>
            <span className="step">01 · Input</span>
          </div>
          <form onSubmit={runAgent}>
            {agent.fields.map((field) => (
              <div className="field" key={field.name}>
                {field.type === "checkbox" ? (
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(values[field.name])}
                      onChange={(event) => setValues({ ...values, [field.name]: event.target.checked })}
                    />
                    <span>{field.label}</span>
                  </label>
                ) : (
                  <>
                    <label htmlFor={field.name}>{field.label}</label>
                    {field.type === "textarea" ? (
                      <textarea
                        id={field.name}
                        rows={field.rows ?? 4}
                        placeholder={field.placeholder}
                        value={String(values[field.name] ?? "")}
                        onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                      />
                    ) : (
                      <input
                        id={field.name}
                        type={field.type === "number" ? "number" : "text"}
                        placeholder={field.placeholder}
                        value={String(values[field.name] ?? "")}
                        onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
            <div className="actions">
              <button className="primary" type="submit" disabled={loading}>
                {loading ? <Loader2 size={17} className="spin" /> : <Play size={17} />}
                {loading ? "Running…" : "Run agent"}
              </button>
              <button className="ghost" type="button" onClick={loadSample}>
                <Sparkles size={16} /> Sample data
              </button>
              <button className="ghost" type="button" onClick={clearForm}>
                <RefreshCw size={15} /> Clear
              </button>
            </div>
          </form>
          <p className="hint"><ShieldCheck size={14} /> Sample data is prefilled for a fast demo. Clear it to enter your own. Deterministic baseline — no paid API key required.</p>
        </section>

        <section className="card result-card" aria-live="polite">
          <div className="card-head">
            <h2>Structured result</h2>
            {result && (
              <div className="result-tools">
                <button type="button" className="ghost small" onClick={copyResult}>
                  <Copy size={14} /> {copied ? "Copied" : "Copy"}
                </button>
                <button type="button" className="ghost small" onClick={exportResult}>
                  <Download size={14} /> Export
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="error" role="alert">
              <AlertTriangle size={18} />
              <p>{error}</p>
              <button type="button" className="icon-button" onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button>
            </div>
          )}

          {loading && (
            <div className="empty">
              <Loader2 size={30} className="spin" />
              <h3>Running deterministic checks</h3>
              <p>The agent is validating inputs and building a structured result.</p>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="empty">
              <Gauge size={34} />
              <h3>Ready when you are</h3>
              <p>Sample data is ready in the form. Run the agent now, or replace it with your own data. Results include findings, tables, charts, and exportable JSON.</p>
              <button type="button" className="ghost" onClick={loadSample}><ArrowRight size={15} /> Try the sample</button>
            </div>
          )}

          {!loading && result && <ResultView result={result} />}
        </section>
      </main>

      <section className="card history-card">
        <div className="card-head">
          <h2><History size={18} /> Local task history</h2>
          <button type="button" className="ghost small" onClick={clearHistory} disabled={history.length === 0}>
            <Trash2 size={14} /> Clear
          </button>
        </div>
        {history.length === 0 ? (
          <p className="muted">Completed runs appear here. History is stored in the backend's local SQLite database.</p>
        ) : (
          <ul className="history-list">
            {history.map((item) => (
              <li key={item.id}>
                <button type="button" className="history-item" onClick={() => restore(item)}>
                  <span>{item.summary}</span>
                  <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="agent-notes">
        <div>
          <h3>What this agent does</h3>
          <ul>{agent.features.map((feature) => <li key={feature}><CheckCircle2 size={15} /> {feature}</li>)}</ul>
        </div>
        <div>
          <h3>Honest limitations</h3>
          <ul>{agent.limitations.map((limitation) => <li key={limitation}><AlertTriangle size={15} /> {limitation}</li>)}</ul>
        </div>
      </section>

      <footer>
        <span>PlotXYZ.ai Agents · Specialized intelligence. One connected workspace.</span>
        <span className="footer-links">
          <a href="https://github.com/sukhee-2626" target="_blank" rel="noreferrer">GitHub <ExternalLink size={12} /></a>
          <a href={`${API}/docs`} target="_blank" rel="noreferrer">API <ExternalLink size={12} /></a>
        </span>
      </footer>
    </div>
  );
}
