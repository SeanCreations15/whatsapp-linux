# Maintainer: WhatsApp Linux contributors
pkgname=whatsapp-linux
pkgver=0.2.1
pkgrel=1
pkgdesc="Unofficial WhatsApp Web desktop client for Linux"
arch=('x86_64')
url="https://github.com/SeanCreations15/whatsapp-linux"
license=('MIT')
depends=('electron43')
optdepends=('pipewire: screen sharing under Wayland')
makedepends=('nodejs' 'npm')
source=("$pkgname-$pkgver.tar.gz::https://github.com/SeanCreations15/$pkgname/archive/refs/tags/v$pkgver.tar.gz")
sha256sums=('SKIP')

build() {
  cd "$pkgname-$pkgver"
  npm ci
  npm run build
  npx asar pack out app.asar
}

package() {
  cd "$pkgname-$pkgver"
  install -Dm644 app.asar "$pkgdir/usr/lib/$pkgname/app.asar"
  install -Dm755 packaging/whatsapp-linux "$pkgdir/usr/bin/whatsapp-linux"
  install -Dm644 packaging/whatsapp-linux.desktop "$pkgdir/usr/share/applications/whatsapp-linux.desktop"
  install -Dm644 assets/icon.svg "$pkgdir/usr/share/icons/hicolor/scalable/apps/whatsapp-linux.svg"
  install -Dm644 assets/icon.png "$pkgdir/usr/share/icons/hicolor/512x512/apps/whatsapp-linux.png"
  install -Dm644 LICENSE "$pkgdir/usr/share/licenses/$pkgname/LICENSE"
  install -Dm644 README.md "$pkgdir/usr/share/doc/$pkgname/README.md"
}
