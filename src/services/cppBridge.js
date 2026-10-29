/**
 * Optional bridge to the Android WebView host. Web-only environments use
 * harmless fallbacks so app features can run without a native C++ engine.
 */
class CppBridgeService {
  constructor() {
    this.listeners = new Map();
    this.mockState = {
      deviceModel: 'Vivo Y73 (Android 14)',
      refreshRate: 120,
      screenAspect: '20:9',
      screenResolution: '1080x2400',
      batteryLevel: 88,
      isCharging: false,
      networkStatus: '5G_NR_CONNECTED',
      thermalStatus: 'OPTIMAL',
      latencyMs: 1.2,
    };

    if (typeof window !== 'undefined') {
      window.__colorOsNativeDispatch = (eventName, data) => this.emit(eventName, data);
    }
  }

  isAvailable() {
    return typeof window !== 'undefined' && Boolean(window.CppEngine);
  }

  async dispatch(payload = {}) {
    if (this.isAvailable() && typeof window.CppEngine.dispatch === 'function') {
      try {
        const encodedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const response = window.CppEngine.dispatch(encodedPayload);
        const data = typeof response === 'string' ? JSON.parse(response) : response;
        return { success: true, data, native: true };
      } catch (error) {
        console.error('[CppBridge] Native dispatch failed:', error);
        return { success: false, error: error.message, native: true };
      }
    }

    return {
      success: true,
      native: false,
      mock: true,
      data: { ack: true, status: 'EXECUTED_DEV_MOCK', payload },
    };
  }

  triggerHaptic(pattern = 'selection') {
    if (this.isAvailable()) {
      try {
        window.CppEngine.performHapticFeedback(pattern);
        return true;
      } catch (error) {
        console.warn('[CppBridge] Native haptic error:', error);
      }
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      const vibrationMap = {
        selection: 8,
        light: 12,
        medium: 22,
        heavy: 35,
        success: [10, 30, 15],
        recoil: [12, 18],
      };
      try {
        navigator.vibrate(vibrationMap[pattern] || 10);
      } catch {
        // Vibration is optional and not supported in all browsers.
      }
    }
    return false;
  }

  async sendIpcCommand(command, payload = {}) {
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (this.isAvailable()) {
      try {
        const response = window.CppEngine.dispatch(JSON.stringify({ command, payload }));
        const data = typeof response === 'string' ? JSON.parse(response) : response;
        const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (data?.accepted === false) {
          return { success: false, error: `Native command '${command}' was not accepted`, data, native: true };
        }
        return { success: true, data, latency: (endedAt - startedAt).toFixed(2), native: true };
      } catch (error) {
        console.error(`[CppBridge] IPC command '${command}' failed:`, error);
        return { success: false, error: error.message, native: true };
      }
    }

    return {
      success: true,
      command,
      timestamp: Date.now(),
      latency: '0.85',
      native: false,
      mock: true,
      data: { ack: true, status: 'EXECUTED_DEV_MOCK', details: payload },
    };
  }

  async getSystemState() {
    if (this.isAvailable()) {
      try {
        const response = window.CppEngine.getSystemTelemetry();
        return typeof response === 'string' ? JSON.parse(response) : response;
      } catch (error) {
        console.warn('[CppBridge] Failed to read native telemetry:', error);
      }
    }
    return { ...this.mockState, timestamp: Date.now() };
  }

  async injectPromptToWebview(targetModel, promptText) {
    this.triggerHaptic('medium');
    return this.sendIpcCommand('INJECT_PROMPT', {
      target: targetModel,
      prompt: promptText,
      autoSubmit: true,
      timestamp: Date.now(),
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[CppBridge] Error in listener for ${event}:`, error);
      }
    });
  }
}

export const cppBridge = new CppBridgeService();
export default cppBridge;
