# CLI Proxy API Management Center

A single-file web management panel (React + TypeScript) for [CLIProxyAPI](https://github.com/minervacap2022/CLIProxyAPI). Talks to the Management API to configure keys, model groups, auth files, logs, and usage.

---

## Usage

The panel ships bundled inside the CLIProxyAPI Docker image. No separate deployment needed.

After starting CLIProxyAPI, open:

```
http://your-server:8317/management.html
```

Enter your `MANAGEMENT_PASSWORD` to connect.

---

## What you can manage

- **API Keys** — add / edit / delete client keys and model group bindings
- **Model Groups** — configure priority-tier failover routing
- **Auth Files** — upload / manage provider credentials (Claude, Gemini, etc.)
- **OAuth** — start OAuth flows for Claude, Gemini, Codex, and others
- **Basic Settings** — proxy URL, quota fallback, logging, debug
- **Usage** — request and token charts by hour / day / model
- **Logs** — tail and search server logs
- **Config** — edit `config.yaml` directly in the browser

---

## Deploy CLIProxyAPI (backend)

See the main repo for deployment instructions and agent configuration guide:

- **Deploy**: [github.com/minervacap2022/CLIProxyAPI](https://github.com/minervacap2022/CLIProxyAPI)
- **Agent guide**: [foragent.md](https://github.com/minervacap2022/CLIProxyAPI/blob/main/foragent.md)
- **Skill**: [skills/cliproxyapi-config/SKILL.md](https://github.com/minervacap2022/CLIProxyAPI/blob/main/skills/cliproxyapi-config/SKILL.md)

---

## Development

```bash
npm install
npm run dev        # dev server at localhost:5173
npm run build      # produces dist/index.html (single file, all assets inlined)
npm run lint
npm run type-check
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.

Upstream project: [router-for-me/Cli-Proxy-API-Management-Center](https://github.com/router-for-me/Cli-Proxy-API-Management-Center)
