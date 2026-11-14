import { Client } from "@stomp/stompjs";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

const demoItems = [
  {
    id: 1,
    sku: "SKU-100",
    name: "Drift Alloy",
    quantity: 24,
    updatedAt: "2026-04-29T11:45:00Z",
    version: 3,
  },
  {
    id: 2,
    sku: "SKU-210",
    name: "Mesa Coil",
    quantity: 61,
    updatedAt: "2026-04-29T11:42:00Z",
    version: 2,
  },
  {
    id: 3,
    sku: "SKU-405",
    name: "Shoreline Circuit",
    quantity: 14,
    updatedAt: "2026-04-29T11:37:00Z",
    version: 5,
  },
];

const demoPeers = [
  {
    id: 1,
    ipAddress: "10.0.0.12",
    status: "ACTIVE",
    lastSeen: "2026-04-29T11:44:20Z",
  },
  {
    id: 2,
    ipAddress: "10.0.0.22",
    status: "ACTIVE",
    lastSeen: "2026-04-29T11:43:58Z",
  },
];

const architecture = [
  {
    title: "Controllers",
    description:
      "Thin HTTP and STOMP entrypoints. Validation only, no business logic.",
  },
  {
    title: "Services",
    description:
      "Conflict resolution, sync policy, and broadcast orchestration.",
  },
  {
    title: "Repositories",
    description: "Transactional persistence and optimistic locking with JPA.",
  },
];

const formatTime = (value) => {
  if (!value) {
    return "n/a";
  }
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const parseNumber = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return NaN;
  }
  return Math.trunc(parsed);
};

const normalizeSku = (value) => (value || "").trim();

const getApiBase = () => import.meta.env.VITE_API_BASE || "";

const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  if (window.location.port && window.location.port !== "8080") {
    return `${protocol}://localhost:8080/ws`;
  }
  return `${protocol}://${window.location.host}/ws`;
};

