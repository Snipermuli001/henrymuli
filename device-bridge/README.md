# Henry Device Bridge (Windows)

A small localhost companion for Project Henry. Version 0.1 provides safe, allowlisted ADB/Fastboot discovery, Android device information, reboot, and reboot-to-recovery. It does **not** expose arbitrary CMD execution.

## Windows setup (source mode)
1. Install Python 3.10+ from https://www.python.org/downloads/windows/
2. Download Google's Platform Tools: https://dl.google.com/android/repository/platform-tools-latest-windows.zip
3. Extract the ZIP and place the extracted \`platform-tools\` folder beside \`HenryDeviceBridge.exe\` (or beside this script).
4. Run \`henry_device_bridge.py\`.
5. Copy the pairing token printed in the console into the Android Dev page.
6. Connect an Android phone, enable USB debugging, and approve the computer's RSA prompt.

## Windows executable
The GitHub Actions workflow builds \`HenryDeviceBridge.exe\` and publishes it as a GitHub Release when this project is pushed to the main branch. Check the Android Dev page for the latest release link.

## Security
- Binds only to 127.0.0.1.
- Accepts browser requests only from https://henrymuli.pages.dev.
- Requires a random local bearer token.
- Uses subprocess argument arrays with shell disabled; no arbitrary command endpoint.
- Never stores phone data or sends it to a remote server.
- Destructive reset, partition formatting, FRP bypass, bootloader unlocking and identity/IMEI modification are not implemented.
