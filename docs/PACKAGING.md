# Package manager manifests

The files in `packaging/` let people install SkyTrack from a package manager. They need to be updated for every release (the version and the file hashes change). The hashes of the files in a release are shown by `gh release view vX.Y.Z --json assets` (the `digest` field).

## winget (Windows)

`packaging/winget/` has the three manifest files. To publish a new version:

1. Update `PackageVersion`, the `InstallerUrl` and the `InstallerSha256` (the hash of `SkyTrack-Setup.exe` from the release).
2. Open a pull request to https://github.com/microsoft/winget-pkgs with the files in `manifests/s/SametDuhan/SkyTrack/<version>/`. A maintainer's tool [`wingetcreate`](https://github.com/microsoft/winget-create) or [`komac`](https://github.com/russellbanks/Komac) can do it with one command, for example `wingetcreate update SametDuhan.SkyTrack --version X.Y.Z --urls https://github.com/SametDuhan/airock/releases/download/vX.Y.Z/SkyTrack-Setup.exe --submit`.
3. After the first version is accepted, the [winget-releaser](https://github.com/vedantmgoyal9/winget-releaser) GitHub Action can send the later versions automatically.

Users then run: `winget install SametDuhan.SkyTrack`.

## Scoop (Windows)

`packaging/scoop/skytrack.json` is a Scoop manifest. Put it in a bucket repository (for example `SametDuhan/scoop-bucket`, folder `bucket/`). Users run: `scoop bucket add skytrack https://github.com/SametDuhan/scoop-bucket` and `scoop install skytrack`. `autoupdate` is set, so `scoop`'s checkver can keep it current.

## Arch Linux (AUR)

`packaging/aur/PKGBUILD` installs the AppImage. Submit it to https://aur.archlinux.org as `skytrack-bin` (needs an AUR account and an SSH key), then update `pkgver` and `sha256sums` for each release.

## macOS

A Homebrew cask needs a signed and notarized app to pass Gatekeeper, so it waits for Apple code signing (see `docs/CODE_SIGNING.md`).
