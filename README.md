# WhatsApp Linux

WhatsApp Linux is a secure, lightweight desktop shell around the official
[WhatsApp Web](https://web.whatsapp.com/) application, designed for Arch Linux
and KDE Plasma/Wayland. It adds a native window, tray lifecycle, persistent
linked-device login, notifications, media permissions, deep links, autostart,
and an offline recovery screen.

> **Unofficial project:** This software is not affiliated with, authorized,
> maintained, sponsored, or endorsed by WhatsApp LLC or Meta Platforms, Inc.
> WhatsApp is a trademark of WhatsApp LLC. The project uses an original icon
> and does not implement or reverse-engineer WhatsApp's private protocol.

## Features

- Persistent WhatsApp Web session in a sandboxed Electron partition
- Native tray with unread count, reload, settings, and explicit quit
- Configurable close behavior, launch at login, start hidden, and spell checking
- Selectable spelling dictionary and right-click corrections in message fields
- Camera, microphone, notifications, downloads, and PipeWire screen sharing
- `whatsapp://` deep-link and single-instance support
- Strict navigation, origin-scoped permissions, and no Node.js access from the
  remote WhatsApp page
- Remembered window geometry, maximized state, and zoom
- Offline error page with retry and diagnostics

## Appearance Studio

Open **Settings → Themes** to enable local visual customization. The studio
includes WhatsApp, Midnight, OLED, Nord, Dracula, Solarized, and Rosé Pine
presets, all of which can be edited further. Controls cover:

- Application, sidebar base, sidebar header, search/filter strip, search box,
  chat-list rows, panel, composer, text, link, selection, border, accent, and
  incoming/outgoing message colours
- Font family, custom installed font, scale, weight, line height, and letter
  spacing
- Interface density, sidebar and message width, avatar/bubble/control curves,
  borders, shadows, and message spacing
- Solid, gradient, or private local-image wallpapers with fit, position,
  opacity, blur, overlay, and pattern controls
- Translucency, panel blur, reduced motion, high contrast, grayscale avatars,
  monochrome icons, underlined links, and custom scrollbars
- Sanitized advanced CSS, live preview, reset, and JSON theme import/export

Appearance changes apply only to this desktop client. WhatsApp can change its
web design tokens or internal markup, so very specific advanced CSS may need
maintenance after upstream interface updates.

Features available inside chats are determined by WhatsApp Web. This project
does not promise features exclusive to Meta's native Windows application.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Quality checks and builds:

```sh
npm run check
npm run test:integration
npm run build
npm run package:appimage
```

The app accepts `--hidden`, `--settings`, and `whatsapp://…` arguments:

```sh
npm start -- --hidden
whatsapp-linux 'whatsapp://send?phone=15551234567'
```

## Arch Linux package

The included `PKGBUILD` uses Arch's `electron43` runtime. Before publishing a
release, replace its `SKIP` source checksum with the release archive's SHA-256.

For a local package build from a release archive:

```sh
makepkg -si
```

Install `pipewire` for screen sharing on Wayland. Camera and microphone access
also depend on the permissions and services configured by your desktop.

## Security model

The remote application runs with Chromium sandboxing and context isolation,
without Node integration. The preload bridge exposes nothing to remote pages;
its narrow settings and recovery API is available only to bundled `file:`
pages. Navigation and permissions are restricted to WhatsApp-owned origins.
Authentication remains inside Electron's persistent Chromium session and is
never inspected, exported, or copied into application preferences.

## License

[MIT](LICENSE)
