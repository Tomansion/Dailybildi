class AnalyticsService {
  constructor() {
    this.scriptId = "umami-tracker";
    this.pendingEvents = [];
    this.isInitialized = false;
    this.isLoading = false;
    this.scriptUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL || "";
    this.websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID || "";
    this.hostUrl = import.meta.env.VITE_UMAMI_HOST_URL || "";
    this.domains = import.meta.env.VITE_UMAMI_DOMAINS || "";
    this.tag = import.meta.env.VITE_UMAMI_TAG || "";
    this.enabled = this.getEnabledState();
  }

  getEnabledState() {
    const configured = Boolean(this.scriptUrl && this.websiteId);
    const enabledEnv = import.meta.env.VITE_UMAMI_ENABLED;

    if (enabledEnv === undefined) {
      return configured;
    }

    return enabledEnv === "true" && configured;
  }

  getBooleanConfig(key, defaultValue = false) {
    const value = import.meta.env[key];

    if (value === undefined) {
      return defaultValue;
    }

    return value === "true";
  }

  init() {
    if (
      !this.enabled ||
      typeof window === "undefined" ||
      typeof document === "undefined"
    ) {
      return;
    }

    if (window.umami?.track) {
      this.isInitialized = true;
      this.flushPendingEvents();
      return;
    }

    if (this.isLoading) {
      return;
    }

    const existingScript = document.getElementById(this.scriptId);

    if (existingScript) {
      this.isLoading = true;
      existingScript.addEventListener(
        "load",
        () => {
          this.isInitialized = true;
          this.isLoading = false;
          this.flushPendingEvents();
        },
        { once: true },
      );
      existingScript.addEventListener(
        "error",
        () => {
          this.isLoading = false;
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = this.scriptId;
    script.defer = true;
    script.src = this.scriptUrl;
    script.dataset.websiteId = this.websiteId;
    script.dataset.doNotTrack = String(
      this.getBooleanConfig("VITE_UMAMI_DO_NOT_TRACK", true),
    );
    script.dataset.excludeSearch = String(
      this.getBooleanConfig("VITE_UMAMI_EXCLUDE_SEARCH", true),
    );
    script.dataset.excludeHash = String(
      this.getBooleanConfig("VITE_UMAMI_EXCLUDE_HASH", true),
    );
    script.dataset.performance = String(
      this.getBooleanConfig("VITE_UMAMI_TRACK_PERFORMANCE", true),
    );

    if (this.hostUrl) {
      script.dataset.hostUrl = this.hostUrl;
    }

    if (this.domains) {
      script.dataset.domains = this.domains;
    }

    if (this.tag) {
      script.dataset.tag = this.tag;
    }

    this.isLoading = true;

    script.addEventListener(
      "load",
      () => {
        this.isInitialized = true;
        this.isLoading = false;
        this.flushPendingEvents();
      },
      { once: true },
    );

    script.addEventListener(
      "error",
      () => {
        this.isLoading = false;
        console.error("Failed to load Umami tracker");
      },
      { once: true },
    );

    document.head.appendChild(script);
  }

  sanitizeEventData(data = {}) {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
  }

  flushPendingEvents() {
    if (!window.umami?.track || this.pendingEvents.length === 0) {
      return;
    }

    const queuedEvents = [...this.pendingEvents];
    this.pendingEvents = [];

    queuedEvents.forEach(({ eventName, data }) => {
      this.track(eventName, data);
    });
  }

  track(eventName, data = {}) {
    if (!this.enabled || !eventName) {
      return;
    }

    const payload = this.sanitizeEventData(data);

    if (window.umami?.track) {
      if (Object.keys(payload).length > 0) {
        window.umami.track(eventName, payload);
      } else {
        window.umami.track(eventName);
      }
      return;
    }

    this.pendingEvents.push({ eventName, data: payload });
    this.init();
  }
}

export const analytics = new AnalyticsService();
