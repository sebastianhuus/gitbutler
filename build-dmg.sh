#!/bin/bash
# Build GitButler DMG in Terminal.app (required for macOS permissions)

PROJECT_DIR="/Users/sebastian.huus/dev/projects/gitbutler"

# Create a temporary script to run in Terminal
TEMP_SCRIPT=$(mktemp /tmp/build-dmg.XXXXXX.sh)
cat > "$TEMP_SCRIPT" << 'EOF'
#!/bin/bash
cd "/Users/sebastian.huus/dev/projects/gitbutler"

echo "=================================="
echo "Building GitButler DMG..."
echo "=================================="
echo ""

pnpm tauri build --features devtools,builtin-but,disable-auto-updates --config crates/gitbutler-tauri/tauri.conf.nightly-local.json

echo ""
echo "=================================="
echo "Build complete!"
echo "=================================="
echo "DMG location: target/tauri/release/bundle/dmg/"
echo ""
echo "Press any key to close this window..."
read -n 1

# Clean up
rm "$0"
EOF

chmod +x "$TEMP_SCRIPT"

# Open Terminal.app and run the script
open -a Terminal.app "$TEMP_SCRIPT"

echo "Build started in Terminal.app..."
echo "A new Terminal window should open with the build process."
