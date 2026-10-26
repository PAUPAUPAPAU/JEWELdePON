# Remote development

This repository is configured for GitHub Codespaces so JEWEL de PON can be developed and previewed from a browser without the home Windows PC being online.

## Open the project

1. Open this repository on GitHub.
2. Choose **Code → Codespaces**.
3. Create a codespace from the branch you want to work on.
4. The development container installs the Node.js environment and starts JEWEL de PON automatically.
5. Port **8080** is forwarded as **JEWEL de PON preview**.

Forwarded ports are private by default, so the preview can be opened from another device as long as you are signed in to the GitHub account that owns the codespace.

## Server

The app starts with:

```bash
npm start
```

Health check:

```text
/health
```

The Linux container uses a managed background process. It fixes `HOST=0.0.0.0`
and `PORT=8080`, waits for the JEWEL de PON health response, and reports startup
errors instead of silently opening a broken preview. A port owned by another
process is an error; stop that process yourself before retrying.

Check status (also prints the workspace-specific log path):

```bash
node .devcontainer/server.cjs status
```

Start, stop, or restart the managed preview from the repository root:

```bash
node .devcontainer/server.cjs start
node .devcontainer/server.cjs stop
node .devcontainer/server.cjs restart
```

There is no automatic reload. After changing code, restart the preview and then
reload the browser. Do not run a second `npm start` while the managed preview is
running. To debug in the foreground, stop the managed preview first, run
`npm start`, and use Ctrl+C to stop it before starting the managed preview again.
Logs under `/tmp` may disappear on a container rebuild.

## Validate before committing

```bash
npm run check
npm test
node --test tests/codespaces.cjs
```

Run these inside the Node.js 22 container after updating your branch from `main`.
The last command tests the Linux lifecycle helper and requires port 8080 to be
free: stop the preview first, and start it again afterward. Syntax and game tests
do not verify GitHub authentication, port forwarding, or a real mobile browser.

## Recommended workflow

- GitHub is the shared source of truth.
- At home, continue using the Windows local Work environment and push changes to GitHub.
- Away from home, use GitHub Codespaces in a browser or ask ChatGPT to work against the GitHub repository.
- Commit and **push** remote changes before returning to Windows, then check out the same branch and pull it there. A commit alone stays in the codespace.
- Keep feature work on branches and merge through pull requests when practical.

## Preview access

Codespaces forwards port 8080 over the internet. The default visibility is private and requires GitHub authentication. You can change the visibility from the Codespaces **Ports** panel when you intentionally need to share a preview with someone else.

On a phone, sign in as the codespace owner, open the **Ports** panel, and open
the forwarded port URL in a separate browser tab. Another GitHub account cannot
access an owner's private preview. Public visibility allows anyone with the URL
to access the preview; restore private visibility after a shared test.

Codespaces is a development preview. It can stop after an idle timeout; resume
it from https://github.com/codespaces. Closing a browser tab is not a substitute
for stopping the codespace. Check your Codespaces usage allowance and billing,
and explicitly stop it when finished. Rooms and matches are held in server memory
and are lost when the server restarts or the codespace stops.

Before merging, verify a newly created codespace and a stopped/resumed codespace,
then check the forwarded `/health` and game page, code-edit/restart behavior,
phone touch/audio/rotation/background recovery, and two-client room creation,
joining, gameplay and rematches. Ensure SSE updates continue through the forwarded
URL. These checks require a real codespace and devices; automated tests do not
replace them.
