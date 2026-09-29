# Project
* Purpose: Road2D (R2D) - Mobile app for motorcycle touring/road trips in Vietnam (maps, team routing, safety).
* Stack: React Native 0.81.5, Expo 54, React Navigation v7, TypeScript, Zustand (planned), Axios.
* Entry point: `expo/AppEntry.js` (defined in `package.json` `main`).

# Architecture
* Structure: Standard React Native pattern under `src/` (screens, navigation, components, assets, store, services, types).
* State: Zustand (planned at `src/store`).
* API: Axios (planned at `src/services/api/index.ts`).
* Navigation: `@react-navigation/native` v7 (`src/navigation/AppNavigator.tsx`).
* Key modules: `react-native-maps`, `react-native-reanimated` (~3.17.4).

# Conventions
* **Icons:** Strictly use `@expo/vector-icons` (e.g., Ionicons, FontAwesome). NEVER use external image URLs (e.g., `img.icons8.com`) for icons (causes offline white blocks).
* **Env Vars:** Use `EXPO_PUBLIC_` prefix.
* **Font/Splash:** Always handle Promises (`.catch()`) when using `SplashScreen` to avoid unhandled rejections hanging the app.
* **Dependencies:** Strictly adhere to Expo SDK 54 compatibility matrix. Use `npm install --legacy-peer-deps` to bypass `@types/react` conflicts.

# Decisions
* **No Expo Router:** Removed due to architectural conflicts. We exclusively use React Navigation v7.
* **Web Output:** `app.json` uses `"web": { "output": "single" }` (`static` requires expo-router).
* **React Compiler:** Disabled in `app.json` experiments (missing runtime).
* **Hermes Strict Mode:** RN 0.81 uses strict standard `URL` object (properties are read-only). Mutating `url.protocol` will throw an error.

# Current State
* Implemented: UI mockups for 12 screens, theme tokens, React Navigation stack, removed all `icons8.com` dependencies.
* In Progress: Phase 0 of `ROADMAP_40_DAYS.md` (Cleanup, architecture setup, bug fixes).
* Recently Fixed: Reverted back to stable Expo SDK 54 after bugs with SDK 57 upgrade. `Invariant Violation: "main" has not been registered` fixed by using `expo/AppEntry.js`.

# Known Issues
* **Font Loading Hang:** `App.js` is currently using a stripped-down version without `useFonts` or `SplashScreen` to bypass an app hang issue. The font file `UTM Facebook.ttf` exists, but the loading logic needs to be safely reimplemented.
* **expo-asset Bug:** `node_modules/expo-asset/build/AssetUris.js` was manually patched with `try...catch` because it tries to mutate `URL.protocol`, crashing Hermes strict mode.

# Next
* Safely restore font loading (`UTM Facebook.ttf`) and splash screen logic in `App.js`.
* Proceed with Phase 0, Day 2 of Roadmap (setup Zustand, API skeleton).
