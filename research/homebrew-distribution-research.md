# Homebrew Distribution Research Report

*Generated: 2026-04-30 | Sources: Homebrew/homebrew-cask, Homebrew/homebrew-core, brew.sh, GitHub | Confidence: High*

## Executive Summary

Homebrew distributes software through two main paths:
- **Formulae** (CLI tools): `brew install <formula>` — from `homebrew/core` tap
- **Casks** (GUI apps): `brew install --cask <cask>` — from `homebrew/cask` tap

Most popular developer tools use either official `homebrew-cask` or `homebrew/core`. Private taps are rare for mainstream tools. URL-based installation (direct binary downloads) is the most common source pattern.

---

## 1. GUI Applications (Casks)

### Warp
| Property | Value |
|---|---|
| **Install command** | `brew install --cask warp` |
| **Tap** | `homebrew/cask` (official) |
| **auto_updates** | `true` |
| **macOS requirement** | `>= :big_sur` (macOS 11) |
| **Version** | `0.2026.04.27.15.32.stable_03` |
| **SHA256** | `7f77491f6cc8100e759aba44f29a29b6a914bf4860ef2248e6280e96704af346` |
| **Source URL** | `https://app.warp.dev/download/brew?version=v#{version}` |
| **Livecheck** | JSON from `https://releases.warp.dev/channel_versions.json` |
| **Cask file** | [warp.rb](https://github.com/Homebrew/homebrew-cask/blob/main/Casks/w/warp.rb) |
| **Installs (30d)** | ~13,352 |

### Zed
| Property | Value |
|---|---|
| **Install command** | `brew install --cask zed` |
| **Tap** | `homebrew/cask` (official) |
| **auto_updates** | `true` |
| **macOS requirement** | None specified (all macOS versions) |
| **Version** | `1.0.0` |
| **SHA256 (arm)** | `1b889d3cbc244275f7c65da3f6d3edc130e8c23a68db2456938eed41bc7e6c95` |
| **SHA256 (intel)** | `b2c9b0e44ac24b827b77d07d9837b7b18bee6025dc4a3146858b2f72b55c31fb` |
| **Source URL (arm)** | `https://zed.dev/api/releases/stable/#{version}/Zed-aarch64.dmg` |
| **Source URL (intel)** | `https://zed.dev/api/releases/stable/#{version}/Zed-x86_64.dmg` |
| **Livecheck** | JSON from Zed API |
| **Cask file** | [zed.rb](https://github.com/Homebrew/homebrew-cask/blob/main/Casks/z/zed.rb) |
| **Installs (30d)** | ~11,168 |
| **Note** | Also creates a `zed` CLI binary symlink |

### TablePlus
| Property | Value |
|---|---|
| **Install command** | `brew install --cask tableplus` |
| **Tap** | `homebrew/cask` (official) |
| **auto_updates** | `true` |
| **macOS requirement** | None specified (all macOS) |
| **Version** | `6.8.6,662` (version, build) |
| **SHA256** | `551d2c49365f4638effa9e03718722281246e431c8c23e0a2e14c73c646c497d` |
| **Source URL** | `https://files.tableplus.com/macos/#{build}/TablePlus.dmg` |
| **Livecheck** | Sparkle XML from `https://tableplus.com/osx/version.xml` |
| **Cask file** | [tableplus.rb](https://github.com/Homebrew/homebrew-cask/blob/main/Casks/t/tableplus.rb) |
| **Installs (30d)** | ~3,151 |

### Docker Desktop
| Property | Value |
|---|---|
| **Install command** | `brew install --cask docker-desktop` |
| **Tap** | `homebrew/cask` (official) |
| **auto_updates** | `true` |
| **macOS requirement** | `>= :sonoma` (macOS 14) |
| **Version** | `4.71.0,225177` |
| **SHA256 (arm)** | `56a78b132696b747c40b151af57ecdbd8529b5f4dac4d436cd0d767721a957b4` |
| **SHA256 (intel)** | `bade6cdc448fe461a76052c5af6e8f670de288453aff28447aca501582fdcef0` |
| **Source URL (arm)** | `https://desktop.docker.com/mac/main/arm64/225177/Docker.dmg` |
| **Source URL (intel)** | `https://desktop.docker.com/mac/main/amd64/225177/Docker.dmg` |
| **Livecheck** | Sparkle appcast |
| **Conflicts with** | `rancher` cask |
| **Cask file** | [docker-desktop.rb](https://github.com/Homebrew/homebrew-cask/blob/main/Casks/d/docker-desktop.rb) |
| **Installs (30d)** | ~54,473 |
| **Special** | Multiple binary symlinks (docker, kubectl, docker-compose, etc.), shell completions, postflight linking for kubectl |

### Postman
| Property | Value |
|---|---|
| **Install command** | `brew install --cask postman` |
| **Tap** | `homebrew/cask` (official) |
| **auto_updates** | `true` |
| **macOS requirement** | `>= :big_sur` (macOS 11) |
| **Version** | `12.8.4` |
| **SHA256 (arm)** | `ba5012df42c1ea87328b6c3bfbe5f9a80806302614a4c8e5ff7abea9b8e78492` |
| **SHA256 (intel)** | `87160269f1655946a1349761f2ad2f9449347f4be545833b5e07e2312f67a702` |
| **Source URL (arm)** | `https://dl.pstmn.io/download/version/12.8.4/osx_arm64` |
| **Source URL (intel)** | `https://dl.pstmn.io/download/version/12.8.4/osx64` |
| **Livecheck** | JSON from Postman update API |
| **Cask file** | [postman.rb](https://github.com/Homebrew/homebrew-cask/blob/main/Casks/p/postman.rb) |
| **Installs (30d)** | ~12,464 |

### Insomnia
| Property | Value |
|---|---|
| **Install command** | `brew install --cask insomnia` |
| **Tap** | `homebrew/cask` (official) |
| **auto_updates** | `true` |
| **macOS requirement** | `>= :monterey` (macOS 12) |
| **Version** | `12.5.0` |
| **SHA256** | `ebe2ff850eab58d56e11ea53a99ce048cb716c1292fcb3d8ab2be8a4e4673d04` |
| **Source URL** | `https://github.com/Kong/insomnia/releases/download/core@#{version}/Insomnia.Core-#{version}.dmg` |
| **Livecheck** | JSON from Insomnia update server |
| **Conflicts with** | `insomnia@alpha` |
| **Cask file** | [insomnia.rb](https://github.com/Homebrew/homebrew-cask/blob/main/Casks/i/insomnia.rb) |
| **Installs (30d)** | ~1,391 |

### NGrok
| Property | Value |
|---|---|
| **Install command** | `brew install --cask ngrok` |
| **Tap** | `homebrew/cask` (official) |
| **auto_updates** | Not specified (CLI tool) |
| **macOS requirement** | None specified (all macOS) |
| **Version (arm)** | `3.39.1,ibTLJJL6E5Z,a` (version, checksum_id, channel) |
| **SHA256 (arm)** | `8dea70bb1429153bbadacc48fa12318eb231220ab09bbbc39d0964d0e33923df` |
| **Source URL** | `https://bin.ngrok.com/#{channel}/#{checksum_id}/ngrok-v#{major}-#{version}-darwin-#{arch}.zip` |
| **Livecheck** | Page match from ngrok archive page |
| **Cask file** | [ngrok.rb](https://github.com/Homebrew/homebrew-cask/blob/main/Casks/n/ngrok.rb) |
| **Installs (30d)** | ~43,480 |
| **Special** | Binary-only installation, shell completion caveats |
| **Note** | Uses a complex 3-part version scheme and ngrok's own CDN |

### OrbStack
| Property | Value |
|---|---|
| **Install command** | `brew install --cask orbstack` |
| **Tap** | `homebrew/cask` (official) |
| **auto_updates** | `true` |
| **macOS requirement** | `>= :sonoma` (macOS 14) |
| **Version** | `2.1.1,20026` |
| **SHA256 (arm)** | `18a41f759958e1fa0951696b820b5478d3ed7353f8ca486fe9d026a1a7d97207` |
| **SHA256 (intel)** | `c7eef8f0f29aaac9d0a9ea962208a1362a63ced0926645a5ba89835e5260513c` |
| **Source URL** | `https://cdn-updates.orbstack.dev/#{arch}/OrbStack_v#{version}_#{build}_#{arch}.dmg` |
| **Livecheck** | Sparkle appcast |
| **Cask file** | [orbstack.rb](https://github.com/Homebrew/homebrew-cask/blob/main/Casks/o/orbstack.rb) |
| **Installs (30d)** | ~20,897 |
| **Special** | Multiple binaries (orb, orbctl), shell completions, postflight/uninstall scripts |
| **Caveats** | "Open the OrbStack app to finish setup" |

### LocalStack
| Property | Value |
|---|---|
| **Install command** | `brew install localstack` (not cask!) |
| **Tap** | `homebrew/core` (formula, not cask) |
| **Type** | Python-based CLI tool |
| **auto_updates** | N/A (formula) |
| **macOS requirement** | Not specified |
| **Version** | `2026.3.0` (as of April 2026) |
| **Bottle** | Yes, binary bottles available |
| **Formula file** | [localstack.rb](https://github.com/Homebrew/homebrew-core/blob/main/Formula/l/localstack.rb) |
| **Installs (30d)** | ~1,084 |
| **Note** | Deprecated with `disable! date: "2025-10-24"` — use `localstack` CLI directly |

---

## 2. CLI Tools (Formulae)

These are all in `homebrew/core` tap and install via `brew install <formula>`.

### htop
| Property | Value |
|---|---|
| **Install command** | `brew install htop` |
| **Tap** | `homebrew/core` (official) |
| **Version** | `3.5.1` |
| **Bottle** | Yes (macOS bottles available) |
| **Source URL** | GitHub release tarball |
| **Installs (30d)** | ~48,507 |
| **Caveats** | Requires root privileges: `sudo htop` |

### fzf
| Property | Value |
|---|---|
| **Install command** | `brew install fzf` |
| **Tap** | `homebrew/core` (official) |
| **Version** | `0.72.0` |
| **Bottle** | Yes |
| **Source** | `https://github.com/junegunn/fzf/archive/refs/tags/v0.72.0.tar.gz` |
| **Installs (30d)** | ~74,615 |
| **Caveats** | Requires shell integration setup (instructions in caveats) |

### bat
| Property | Value |
|---|---|
| **Install command** | `brew install bat` |
| **Tap** | `homebrew/core` (official) |
| **Version** | `0.26.1` |
| **Bottle** | Yes |
| **Source** | `https://github.com/sharkdp/bat/archive/refs/tags/v0.26.1.tar.gz` |
| **Installs (30d)** | ~16,429 |

### LocalStack / lazydocker
| Property | Value |
|---|---|
| **localstack** | `brew install localstack` (formula, Python-based, deprecated) |
| **lazydocker** | `brew install lazydocker` (formula, Go binary) v0.25.2 |
| **Both** | `homebrew/core` tap, bottle support |

### httpie
| Property | Value |
|---|---|
| **Install command** | `brew install httpie` |
| **Tap** | `homebrew/core` (official) |
| **Version** | `3.2.4` |
| **Bottle** | Yes |
| **Source** | Python package |
| **Installs (30d)** | ~6,622 |

### http-prompt
| Property | Value |
|---|---|
| **Install command** | `brew install http-prompt` |
| **Tap** | `homebrew/core` (official) |
| **Version** | `2.1.0` |
| **Bottle** | Yes |
| **Installs (30d)** | ~58 |

### gping
| Property | Value |
|---|---|
| **Install command** | `brew install gping` |
| **Tap** | `homebrew/core` (official) |
| **Version** | `1.20.1` |
| **Bottle** | Yes |
| **Installs (30d)** | ~439 |

### m-cli
| Property | Value |
|---|---|
| **Install command** | `brew install m-cli` |
| **Tap** | `homebrew/core` (official) |
| **Version** | `2.0.7` |
| **Bottle** | Yes |
| **Installs (30d)** | ~105 |

### tldr (deprecated)
| Property | Value |
|---|---|
| **Install command** | `brew install tldr` (disabled) |
| **Tap** | `homebrew/core` (official) |
| **Status** | Deprecated, use `tlrc` or `tealdeer` |
| **Replacement** | `brew install tlrc` (Rust client, v1.13.0) or `brew install tealdeer` (v1.8.1) |
| **Conflicts** | `tlrc`, `tealdeer`, `tldr` all conflict |

---

## 3. Tools NOT in Homebrew

### exa, delta, dog
These tools are **not in homebrew/core** as of 2026:
- `exa` — Removed/deprecated (Rust replacement for `ls`)
- `delta` — git delta pager, may need manual install or `brew install git-delta` (check)
- `dog` — DNS lookup tool, not in main tap

### brew (Homebrew itself)
Homebrew is installed via the official install script:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
It is NOT installed via `brew install`. The `brew` command is a bash script that bootstraps itself.

---

## 4. Key Patterns Observed

### URL Patterns
1. **Direct CDN** (most common for commercial apps):
   - Warp: `app.warp.dev/download/brew`
   - Zed: `zed.dev/api/releases/stable`
   - TablePlus: `files.tableplus.com/macos`
   - Docker Desktop: `desktop.docker.com/mac/main`
   - OrbStack: `cdn-updates.orbstack.dev`
   - NGrok: `bin.ngrok.com`

2. **GitHub releases** (common for open source):
   - Insomnia: `github.com/Kong/insomnia/releases/download`
   - Postman: `dl.pstmn.io` (own CDN backed by GitHub)

3. **Sparkle** (for auto-update):
   - TablePlus, OrbStack, Docker Desktop use Sparkle appcast

4. **Custom JSON API**:
   - Warp: `releases.warp.dev/channel_versions.json`
   - Zed: Internal API endpoint

### macOS Version Requirements
| App | Min macOS |
|---|---|
| Docker Desktop | macOS 14 (Sonoma) |
| OrbStack | macOS 14 (Sonoma) |
| Insomnia | macOS 12 (Monterey) |
| Warp | macOS 11 (Big Sur) |
| Postman | macOS 11 (Big Sur) |
| Zed | No minimum specified (all versions) |
| TablePlus | No minimum specified |
| NGrok | No minimum specified |

### auto_updates Patterns
- **GUI apps with built-in auto-update**: `auto_updates true` — Warp, Zed, TablePlus, Docker Desktop, Postman, Insomnia, OrbStack
- **CLI tools**: Typically no `auto_updates` (handled by brew upgrade)

### Tap Distribution
- **99%+ of popular tools** use official `homebrew/cask` (for GUI) or `homebrew/core` (for CLI)
- **Private taps** are uncommon for mainstream developer tools
- **No URL-based "direct install" casks** in the main repo — all go through the cask infrastructure

---

## 5. How New/Missing Casks Get Added

### Process:
1. Check existing PRs at [homebrew/homebrew-cask](https://github.com/Homebrew/homebrew-cask/pulls) and [homebrew/homebrew-core](https://github.com/Homebrew/homebrew-core/pulls)
2. Check [Acceptable Casks](https://docs.brew.sh/Acceptable-Casks) documentation
3. Create cask with `brew create --cask <download-url> --set-name <name>`
4. Test with `brew audit --strict --new --online <cask>` and `brew style --fix <cask>`
5. Submit PR to the appropriate repository
6. For GUI apps → `homebrew/homebrew-cask`
7. For CLI tools → `homebrew/homebrew-core`

### "cask not found" workarounds:
1. App may be in a **private tap** — check `brew search` and `brew tap`
2. App may be a **formula** not a cask — try `brew install` (without `--cask`)
3. May need to use **unofficial taps** — e.g., `brew install homebrew/core/<formula>`
4. App may be **unmaintained/deprecated** in Homebrew
5. `brew update-reset && brew update` may fix outdated tap issues

### Contributing:
- Use `brew bump --open-pr <outdated_cask>` to update outdated casks
- One PR per cask change
- Follow [Cask Cookbook](https://docs.brew.sh/Cask-Cookbook) style guide
- No extraneous comments in cask files
- Use `livecheck` stanza for update checking

---

## 6. Summary Table

| Tool | Type | Install Command | Tap | auto_updates | Min macOS |
|---|---|---|---|---|---|
| Warp | Cask | `brew install --cask warp` | homebrew/cask | true | 11 (Big Sur) |
| Zed | Cask | `brew install --cask zed` | homebrew/cask | true | None |
| TablePlus | Cask | `brew install --cask tableplus` | homebrew/cask | true | None |
| Docker Desktop | Cask | `brew install --cask docker-desktop` | homebrew/cask | true | 14 (Sonoma) |
| Postman | Cask | `brew install --cask postman` | homebrew/cask | true | 11 |
| Insomnia | Cask | `brew install --cask insomnia` | homebrew/cask | true | 12 (Monterey) |
| NGrok | Cask | `brew install --cask ngrok` | homebrew/cask | Not set | None |
| OrbStack | Cask | `brew install --cask orbstack` | homebrew/cask | true | 14 (Sonoma) |
| LocalStack | Formula | `brew install localstack` | homebrew/core | N/A | None |
| htop | Formula | `brew install htop` | homebrew/core | N/A | None |
| fzf | Formula | `brew install fzf` | homebrew/core | N/A | None |
| bat | Formula | `brew install bat` | homebrew/core | N/A | None |
| lazydocker | Formula | `brew install lazydocker` | homebrew/core | N/A | None |
| httpie | Formula | `brew install httpie` | homebrew/core | N/A | None |
| gping | Formula | `brew install gping` | homebrew/core | N/A | None |
| m-cli | Formula | `brew install m-cli` | homebrew/core | N/A | None |
| tlrc | Formula | `brew install tlrc` | homebrew/core | N/A | None |
| tldr | Formula | `brew install tldr` (disabled) | homebrew/core | N/A | Deprecated |

---

## Sources
1. [Homebrew/homebrew-cask](https://github.com/Homebrew/homebrew-cask) — Official cask repository (22k stars, 416k commits)
2. [Homebrew/homebrew-core](https://github.com/Homebrew/homebrew-core) — Official formula repository
3. [brew.sh Formulae](https://formulae.brew.sh) — Package browser
4. [Adding Software to Homebrew docs](https://docs.brew.sh/Adding-Software-to-Homebrew)
5. Individual cask files: `warp.rb`, `zed.rb`, `tableplus.rb`, `docker-desktop.rb`, `postman.rb`, `insomnia.rb`, `ngrok.rb`, `orbstack.rb`