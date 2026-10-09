# Project Henry Floating Music Player (Android)

This is a separate Android companion app. It does not replace or restructure the Project Henry website or radio player.

## What it does
- Opens the existing Project Henry Music Hub in a WebView.
- Adds a **FLOAT** button that enters Android Picture-in-Picture (PiP).
- Shows a compact floating panel with previous, play/pause, next, and close controls.
- Sends those controls to the existing Music Hub player.

## Build
A GitHub Actions workflow builds a debug APK whenever files under `android-player/` change. Open the repository's **Actions** tab, choose **Build Project Henry Android Player**, open the latest successful run, and download the `project-henry-floating-player-debug` artifact. Extract the ZIP to get `app-debug.apk`.

## Install and use
1. Install the APK on Android 8.0 or later. If prompted, allow installation from that source.
2. Open **Project Henry Player** and let Music Hub load.
3. Search for a song and start it.
4. Tap **FLOAT**. Android's mini-window should remain above other apps; drag it if your phone allows repositioning.
5. Use the mini-player controls to change tracks or pause playback.

## Important limitations
- This first version uses Android Picture-in-Picture rather than a custom always-on-top overlay permission.
- Playback depends on the YouTube embedded player and Android WebView behavior. Some videos may refuse autoplay or may stop when the app loses foreground focus. Continuous background audio is not guaranteed until tested on the target phone.
- This is a debug build, not a signed production release.
