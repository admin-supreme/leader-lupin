(() => {
  'use strict';
  const BASE_URL = "https://worker-admin-logger.neonasmin.workers.dev";
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 30_000; 
  const form = document.getElementById("adminForm");
  const errorMsg = document.getElementById("errorMsg");
  const verifyBtn = document.getElementById("verifyBtn"); 
  if (!form || !errorMsg || !verifyBtn) {
    console.error("Admin script: missing required elements (adminForm, errorMsg, verifyBtn).");
    return;
  }
  const __K = {
    attemptsPrefix: "adm_a_v2_",
    lockoutPrefix: "adm_l_v2_"
  };
  function _keyAttempts(email) { return __K.attemptsPrefix + email; }
  function _keyLockout(email) { return __K.lockoutPrefix + email; }

  function getAttempts(email) {
    try { return parseInt(localStorage.getItem(_keyAttempts(email)) || "0", 10) || 0; }
    catch (e) { return 0; }
  }
  function setAttempts(email, n) {
    try { localStorage.setItem(_keyAttempts(email), String(n)); } catch (e) {}
  }
  function clearAttempts(email) {
    try { localStorage.removeItem(_keyAttempts(email)); } catch (e) {}
  }
  function getLockoutUntil(email) {
    try { return parseInt(localStorage.getItem(_keyLockout(email)) || "0", 10) || 0; }
    catch (e) { return 0; }
  }
  function setLockoutUntil(email, ts) {
    try { localStorage.setItem(_keyLockout(email), String(ts)); } catch (e) {}
  }
  function clearLockout(email) {
    try { localStorage.removeItem(_keyLockout(email)); } catch (e) {}
  }
  Object.freeze(__K);
  Object.freeze(_keyAttempts);
  Object.freeze(_keyLockout);
  Object.freeze(getAttempts);
  Object.freeze(setAttempts);
  Object.freeze(clearAttempts);
  Object.freeze(getLockoutUntil);
  Object.freeze(setLockoutUntil);
  Object.freeze(clearLockout);
  let enforcementInterval = null;
  let enforcementObserver = null;
  function enforceDisableOnButton() {
    try {
      verifyBtn.disabled = true;
      verifyBtn.setAttribute('data-verify-locked', '1');
      verifyBtn.setAttribute('aria-disabled', 'true');
    } catch (e) { /*FUCK UR SELF*/ }
  }
  function reinforceProtection() {
    if (enforcementInterval) clearInterval(enforcementInterval);
    enforcementInterval = setInterval(() => {
      if (verifyBtn.getAttribute('data-verify-locked') === '1') {
        try {
          if (!verifyBtn.disabled) verifyBtn.disabled = true;
          if (verifyBtn.getAttribute('aria-disabled') !== 'true') verifyBtn.setAttribute('aria-disabled', 'true');
        } catch (e) {}
      }
    }, 500); 
  }
  function startMutationObserver() {
    if (enforcementObserver) return;
    enforcementObserver = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === 'attributes' && (m.attributeName === 'disabled' || m.attributeName === 'data-verify-locked' || m.attributeName === 'aria-disabled')) {
          if (verifyBtn.getAttribute('data-verify-locked') === '1' && !verifyBtn.disabled) {
            enforceDisableOnButton();
          }
        }
      }
    });
    try {
      enforcementObserver.observe(verifyBtn, { attributes: true, attributeFilter: ['disabled', 'data-verify-locked', 'aria-disabled'] });
    } catch (e) {
    }
  }
  function stopProtection() {
    try { if (enforcementInterval) { clearInterval(enforcementInterval); enforcementInterval = null; } } catch (e) {}
    try { if (enforcementObserver) { enforcementObserver.disconnect(); enforcementObserver = null; } } catch (e) {}
    try { verifyBtn.removeAttribute('data-verify-locked'); verifyBtn.removeAttribute('aria-disabled'); verifyBtn.disabled = false; } catch (e) {}
  }
  Object.freeze(enforceDisableOnButton);
  Object.freeze(reinforceProtection);
  Object.freeze(startMutationObserver);
  Object.freeze(stopProtection);
  let lockoutTickTimer = null;
  function startLockoutCountdown(email) {
    verifyBtn.classList.add('shake');
setTimeout(() => verifyBtn.classList.remove('shake'), 500);
    const until = getLockoutUntil(email);
    if (Date.now() >= until) {
      clearLockout(email);
      clearAttempts(email);
      stopProtection();
      errorMsg.textContent = "";
      return;
    }
    enforceDisableOnButton();
    startMutationObserver();
    reinforceProtection();
    if (lockoutTickTimer) clearInterval(lockoutTickTimer);
    lockoutTickTimer = setInterval(() => {
      const remainingMs = Math.max(0, getLockoutUntil(email) - Date.now());
      const sec = Math.ceil(remainingMs / 1000);
      errorMsg.textContent = `Too many failed attempts. Verify disabled for ${sec}s.`;
      if (remainingMs <= 0) {
        clearInterval(lockoutTickTimer);
        lockoutTickTimer = null;
        clearLockout(email);
        clearAttempts(email);
        stopProtection();
        errorMsg.textContent = "You may try again.";
      }
    }, 300);
  }
  function canonicalEmail(val) {
    try { return String(val || "").trim().toLowerCase(); } catch (e) { return ""; }
  }
  Object.freeze(canonicalEmail);
  window.addEventListener("load", () => {
    try {
      const last = sessionStorage.getItem("adm_last_email_v2");
      if (last) {
        const until = getLockoutUntil(last);
        if (Date.now() < until) startLockoutCountdown(last);
      }
    } catch (e) {}
  });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const emailRaw = document.getElementById("email").value;
    const email = canonicalEmail(emailRaw);
    const realName = (document.getElementById("realName") || {}).value || "";
    const password = (document.getElementById("password") || {}).value || "";
    try { sessionStorage.setItem("adm_last_email_v2", email); } catch (e) {}
    const until = getLockoutUntil(email);
    if (Date.now() < until) {
      startLockoutCountdown(email);
      return;
    }
    errorMsg.textContent = "Logging in...";
    try {
      const res = await fetch(`${BASE_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, real_name: String(realName).trim().toLowerCase(), password })
      });
      if (res.ok) {
        clearAttempts(email);
        clearLockout(email);
        stopProtection();
        window.location.href = "panelpage/panel.html";
        return;
      }
      let attempts = getAttempts(email) + 1;
      setAttempts(email, attempts);
      if (attempts >= MAX_ATTEMPTS) {
        const untilTs = Date.now() + LOCKOUT_MS;
        setLockoutUntil(email, untilTs);
        setAttempts(email, 0);
        startLockoutCountdown(email);
      } else {
        const left = MAX_ATTEMPTS - attempts;
        errorMsg.textContent = "Invalid credentials. Try again...";
      }
    } catch (err) {
      console.error("Login error:", err);
      errorMsg.textContent = "Network error. Try again.";
    }
  });
  setInterval(() => {
    try {
      if (verifyBtn.getAttribute('data-verify-locked') === '1') {
        if (!enforcementObserver) startMutationObserver();
        if (!enforcementInterval) reinforceProtection();
      }
    } catch (e) {}
  }, 1200);
  try { Object.freeze(window); } catch (e) { /* WHICH BULL SHIT U ARE TRYING TO FIND HERE?*/ }
})();