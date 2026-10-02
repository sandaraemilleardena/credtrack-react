import { useCallback, useEffect, useRef, useState } from "react";
import { actOnCredential, fetchCredentialQueue } from "../api/credentials";

export default function useCredentialQueue(role) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const lifecycle = useRef({ active: false, sequence: 0, locked: false });

  const refresh = useCallback(async () => {
    const state = lifecycle.current;
    const sequence = ++state.sequence;
    try {
      const data = await fetchCredentialQueue();
      if (!state.active || sequence !== state.sequence) return;
      if (data.role !== role) throw new Error(`Please sign in with a ${role} account to view this queue.`);
      setItems(data.requests);
      setSmsEnabled(data.sms_enabled);
      setError("");
    } catch (cause) {
      if (state.active && sequence === state.sequence) {
        setItems([]);
        setError(cause.message);
      }
    } finally {
      if (state.active && sequence === state.sequence) setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    const state = lifecycle.current;
    state.active = true;
    const initial = setTimeout(refresh, 0);
    const timer = setInterval(() => { if (!state.locked) refresh(); }, 15000);
    return () => { state.active = false; state.sequence++; clearTimeout(initial); clearInterval(timer); };
  }, [refresh]);

  const perform = async (item, action, note, schedule = {}) => {
    const state = lifecycle.current;
    if (state.locked) return null;
    state.locked = true;
    state.sequence++;
    setBusy(true);
    try {
      const updated = await actOnCredential(item, action, note, schedule);
      if (state.active) {
        setItems(previous => previous.map(row => row.id === updated.id ? updated : row));
        setError("");
      }
      return updated;
    } catch (cause) {
      await refresh();
      throw cause;
    } finally {
      state.locked = false;
      if (state.active) setBusy(false);
    }
  };
  return { items, error, loading, busy, smsEnabled, refresh, perform };
}
