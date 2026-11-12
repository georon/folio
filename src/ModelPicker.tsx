import { useEffect, useState } from "react";
import { saveAiPreference } from "./ai";
import { readSetting } from "./preferences";

interface PickerProps {
  /** Where the chosen model is saved; the Ask AI panel reads the same key. */
  storageKey: string;
  load: () => Promise<{ models?: ProviderModel[]; error?: string }>;
  validId: (id: string) => boolean;
  idExample: string;
}

/** Searches the provider's models, or takes a typed model ID. Used by custom endpoints. */
export function ModelPicker({ storageKey, load, validId, idExample }: PickerProps) {
  const [model, setModel] = useState(() => readSetting(storageKey) ?? "");
  const [editing, setEditing] = useState(!model);
  const [query, setQuery] = useState("");
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!editing) return;
    let current = true;
    setLoading(true);
    setError("");
    load().then(result => {
      if (!current) return;
      setModels(result.models ?? []);
      setError(result.error ?? "");
    }).catch(() => { if (current) setError("Couldn't load models. You can enter a model ID."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [load, editing]);
  const select = (id: string) => {
    saveAiPreference(storageKey, id);
    setModel(id); setEditing(false); setQuery("");
  };
  const typed = query.trim();
  const matches = models.filter(m => (m.name + " " + m.id).toLowerCase().includes(typed.toLowerCase()));
  const custom = validId(typed) && !models.some(m => m.id === typed);
  if (!editing) return <div className="settings-row"><div className="settings-label"><span>Model</span><small>{model}</small></div>
    <button className="btn ghost" onClick={() => setEditing(true)}>Change model</button></div>;
  return <div className="router-model-picker">
    <label htmlFor="router-model">Model</label>
    <input id="router-model" type="search" placeholder="Search models or enter an ID" maxLength={256} value={query}
      onChange={event => setQuery(event.target.value)} />
    <div className="router-models" aria-label="Available models">
      {matches.map(m => <button key={m.id} onClick={() => select(m.id)}>
        <span>{m.name}<small>{m.id}</small></span>
        {m.contextLength && <small title="Context window in tokens">{m.contextLength.toLocaleString()} tokens</small>}
      </button>)}
      {custom && <button onClick={() => select(typed)}>Use {typed}</button>}
    </div>
    {loading && <small role="status">Loading models…</small>}
    {!loading && !error && !matches.length && !custom && <small>No matching models. You can enter an ID such as {idExample}.</small>}
    {error && <small role="status">{error}</small>}
    {model && <button className="link small" onClick={() => { setEditing(false); setQuery(""); }}>Cancel</button>}
  </div>;
}
