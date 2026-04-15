/* global window, document */
(function bootstrapLabelSuiteAnalytics(windowObj, documentObj) {
  const STORAGE_KEY = 'ux_participant_id';
  const DEFAULT_LOCAL_CONFIG_FILE = 'analytics.config.local.json';
  const DEFAULT_CONFIG = {
    token: '',
    apiHost: '',
    version: 'v1',
  };
  let isInitialized = false;
  let trackingDisabled = false;
  let initPromise = null;
  const pendingEvents = [];

  function loadPostHogSnippet() {
    !(function (t, e) {
      let o;
      let n;
      let p;
      let r;
      if (!e.__SV && !(windowObj.posthog && windowObj.posthog.__loaded)) {
        windowObj.posthog = e;
        e._i = [];
        e.init = function (i, s, a) {
          function g(target, method) {
            const split = method.split('.');
            if (split.length === 2) {
              target = target[split[0]];
              method = split[1];
            }
            target[method] = function () {
              target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
            };
          }
          p = t.createElement('script');
          p.type = 'text/javascript';
          p.crossOrigin = 'anonymous';
          p.async = true;
          p.src = `${s.api_host.replace('.i.posthog.com', '-assets.i.posthog.com')}/static/array.js`;
          r = t.getElementsByTagName('script')[0];
          r.parentNode.insertBefore(p, r);
          let u = e;
          if (a !== undefined) {
            u = e[a] = [];
          } else {
            a = 'posthog';
          }
          u.people = u.people || [];
          u.toString = function (stub) {
            let str = 'posthog';
            if (a !== 'posthog') str += `.${a}`;
            if (!stub) str += ' (stub)';
            return str;
          };
          u.people.toString = function () {
            return `${u.toString(1)}.people (stub)`;
          };
          o =
            'init Dr qr Ci Br Zr Pr capture calculateEventProperties Ur register register_once register_for_session unregister unregister_for_session Xr getFeatureFlag getFeatureFlagPayload getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync Jr identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty Gr Hr createPersonProfile setInternalOrTestUser Wr Fr tn opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing $r debug ki Yr getPageViewId captureTraceFeedback captureTraceMetric Rr'.split(
              ' '
            );
          for (n = 0; n < o.length; n += 1) g(u, o[n]);
          e._i.push([i, s, a]);
        };
        e.__SV = 1;
      }
    })(documentObj, windowObj.posthog || []);
  }

  function getOrCreateParticipantId() {
    let participantId = windowObj.localStorage.getItem(STORAGE_KEY);
    if (!participantId) {
      participantId = `ux_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      windowObj.localStorage.setItem(STORAGE_KEY, participantId);
    }
    return participantId;
  }

  function getAnalyticsScriptUrl() {
    const scripts = Array.from(documentObj.getElementsByTagName('script'));
    const analyticsScript = scripts.find(script => {
      const src = script.getAttribute('src') || '';
      return src.includes('/assets/analytics.js') || src.endsWith('analytics.js');
    });
    if (!analyticsScript) return null;
    return analyticsScript.src || null;
  }

  function getDefaultConfigUrl() {
    const scriptUrl = getAnalyticsScriptUrl();
    if (!scriptUrl) return null;
    try {
      return new URL(DEFAULT_LOCAL_CONFIG_FILE, scriptUrl).toString();
    } catch {
      return null;
    }
  }

  async function getConfigFromJson(configUrl) {
    if (!configUrl || typeof windowObj.fetch !== 'function') return {};
    try {
      const response = await windowObj.fetch(configUrl, { cache: 'no-store' });
      if (!response.ok) return {};
      const data = await response.json();
      return data && typeof data === 'object' ? data : {};
    } catch {
      return {};
    }
  }

  function flushPendingEvents() {
    if (!windowObj.posthog || typeof windowObj.posthog.capture !== 'function') return;
    while (pendingEvents.length > 0) {
      const next = pendingEvents.shift();
      windowObj.posthog.capture(next.eventName, next.properties);
    }
  }

  function isLocalhost() {
    const hostname = windowObj.location && windowObj.location.hostname;
    if (!hostname) return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    if (hostname === '0.0.0.0' || hostname.endsWith('.local')) return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    return false;
  }

  async function init(config) {
    if (isInitialized) return true;
    if (trackingDisabled) return false;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      const inputConfig = config || {};
      if (isLocalhost()) {
        trackingDisabled = true;
        if (windowObj.posthog && typeof windowObj.posthog.opt_out_capturing === 'function') {
          windowObj.posthog.opt_out_capturing();
        }
        pendingEvents.length = 0;
        initPromise = null;
        return false;
      }
      const configUrl = inputConfig.configUrl || getDefaultConfigUrl();
      const fromJson = await getConfigFromJson(configUrl);
      const finalConfig = {
        token: inputConfig.token || fromJson.token || DEFAULT_CONFIG.token,
        apiHost: inputConfig.apiHost || fromJson.apiHost || DEFAULT_CONFIG.apiHost,
        page: inputConfig.page || 'unknown',
        version: inputConfig.version || fromJson.version || DEFAULT_CONFIG.version,
      };
      if (!finalConfig.token || !finalConfig.apiHost) {
        initPromise = null;
        return false;
      }

      loadPostHogSnippet();
      windowObj.posthog.init(finalConfig.token, {
        api_host: finalConfig.apiHost,
        defaults: '2026-01-30',
        person_profiles: 'identified_only',
        autocapture: true,
        capture_pageview: true,
        capture_pageleave: true,
      });

      const participantId = getOrCreateParticipantId();
      windowObj.posthog.identify(participantId);
      windowObj.posthog.register({
        prototype_page: finalConfig.page,
        prototype_version: finalConfig.version,
      });

      isInitialized = true;
      flushPendingEvents();
      return true;
    })();

    return initPromise;
  }

  function track(eventName, properties) {
    if (trackingDisabled) return;
    const safeProperties = properties || {};
    if (!isInitialized) {
      pendingEvents.push({ eventName, properties: safeProperties });
      return;
    }
    if (!windowObj.posthog || typeof windowObj.posthog.capture !== 'function') return;
    windowObj.posthog.capture(eventName, safeProperties);
  }

  function resolveDynamicProperties(input) {
    if (typeof input === 'function') return input() || {};
    return input || {};
  }

  function bindClickTrack(id, eventName, options) {
    const el = documentObj.getElementById(id);
    if (!el) return false;
    const safeOptions = options || {};

    el.addEventListener('click', () => {
      const context = resolveDynamicProperties(safeOptions.context);
      const extra = resolveDynamicProperties(safeOptions.extra);
      track(eventName, {
        element_id: id,
        ...context,
        ...extra,
      });
    });

    return true;
  }

  function bindClickTracks(bindings, context) {
    const safeBindings = Array.isArray(bindings) ? bindings : [];
    safeBindings.forEach(binding => {
      bindClickTrack(binding.id, binding.eventName, {
        context,
        extra: binding.extra,
      });
    });
  }

  function trackPageView(pageName, context) {
    track('prototype_page_viewed', {
      page: pageName,
      ...resolveDynamicProperties(context),
    });
  }

  windowObj.LabelSuiteAnalytics = {
    init,
    track,
    bindClickTrack,
    bindClickTracks,
    trackPageView,
  };
})(window, document);
