# Mullvad Gateway UI

A self-hosted web dashboard for managing a Mullvad VPN gateway. Works on any Linux host that has the Mullvad daemon installed — bare metal, VM, Proxmox LXC, Docker, whatever.

Features: interactive orthographic globe, per-city relay selection, DAITA filter, account info with days remaining, settings toggles (auto-connect, lockdown mode, LAN access, quantum resistance, multihop), and a blocked-domain reconnect webhook.

## Requirements

- Linux (any distro — Debian, Ubuntu, Alpine, Arch, Gentoo, etc.)
- Node.js 20+
- [Mullvad VPN](https://mullvad.net/download) daemon installed and running (`mullvad-daemon.service`)
- A Mullvad account number (16 digits)

## Installation

### 1. Install Mullvad

```bash
curl -fsSLo /usr/share/keyrings/mullvad-keyring.asc https://repository.mullvad.net/deb/mullvad-keyring.asc
echo "deb [signed-by=/usr/share/keyrings/mullvad-keyring.asc arch=$( dpkg --print-architecture )] https://repository.mullvad.net/deb/stable $(lsb_release -cs) main" > /etc/apt/sources.list.d/mullvad.list
apt update && apt install -y mullvad-vpn
```

### 2. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 3. Deploy the UI

```bash
mkdir -p /opt/mullvad-ui
cp -r . /opt/mullvad-ui
cd /opt/mullvad-ui
npm install
npm run build
```

### 4. Log in to your Mullvad account

```bash
mullvad account login <your-16-digit-account-number>
```

### 5. Run the server

The app is just `node server.mjs` — wire it up however you prefer:

**systemd**
```bash
cat > /etc/systemd/system/mullvad-ui.service << 'EOF'
[Unit]
Description=Mullvad Gateway UI
After=network.target mullvad-daemon.service
Wants=mullvad-daemon.service

[Service]
Type=simple
WorkingDirectory=/opt/mullvad-ui
ExecStart=/usr/bin/node /opt/mullvad-ui/server.mjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now mullvad-ui
```

**OpenRC**
```bash
cat > /etc/init.d/mullvad-ui << 'EOF'
#!/sbin/openrc-run
name="mullvad-ui"
command="/usr/bin/node"
command_args="/opt/mullvad-ui/server.mjs"
directory="/opt/mullvad-ui"
command_background=true
pidfile="/run/mullvad-ui.pid"
EOF
chmod +x /etc/init.d/mullvad-ui
rc-update add mullvad-ui default && rc-service mullvad-ui start
```

**Manual / tmux / screen**
```bash
cd /opt/mullvad-ui && node server.mjs
```

The dashboard is now available at `http://<host-ip>/` on port 80.

## Configuration

All configuration is in `server.mjs`. Edit these constants at the top:

| Constant | Default | Description |
|---|---|---|
| `PORT` | `80` | Port the Express server listens on |
| `LOG_FILE` | `/var/log/mullvad-blocked.log` | Log file for the blocked-domain webhook |

After changing `server.mjs`, restart the service:

```bash
systemctl restart mullvad-ui
```

If you change any source files under `src/`, rebuild first:

```bash
cd /opt/mullvad-ui && npm run build && systemctl restart mullvad-ui
```

## Changing the account

You can change the logged-in Mullvad account either from the dashboard (Account card → "Change account…") or from the CLI:

```bash
mullvad account login <new-account-number>
```

## Blocked-domain webhook

Other devices on your network can trigger an automatic relay reconnect by calling:

```
GET/POST http://<host-ip>/api/blocked?domain=example.com&reporter=<device-name>
```

The gateway switches to a new relay and returns the old/new relay and IP. Results are logged to `LOG_FILE`. This is useful for ad-blockers or DNS-based filters that detect blocked content and want to rotate the exit IP automatically.

## Development

```bash
npm run dev   # Vite dev server on :5173 (proxies /api to server.mjs)
node server.mjs  # Run the backend separately on :80
```
