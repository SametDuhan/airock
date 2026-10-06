# Code signing for the Windows installer

Windows SmartScreen warns about every unsigned installer. A signed installer removes the "Windows protected your PC" screen for most people and lets reputation build up faster. SkyTrack is open source (MIT), so it can use the free signing program of the **SignPath Foundation**.

## What has to happen

1. **Apply** at https://signpath.org/apply (open source projects). They check that the project is public, uses an OSI license, has releases and has the policy text below.
2. **Create the project** in SignPath (they guide you): an organization, a project `skytrack`, an artifact configuration for the installer (`.exe`) and a signing policy `release-signing`.
3. **Add GitHub secrets / variables** to the repository: `SIGNPATH_API_TOKEN` (secret), `SIGNPATH_ORGANIZATION_ID` (variable).
4. **Change the workflow** (`.github/workflows/release.yml`), Windows job only:
   - build the installer unsigned (`--publish never`, already the case),
   - upload `dist/SkyTrack-Setup.exe` as a workflow artifact,
   - submit it with `signpath/github-action-submit-signing-request@v1` (`wait-for-completion: true`) and download the signed file,
   - **recompute `latest.yml`**: the auto-updater compares the file's SHA-512 and size with `latest.yml`, so after signing, `latest.yml` and the `.blockmap` must be regenerated from the signed file (otherwise updates fail).
5. Test with a pre-release before using it for a real version.

## Roles required by SignPath (fill in with real names)

- **Author / committer:** SametDuhan
- **Reviewer:** SametDuhan (the project has one maintainer)
- **Approver:** SametDuhan

## Privacy policy text (required)

> This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it.

SkyTrack only contacts the public data sources listed on the website, to show flights, weather and photos; it has no accounts and no analytics.

## Notes

- The signing certificate belongs to the SignPath Foundation; the publisher name shown by Windows is "SignPath Foundation".
- macOS needs an Apple Developer ID and notarization (about 99 USD per year) to avoid the Gatekeeper warning. Until then, right-click the app and choose Open.
