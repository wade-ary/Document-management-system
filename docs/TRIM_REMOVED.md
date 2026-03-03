# Trim: Removed Files (Extreme Prune)

This log lists files removed to keep only frontend and backend files required for the described features (compliance dashboard, query guardrails, retrieval/blurb/precedents, ingestion with review queue). **Server-side deployment artifacts were removed;** no frontend or backend feature code was modified or reconnected.

## Removed: Server-side deployment

| Path | Description |
|------|-------------|
| `deployment/supervisor.conf` | Supervisor process config |
| `deployment/nginx.conf` | Nginx reverse-proxy config |
| `deployment/setup_ec2.sh` | EC2 setup script |
| `deployment/update_deploy.sh` | Deploy update script |
| `deployment/test_deployment.sh` | Deployment test script |
| `deployment/deploy.sh` | Main deploy script |
| `deployment/DEPLOYMENT_FILES_OVERVIEW.md` | Deployment docs |
| `deployment/GITHUB_ACTIONS_SETUP.md` | GitHub Actions deployment guide |
| `deployment/gunicorn_start.sh` | Gunicorn start script |
| `nginx/nginx.conf` | Nginx config (root-level) |
| `app.yaml` | DigitalOcean App Platform config |
| `dev.sh` | Docker/docker-compose dev script |

## Removed: Dead / unused

| Path | Description |
|------|-------------|
| `admin.py` | Commented-out admin routes only; unused. |

## Kept (not removed)

- **Backend:** All modules under `backend/` required by `app.py` (no import or route changes).
- **Frontend:** Full `frontend/` tree (no component or page removals).
- **Templates:** All Flask `templates/` (still referenced by routes).
- **Docs:** `docs/BLURB.md`, `docs/GUARDRAILS_AND_UX.md`, `docs/INGESTION_PIPELINE_DESIGN.md`, `docs/PRECEDENT_FINDER.md`, `docs/RETRIEVAL_AND_QUERY_CLASSIFICATION.md`, `docs/RETRIEVAL_QUERY_CLASSIFIER_DESIGN.md`.
- **Config:** `.env.example`, `.gitignore`, `Readme.md`, `.cursor/rules/`, `test_documents/`.

No Dockerfile, docker-compose, or `.github/` workflows were present; none removed.
