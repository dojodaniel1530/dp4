/*!
 * KDJO cookie & ad consent
 *
 * - Must be loaded BEFORE the Google AdSense <script> tag (sync, in <head>).
 * - Uses Google Consent Mode v2 (ad_storage / ad_user_data / ad_personalization).
 * - Defaults: DENIED for the EEA, UK and Switzerland (opt-in);
 *             GRANTED elsewhere (opt-out, e.g. US/California).
 * - Honors the Global Privacy Control browser signal as an opt-out.
 * - The visitor's choice is stored in localStorage ('kdjo_ad_consent').
 * - Any element with a  data-cookie-settings  attribute re-opens the banner.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'kdjo_ad_consent'; // 'accepted' | 'declined'

  // EEA + UK + Switzerland: consent is required before ad cookies are used.
  var STRICT_REGIONS = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
    'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL',
    'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'CH'
  ];

  // First-party cookies Google's ad scripts may set on this domain.
  var GOOGLE_COOKIES = ['__gads', '__gpi', '__eoi', '_gcl_au'];

  var GRANTED = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' };
  var DENIED  = { ad_storage: 'denied',  ad_user_data: 'denied',  ad_personalization: 'denied'  };

  /* ---------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  function extend(a, b) {
    var out = {}, k;
    for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) out[k] = a[k];
    for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) out[k] = b[k];
    return out;
  }

  function getChoice() {
    try {
      var v = window.localStorage.getItem(STORAGE_KEY);
      return (v === 'accepted' || v === 'declined') ? v : null;
    } catch (e) { return null; }
  }

  function setChoice(v) {
    try { window.localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* storage blocked */ }
  }

  function gpcOn() {
    return typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true;
  }

  // 'accepted' | 'declined' | null (null = no choice yet, regional defaults apply)
  function currentState() {
    return getChoice() || (gpcOn() ? 'declined' : null);
  }

  function setNonPersonalized(on) {
    var q = (window.adsbygoogle = window.adsbygoogle || []);
    q.requestNonPersonalizedAds = on ? 1 : 0;
  }

  function clearGoogleCookies() {
    if (typeof document === 'undefined') return;
    var parts = location.hostname.split('.');
    var domains = [''];
    for (var i = 0; i < parts.length - 1; i++) {
      domains.push(parts.slice(i).join('.'));
      domains.push('.' + parts.slice(i).join('.'));
    }
    GOOGLE_COOKIES.forEach(function (name) {
      domains.forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' +
          (d ? '; domain=' + d : '');
      });
    });
  }

  /* ---------------------------------------------------------------
   * 1) Consent Mode defaults + restore saved choice
   *    (runs immediately, before AdSense loads)
   * ------------------------------------------------------------- */
  gtag('consent', 'default', extend({ region: STRICT_REGIONS }, DENIED)); // EEA/UK/CH
  gtag('consent', 'default', extend({}, GRANTED));                        // everyone else

  var initial = currentState();
  if (initial === 'accepted') {
    gtag('consent', 'update', GRANTED);
    setNonPersonalized(false);
  } else if (initial === 'declined') {
    gtag('consent', 'update', DENIED);
    setNonPersonalized(true);
  }

  // Exposed mainly for testing/debugging.
  window.kdjoConsent = {
    state: currentState,
    open: function () { openBanner(); }
  };

  /* ---------------------------------------------------------------
   * 2) Banner UI
   * ------------------------------------------------------------- */
  var CSS =
    '#kdjoConsent{position:fixed;left:50%;transform:translateX(-50%);' +
    'bottom:calc(1rem + env(safe-area-inset-bottom,0px));width:min(680px,calc(100% - 2rem));' +
    'z-index:10000;background:#fff;color:#1C130E;border:4px solid #1C130E;border-radius:20px;' +
    'box-shadow:4px 6px 0 #1C130E;padding:1.25rem 1.5rem;font-family:"Rubik",sans-serif;box-sizing:border-box}' +
    '#kdjoConsent[hidden]{display:none!important}' +
    '#kdjoConsent .kc-title{font-family:"Righteous",cursive;font-size:1.4rem;margin:0 0 .4rem;display:flex;align-items:center;gap:.6rem}' +
    '#kdjoConsent .kc-title i{color:#FF7B54}' +
    '#kdjoConsent p{margin:0 0 .75rem;font-size:.95rem;line-height:1.6;color:#574B45}' +
    '#kdjoConsent a{color:#C92A37;font-weight:700}' +
    '#kdjoConsent .kc-status{font-family:"Space Grotesk",sans-serif;font-weight:700;color:#1C130E;' +
    'background:#FDFBF7;border:2px solid #1C130E;border-radius:12px;padding:.4rem .8rem;font-size:.85rem}' +
    '#kdjoConsent .kc-actions{display:flex;gap:.75rem;flex-wrap:wrap}' +
    '#kdjoConsent .kc-btn{flex:1 1 0;min-width:130px;font-family:"Space Grotesk",sans-serif;font-weight:800;' +
    'font-size:.95rem;color:#1C130E;border:3px solid #1C130E;border-radius:9999px;padding:.6rem 1.2rem;cursor:pointer;' +
    'box-shadow:2px 3px 0 #1C130E;transition:transform .15s ease,box-shadow .15s ease}' +
    '#kdjoConsent .kc-btn:hover,#kdjoConsent .kc-btn:focus-visible{transform:translate(1px,1px);box-shadow:1px 2px 0 #1C130E}' +
    '#kdjoConsent .kc-accept{background:#FFDE59}' +
    '#kdjoConsent .kc-decline{background:#fff}' +
    '#kdjoConsent .kc-close{position:absolute;top:.6rem;right:.8rem;background:none;border:0;font-size:1.6rem;' +
    'line-height:1;cursor:pointer;color:#1C130E}' +
    '@media (max-width:480px){#kdjoConsent{padding:1rem 1.1rem}#kdjoConsent .kc-btn{flex-basis:100%}}';

  var banner = null;

  function stateLabel() {
    if (getChoice() === 'accepted') return 'Current setting: personalized ads allowed.';
    if (getChoice() === 'declined') return 'Current setting: opted out (non-personalized ads).';
    if (gpcOn()) return 'Your browser\u2019s Global Privacy Control signal is on, so we treat this as an opt-out.';
    return '';
  }

  function build() {
    if (banner) return banner;

    var style = document.createElement('style');
    style.id = 'kdjo-consent-css';
    style.textContent = CSS;
    document.head.appendChild(style);

    banner = document.createElement('div');
    banner.id = 'kdjoConsent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'kdjoConsentTitle');
    banner.setAttribute('aria-describedby', 'kdjoConsentText');
    banner.hidden = true;
    banner.innerHTML =
      '<button type="button" class="kc-close" aria-label="Close cookie settings" hidden>&times;</button>' +
      '<div class="kc-title" id="kdjoConsentTitle"><i class="fa-solid fa-cookie-bite" aria-hidden="true"></i> Cookies &amp; Ads</div>' +
      '<p id="kdjoConsentText">98.7 KDJO is free to listen to, and ads from Google AdSense help keep it on the air. ' +
      'Google uses cookies to show and measure ads. You can accept, or opt out and see non-personalized ads only. ' +
      '<a href="privacy.html">Privacy Policy</a></p>' +
      '<p class="kc-status" hidden></p>' +
      '<div class="kc-actions">' +
      '<button type="button" class="kc-btn kc-accept">Accept</button>' +
      '<button type="button" class="kc-btn kc-decline">Opt Out</button>' +
      '</div>';
    document.body.appendChild(banner);

    banner.querySelector('.kc-accept').addEventListener('click', function () { applyChoice('accepted'); });
    banner.querySelector('.kc-decline').addEventListener('click', function () { applyChoice('declined'); });
    banner.querySelector('.kc-close').addEventListener('click', closeBanner);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && banner && !banner.hidden && currentState()) closeBanner();
    });

    return banner;
  }

  function openBanner() {
    if (!document.body) return;
    build();
    var reopened = !!currentState();
    var status = banner.querySelector('.kc-status');
    var label = stateLabel();
    status.textContent = label;
    status.hidden = !label;
    banner.querySelector('.kc-close').hidden = !reopened;
    banner.hidden = false;
    if (reopened) banner.querySelector('.kc-accept').focus();
  }

  function closeBanner() {
    if (banner) banner.hidden = true;
  }

  function applyChoice(next) {
    var prev = currentState();
    setChoice(next);

    if (next === 'accepted') {
      gtag('consent', 'update', GRANTED);
      setNonPersonalized(false);
      closeBanner();
    } else {
      gtag('consent', 'update', DENIED);
      setNonPersonalized(true);
      clearGoogleCookies();
      closeBanner();
      // Ads may already have loaded under the granted default; reload so this
      // page (and its ad requests) start clean in the opted-out state.
      if (prev !== 'declined') window.location.reload();
    }
  }

  function init() {
    // Any link/button with data-cookie-settings re-opens the banner.
    document.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== document) {
        if (t.hasAttribute && t.hasAttribute('data-cookie-settings')) {
          e.preventDefault();
          openBanner();
          return;
        }
        t = t.parentNode;
      }
    });

    // First visit with no saved choice and no GPC signal: ask.
    if (!currentState()) openBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
