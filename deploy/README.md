# Server deployment

The VM keeps the private `backend/.env` file. It is never committed or copied by
the GitHub Action.

## One-time VM setup

Install the backend service:

```bash
sudo cp deploy/studyprio.service /etc/systemd/system/studyprio.service
sudo systemctl daemon-reload
sudo systemctl enable studyprio
sudo systemctl start studyprio
```

The VM must have the repository checked out at
`/home/azureuser/wk1106-teamprojekt` and a valid `backend/.env`.

## GitHub repository secrets

Add these Actions secrets in the repository settings:

- `DEPLOY_HOST`: the VM public IP or DNS name
- `DEPLOY_USER`: `azureuser`
- `DEPLOY_SSH_KEY`: a dedicated private SSH key whose public key is in the VM
  user's `~/.ssh/authorized_keys`

Every push to `main` first runs the build and backend tests. A successful run
then updates the VM and restarts `studyprio`.

The public HTTPS endpoint should use a named Cloudflare Tunnel running as a
separate service. A `trycloudflare.com` quick tunnel is temporary and is not
suitable for automated deployment.