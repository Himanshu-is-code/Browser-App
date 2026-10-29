# ColorOS Browser Android wrapper

This project packages the Vite frontend in a native Android WebView and exposes a JNI bridge named `window.CppEngine`. User-created tabs open in native WebViews; the **‹ App** control returns to the React shell.

## Build

From the repository root:

```sh
npm install
npm run build
```

Then open `android-app/` in Android Studio and run the `app` configuration. The Android `preBuild` task syncs the latest root `dist/` files into `app/src/main/assets/`. The Vite build uses relative asset URLs so it works from `file:///android_asset/index.html`.

To build from a terminal after the Gradle wrapper has been generated:

```sh
cd android-app
./gradlew assembleDebug
```

On Windows, use `gradlew.bat assembleDebug`.

## JNI bridge

- `window.CppEngine.dispatch(json)` routes create, switch, update, close, reload, and prompt commands through `MainActivity.nativeDispatchPayload` in `app/src/main/cpp/engine.cpp`.
- `TabManager.java` owns per-tab WebViews, in-app HTTP(S) navigation, persistent WebView cookies, and prompt injection for the supported DeepSeek, Gemini, ChatGPT, and Claude domains.
- The Java bridge also exposes `getSystemTelemetry` and `performHapticFeedback` for the existing React `cppBridge` service.
- Prompt injection uses the loaded page's DOM and can stop working if a provider changes its page structure. The app does not disable WebView origin security or attempt injection into unrelated sites.