export default function App() {
  const [items, setItems] = useState(demoItems);
  const [peers, setPeers] = useState(demoPeers);
  const [events, setEvents] = useState([]);
  const [usingDemo, setUsingDemo] = useState(true);
  const [wsStatus, setWsStatus] = useState("connecting");
  const [apiStatus, setApiStatus] = useState("checking");
  const [lastSync, setLastSync] = useState(null);
  const [actionStatus, setActionStatus] = useState(null);
  const [busyAction, setBusyAction] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createForm, setCreateForm] = useState({
    sku: "",
    name: "",
    quantity: "",
  });
  const [updateForm, setUpdateForm] = useState({
    sku: "",
    name: "",
    quantity: "",
  });
  const [searchSku, setSearchSku] = useState("");
  const [syncForm, setSyncForm] = useState({
    sku: "",
    name: "",
    quantity: "",
    version: "",
    updatedAt: "",
    sourceNodeIp: "",
  });
  const [buyItemTarget, setBuyItemTarget] = useState(null);
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_GEMINI_API_KEY";
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const clientRef = useRef(null);
  const apiBase = useMemo(() => getApiBase(), []);

  useEffect(() => {
    if (!actionStatus) {
      return undefined;
    }
    const timer = setTimeout(() => setActionStatus(null), 6000);
    return () => clearTimeout(timer);
  }, [actionStatus]);

  useEffect(() => {
    if (!updateForm.sku) {
      return;
    }
    const match = items.find((item) => item.sku === updateForm.sku);
    if (!match) {
      return;
    }
    setUpdateForm((prev) => {
      if (prev.name || prev.quantity !== "") {
        return prev;
      }
      return {
        ...prev,
        name: match.name || "",
        quantity: match.quantity ?? "",
      };
    });
  }, [items, updateForm.sku]);

  const showStatus = (type, message) => {
    setActionStatus({ type, message });
  };

  const readErrorMessage = async (response) => {
    const text = await response.text();
    if (!text) {
      return response.statusText || "Request failed";
    }
    try {
      const parsed = JSON.parse(text);
      return parsed.message || parsed.error || text;
    } catch (error) {
      return text;
    }
  };

  const upsertItem = (payload) => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.sku === payload.sku);
      if (index === -1) {
        return [payload, ...prev];
      }
      const updated = [...prev];
      updated[index] = { ...updated[index], ...payload };
      return updated;
    });
  };

  const fetchItems = async (signal) => {
    const response = await fetch(`${apiBase}/api/inventory/items`, { signal });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
    const data = await response.json();
    setItems(data);
    setUsingDemo(false);
    setApiStatus("online");
  };

  const fetchPeers = async (signal) => {
    const response = await fetch(`${apiBase}/api/peers`, { signal });
    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
    const data = await response.json();
    setPeers(data);
  };

  const refreshAll = async () => {
    const controller = new AbortController();
    setRefreshing(true);
    try {
      await Promise.all([
        fetchItems(controller.signal),
        fetchPeers(controller.signal),
      ]);
      showStatus("success", "Inventory and peers refreshed.");
    } catch (error) {
      setUsingDemo(true);
      setApiStatus("offline");
      setItems(demoItems);
      setPeers(demoPeers);
      showStatus("error", error.message || "Unable to refresh data.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const bootstrap = async () => {
      try {
        await Promise.all([
          fetchItems(controller.signal),
          fetchPeers(controller.signal),
        ]);
      } catch (error) {
        setUsingDemo(true);
        setApiStatus("offline");
        setItems(demoItems);
        setPeers(demoPeers);
      }
    };

    bootstrap();

    const peerInterval = setInterval(() => {
      fetchPeers(controller.signal).catch(() => {
        setPeers(demoPeers);
      });
    }, 20000);

    return () => {
      controller.abort();
      clearInterval(peerInterval);
    };
  }, [apiBase]);

  const connectWebSocket = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
    }
    setWsStatus("connecting");
    
    const client = new Client({
      brokerURL: getWsUrl(),
      reconnectDelay: 5000,
      onConnect: () => {
        setWsStatus("connected");
        setApiStatus("online");
        client.subscribe("/topic/inventory", (message) => {
          try {
            const payload = JSON.parse(message.body);
            upsertItem(payload);
            const event = {
              sku: payload.sku,
              quantity: payload.quantity,
              updatedAt: payload.updatedAt,
            };
            setEvents((prev) => [event, ...prev].slice(0, 6));
            setLastSync(payload.updatedAt || new Date().toISOString());
          } catch (error) {
            setWsStatus("error");
          }
        });
      },
      onStompError: () => setWsStatus("error"),
      onWebSocketClose: () => setWsStatus("disconnected"),
    });

    client.activate();
    clientRef.current = client;
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [connectWebSocket]);

  const handleCreate = async (event) => {
    event.preventDefault();
    const sku = normalizeSku(createForm.sku);
    const name = createForm.name.trim();
    const quantityValue = parseNumber(createForm.quantity);

    if (!sku || !name) {
      showStatus("error", "SKU and name are required for creation.");
      return;
    }
    if (
      quantityValue === null ||
      Number.isNaN(quantityValue) ||
      quantityValue < 0
    ) {
      showStatus("error", "Quantity must be a non-negative integer.");
      return;
    }

    setBusyAction(true);
    try {
      const response = await fetch(`${apiBase}/api/inventory/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, name, quantity: quantityValue }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = await response.json();
      upsertItem(payload);
      setUsingDemo(false);
      setApiStatus("online");
      setCreateForm({ sku: "", name: "", quantity: "" });
      showStatus("success", `Created ${payload.sku}.`);
    } catch (error) {
      showStatus("error", error.message || "Unable to create item.");
    } finally {
      setBusyAction(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    const sku = normalizeSku(updateForm.sku);
    const name = updateForm.name.trim();
    const quantityValue = parseNumber(updateForm.quantity);

    if (!sku) {
      showStatus("error", "SKU is required for update.");
      return;
    }

    if (!name && quantityValue === null) {
      showStatus("error", "Provide a name or quantity to update.");
      return;
    }

    if (
      quantityValue !== null &&
      (Number.isNaN(quantityValue) || quantityValue < 0)
    ) {
      showStatus("error", "Quantity must be a non-negative integer.");
      return;
    }

    const payload = {};
    if (name) {
      payload.name = name;
    }
    if (quantityValue !== null) {
      payload.quantity = quantityValue;
    }

    setBusyAction(true);
    try {
      const response = await fetch(
        `${apiBase}/api/inventory/items/${encodeURIComponent(sku)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const updated = await response.json();
      upsertItem(updated);
      setUsingDemo(false);
      setApiStatus("online");
      setUpdateForm({ sku, name: "", quantity: "" });
      showStatus("success", `Updated ${updated.sku}.`);
    } catch (error) {
      showStatus("error", error.message || "Unable to update item.");
    } finally {
      setBusyAction(false);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    const sku = normalizeSku(searchSku);
    if (!sku) {
      showStatus("error", "Enter a SKU to search.");
      return;
    }

    setBusyAction(true);
    try {
      const response = await fetch(
        `${apiBase}/api/inventory/items/${encodeURIComponent(sku)}`,
      );
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
      const payload = await response.json();
      upsertItem(payload);
      setUsingDemo(false);
      setApiStatus("online");
      showStatus("success", `Fetched ${payload.sku}.`);
    } catch (error) {
      showStatus("error", error.message || "Unable to fetch item.");
    } finally {
      setBusyAction(false);
    }
  };

  const openBuyChat = (item) => {
    setBuyItemTarget(item);
    setChatMessages([{ role: "model", parts: [{ text: `Hello! I can help you purchase ${item.name} (SKU: ${item.sku}). You currently have ${item.quantity} in stock. How many would you like to buy?` }] }]);
  };

  const closeBuyChat = () => {
    setBuyItemTarget(null);
    setChatMessages([]);
  };

  const executeBuy = async (sku, quantity) => {
    setBusyAction(true);
    try {
      const response = await fetch(`${apiBase}/api/inventory/items/${encodeURIComponent(sku)}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity })
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
      const updated = await response.json();
      upsertItem(updated);
      showStatus("success", `Order successful for ${quantity} of ${sku}.`);
      closeBuyChat();
    } catch (error) {
      showStatus("error", error.message || "Failed to buy item.");
      setChatMessages((prev) => [...prev, { role: "model", parts: [{ text: `Error processing order: ${error.message}` }] }]);
    } finally {
      setBusyAction(false);
    }
  };

  const handleGeminiChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) {
      return;
    }

    if (!geminiApiKey || geminiApiKey === "YOUR_GEMINI_API_KEY") {
      setChatMessages((prev) => [...prev, { role: "model", parts: [{ text: "Error: Please configure VITE_GEMINI_API_KEY in your .env file and restart the dev server." }] }]);
      return;
    }

    const newMessage = { role: "user", parts: [{ text: chatInput }] };
    const history = [...chatMessages, newMessage];
    setChatMessages(history);
    setChatInput("");
    setChatLoading(true);

    try {
      const systemInstruction = `You are a purchasing assistant. The user wants to buy '${buyItemTarget.name}' (SKU: ${buyItemTarget.sku}, Available: ${buyItemTarget.quantity}). If they want to buy a specific quantity, ask them to confirm. If they confirm, reply EXACTLY with the JSON: {"action": "buy", "quantity": <number>}. Otherwise, help them with their request. Do not format the JSON in markdown blocks, just return the raw JSON string if confirming the order.`;
      
      const payload = {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: history,
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Failed to get response from Gemini.");
      }

      const data = await response.json();
      const textResponse = data.candidates[0].content.parts[0].text;
      
      try {
        const action = JSON.parse(textResponse);
        if (action.action === "buy" && action.quantity) {
          setChatMessages((prev) => [...prev, { role: "model", parts: [{ text: `Buying ${action.quantity} units of ${buyItemTarget.name}...` }] }]);
          await executeBuy(buyItemTarget.sku, action.quantity);
          return;
        }
      } catch (e) {
      }

      setChatMessages((prev) => [...prev, { role: "model", parts: [{ text: textResponse }] }]);

    } catch (err) {
      showStatus("error", err.message);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSyncSend = (event) => {
    event.preventDefault();
    if (!clientRef.current || wsStatus !== "connected") {
      showStatus("error", "WebSocket is not connected.");
      return;
    }

    const sku = normalizeSku(syncForm.sku);
    const name = syncForm.name.trim();
    const quantityValue = parseNumber(syncForm.quantity);
    const versionValue = parseNumber(syncForm.version);
    const sourceNodeIp = syncForm.sourceNodeIp.trim() || "ui-node";

    if (
      !sku ||
      quantityValue === null ||
      Number.isNaN(quantityValue) ||
      quantityValue < 0
    ) {
      showStatus("error", "SKU and a non-negative quantity are required.");
      return;
    }

    let updatedAt = syncForm.updatedAt.trim();
    if (updatedAt) {
      const parsed = new Date(updatedAt);
      if (Number.isNaN(parsed.getTime())) {
        showStatus("error", "updatedAt must be a valid ISO timestamp.");
        return;
      }
      updatedAt = parsed.toISOString();
    } else {
      updatedAt = new Date().toISOString();
    }

    const payload = {
      sku,
      quantity: quantityValue,
      updatedAt,
      sourceNodeIp,
    };

    if (name) {
      payload.name = name;
    }
    if (versionValue !== null && !Number.isNaN(versionValue)) {
      payload.version = versionValue;
    }

    clientRef.current.publish({
      destination: "/app/inventory.sync",
      body: JSON.stringify(payload),
    });

    setSyncForm({
      sku: "",
      name: "",
      quantity: "",
      version: "",
      updatedAt: "",
      sourceNodeIp: "",
    });
    showStatus("success", `Sync message sent for ${sku}.`);
  };

  const metrics = useMemo(() => {
    const totalUnits = items.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0,
    );
    return [
      { label: "Items", value: items.length },
      { label: "Units", value: totalUnits },
      { label: "Peers", value: peers.length },
      { label: "Last sync", value: lastSync ? formatTime(lastSync) : "n/a" },
    ];
  }, [items, peers, lastSync]);

  return (
    <div className="app">
      <header className="nav">
        <div className="brand">StockSync</div>
        <nav className="nav-links">
          <a href="#inventory">Inventory</a>
          <a href="#pulse">Pulse</a>
          <a href="#architecture">Architecture</a>
          <a href="/swagger-ui" target="_blank" rel="noreferrer">
            Swagger
          </a>
        </nav>
        <div className="nav-status">
          <span className={`status-dot ${wsStatus}`}></span>
          <span className="status-text">{wsStatus}</span>
          <span className={`api-pill ${apiStatus}`}>{apiStatus}</span>
        </div>
      </header>
      {actionStatus && (
        <div className={`notice ${actionStatus.type}`}>
          {actionStatus.message}
        </div>
      )}

      <section className="hero reveal" style={{ "--delay": "0.05s" }}>
        <div className="hero-content">
          <p className="eyebrow">Distributed Inventory Sync</p>
          <h1>Real-time stock clarity across every peer node.</h1>
          <p className="hero-copy">
            StockSync orchestrates inventory updates across the edge. Conflict
            resolution, optimistic locking, and a live sync pulse give your
            teams the confidence to move fast.
          </p>
          <div className="hero-actions">
            <a className="btn primary" href="#inventory">
              View inventory
            </a>
            <a className="btn ghost" href="#pulse">
              Watch live sync
            </a>
          </div>
          {usingDemo && (
            <div className="demo-flag">
              Demo data active. Connect the API to see live data.
            </div>
          )}
        </div>
        <div className="hero-card">
          <div className="hero-card-header">
            <span>Sync ring</span>
            <span className="chip">LWW + version</span>
          </div>
          <div className="ring">
            <div className="ring-core"></div>
            <div className="ring-node"></div>
            <div className="ring-node"></div>
            <div className="ring-node"></div>
            <div className="ring-node"></div>
          </div>
          <div className="metrics">
            {metrics.map((metric) => (
              <div key={metric.label} className="metric">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="section reveal"
        id="pulse"
        style={{ "--delay": "0.1s" }}
      >
        <div className="section-head">
          <div>
            <h2>Live sync pulse</h2>
            <p>Every change echoed in real time across the network.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button className="btn ghost" onClick={connectWebSocket} style={{ padding: "4px 8px", fontSize: "0.85rem" }}>
              Reconnect WS
            </button>
            <div className={`badge ${wsStatus}`}>{wsStatus}</div>
          </div>
        </div>
        <div className="pulse-grid">
          <div className="card events">
            <h3>Latest updates</h3>
            {events.length === 0 ? (
              <p className="muted">
                No sync events yet. Trigger a change to see it here.
              </p>
            ) : (
              <ul>
                {events.map((event, index) => (
                  <li key={`${event.sku}-${index}`}>
                    <span>{event.sku}</span>
                    <span className="muted">qty {event.quantity}</span>
                    <span className="muted">{formatTime(event.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card peers">
            <h3>Active peers</h3>
            <ul>
              {peers.map((peer) => (
                <li key={peer.id || peer.ipAddress}>
                  <span>{peer.ipAddress}</span>
                  <span className="muted">{peer.status}</span>
                  <span className="muted">{formatTime(peer.lastSeen)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid cards">
          <div className="card action-card">
            <h3>Manual sync (STOMP)</h3>
            <p className="muted">
              Push a peer update directly onto the sync bus.
            </p>
            <form className="form-grid" onSubmit={handleSyncSend}>
              <label className="field">
                SKU
                <input
                  value={syncForm.sku}
                  onChange={(event) =>
                    setSyncForm((prev) => ({
                      ...prev,
                      sku: event.target.value,
                    }))
                  }
                  placeholder="SKU-100"
                />
              </label>
              <label className="field">
                Name (optional)
                <input
                  value={syncForm.name}
                  onChange={(event) =>
                    setSyncForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Widget"
                />
              </label>
              <label className="field">
                Quantity
                <input
                  type="number"
                  min="0"
                  value={syncForm.quantity}
                  onChange={(event) =>
                    setSyncForm((prev) => ({
                      ...prev,
                      quantity: event.target.value,
                    }))
                  }
                  placeholder="10"
                />
              </label>
              <label className="field">
                Version (optional)
                <input
                  type="number"
                  min="0"
                  value={syncForm.version}
                  onChange={(event) =>
                    setSyncForm((prev) => ({
                      ...prev,
                      version: event.target.value,
                    }))
                  }
                  placeholder="1"
                />
              </label>
              <label className="field">
                updatedAt (optional)
                <input
                  value={syncForm.updatedAt}
                  onChange={(event) =>
                    setSyncForm((prev) => ({
                      ...prev,
                      updatedAt: event.target.value,
                    }))
                  }
                  placeholder="2026-04-29T12:00:00Z"
                />
              </label>
              <label className="field">
                Source node IP (optional)
                <input
                  value={syncForm.sourceNodeIp}
                  onChange={(event) =>
                    setSyncForm((prev) => ({
                      ...prev,
                      sourceNodeIp: event.target.value,
                    }))
                  }
                  placeholder="10.0.0.8"
                />
              </label>
              <div className="form-actions">
                <button className="btn primary" type="submit">
                  Send sync
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section
        className="section reveal"
        id="inventory"
        style={{ "--delay": "0.15s" }}
      >
        <div className="section-head">
          <div>
            <h2>Inventory snapshot</h2>
            <p>Optimistic locking keeps counts consistent as peers sync.</p>
          </div>
          <div className="tag">JPA + Postgres</div>
        </div>
        <div className="inventory-tools">
          <button
            className="btn ghost"
            type="button"
            onClick={refreshAll}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh data"}
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => setEvents([])}
          >
            Clear pulse
          </button>
        </div>
        <div className="inventory-actions">
          <div className="card action-card">
            <h3>Create item</h3>
            <form className="form-grid" onSubmit={handleCreate}>
              <label className="field">
                SKU
                <input
                  value={createForm.sku}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      sku: event.target.value,
                    }))
                  }
                  placeholder="SKU-100"
                />
              </label>
              <label className="field">
                Name
                <input
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Widget"
                />
              </label>
              <label className="field">
                Quantity
                <input
                  type="number"
                  min="0"
                  value={createForm.quantity}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      quantity: event.target.value,
                    }))
                  }
                  placeholder="10"
                />
              </label>
              <div className="form-actions">
                <button
                  className="btn primary"
                  type="submit"
                  disabled={busyAction}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
          <div className="card action-card">
            <h3>Update item</h3>
            <form className="form-grid" onSubmit={handleUpdate}>
              <label className="field">
                SKU
                <input
                  list="sku-options"
                  value={updateForm.sku}
                  onChange={(event) =>
                    setUpdateForm((prev) => ({
                      ...prev,
                      sku: event.target.value,
                    }))
                  }
                  placeholder="SKU-100"
                />
                <datalist id="sku-options">
                  {items.map((item) => (
                    <option key={item.sku} value={item.sku} />
                  ))}
                </datalist>
              </label>
              <label className="field">
                Name (optional)
                <input
                  value={updateForm.name}
                  onChange={(event) =>
                    setUpdateForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Widget v2"
                />
              </label>
              <label className="field">
                Quantity (optional)
                <input
                  type="number"
                  min="0"
                  value={updateForm.quantity}
                  onChange={(event) =>
                    setUpdateForm((prev) => ({
                      ...prev,
                      quantity: event.target.value,
                    }))
                  }
                  placeholder="12"
                />
              </label>
              <p className="muted">
                Leave name or quantity blank to keep current values.
              </p>
              <div className="form-actions">
                <button
                  className="btn primary"
                  type="submit"
                  disabled={busyAction}
                >
                  Update
                </button>
              </div>
            </form>
          </div>
          <div className="card action-card">
            <h3>Find item</h3>
            <form className="form-grid" onSubmit={handleSearch}>
              <label className="field">
                SKU
                <input
                  value={searchSku}
                  onChange={(event) => setSearchSku(event.target.value)}
                  placeholder="SKU-100"
                />
              </label>
              <div className="form-actions">
                <button
                  className="btn primary"
                  type="submit"
                  disabled={busyAction}
                >
                  Fetch
                </button>
              </div>
            </form>
            <p className="muted">Fetches the latest record from the backend.</p>
          </div>
        </div>
        <div className="grid cards">
          {items.map((item) => (
            <article key={item.sku} className="card inventory">
              <div className="card-top">
                <span className="sku">{item.sku}</span>
                <span className="chip">v{item.version ?? 0}</span>
              </div>
              <h3>{item.name}</h3>
              <div className="qty">{item.quantity}</div>
              <p className="muted">Updated {formatTime(item.updatedAt)}</p>
              <button 
                className="btn primary" 
                style={{ marginTop: "16px", width: "100%" }}
                onClick={() => openBuyChat(item)}
              >
                Buy Item
              </button>
            </article>
          ))}
        </div>
      </section>

      <section
        className="section reveal"
        id="architecture"
        style={{ "--delay": "0.2s" }}
      >
        <div className="section-head">
          <div>
            <h2>Layered architecture</h2>
            <p>Strict separation of concerns keeps the sync engine clean.</p>
          </div>
          <div className="tag">Spring Boot 3.x</div>
        </div>
        <div className="grid cards">
          {architecture.map((item) => (
            <div key={item.title} className="card architecture">
              <h3>{item.title}</h3>
              <p className="muted">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="section callout reveal"
        style={{ "--delay": "0.25s" }}
      >
        <div>
          <h2>Ready to sync?</h2>
          <p>
            Spin up peers, open Swagger, and push inventory updates in seconds.
          </p>
        </div>
        <a
          className="btn primary"
          href="/swagger-ui"
          target="_blank"
          rel="noreferrer"
        >
          Open Swagger
        </a>
      </section>

      <footer className="footer">
        <span>StockSync Platform</span>
        <span className="muted">Java 17, Spring Boot 3.x, PostgreSQL</span>
      </footer>

      {buyItemTarget && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div className="card" style={{ width: "90%", maxWidth: "500px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3>Buy {buyItemTarget.name}</h3>
              <button className="btn ghost" onClick={closeBuyChat} style={{ padding: "4px 8px" }}>Close</button>
            </div>

            <div className="chat-history" style={{ flexGrow: 1, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px", marginBottom: "16px", background: "var(--surface)", minHeight: "200px" }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ marginBottom: "12px", textAlign: msg.role === "user" ? "right" : "left" }}>
                  <span style={{ display: "inline-block", padding: "8px 12px", borderRadius: "16px", background: msg.role === "user" ? "var(--primary)" : "var(--surface-hover)", color: msg.role === "user" ? "#fff" : "inherit", maxWidth: "80%" }}>
                    {msg.parts[0].text}
                  </span>
                </div>
              ))}
              {chatLoading && <div style={{ textAlign: "left" }}><span style={{ display: "inline-block", padding: "8px 12px", borderRadius: "16px", background: "var(--surface-hover)" }}>Thinking...</span></div>}
            </div>

            <form onSubmit={handleGeminiChat} style={{ display: "flex", gap: "8px" }}>
              <input 
                style={{ flexGrow: 1 }} 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                placeholder="Type a message..." 
                disabled={chatLoading}
              />
              <button className="btn primary" type="submit" disabled={chatLoading || !chatInput.trim()}>Send</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
