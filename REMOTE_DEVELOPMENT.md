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

Codespaces startup log:

```bash
cat /tmp/jewel-de-pon.log
```

If the app is not running:

```bash
npm start
```

## Validate before committing

```bash
npm run check
npm test
```

## Recommended workflow

- GitHub is the shared source of truth.
- At home, continue using the Windows local Work environment and push changes to GitHub.
- Away from home, use GitHub Codespaces in a browser or ask ChatGPT to work against the GitHub repository.
- Commit remote changes before returning to the Windows environment, then pull the latest branch there.
- Keep feature work on branches and merge through pull requests when practical.

## Preview access

Codespaces forwards port 8080 over the internet. The default visibility is private and requires GitHub authentication. You can change the visibility from the Codespaces **Ports** panel when you intentionally need to share a preview with someone else.
