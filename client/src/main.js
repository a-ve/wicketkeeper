import "./styles.css";
import { solver } from "solver";

(function (window, document) {
  "use strict";

  const DEFAULT_MESSAGE = "Verify you are human";
  const DEFAULT_CHALLENGE_URL = CHALLENGE_URL;

  const $ = (sel, root) => (root || document).querySelector(sel);

  async function getChallenge(url) {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      let msg;
      try {
        msg = await res.text();
      } catch {}
      throw new Error(`HTTP ${res.status}: ${msg || url}`);
    }
    return res.json();
  }

  function render(container, opts = {}) {
    if (!container || container.__rendered) return;
    container.__rendered = true;

    const options = { inputName: "wicketkeeper_solution", ...opts };
    const endpoints = {
      challenge: options.endpoints?.challenge || DEFAULT_CHALLENGE_URL,
    };
    if (!endpoints.challenge)
      throw new Error("endpoints.challenge is required");

    container.setAttribute("role", "button");
    container.setAttribute("tabindex", "0");
    container.classList.add("wicketkeeper");
    container.innerHTML = `
      <div class="wicketkeeper-left">
        <div class="wicketkeeper-indicator">
          <svg class="wicketkeeper-check" viewBox="0 0 24 24">
            <polyline points="5 13 9 17 19 7"/>
          </svg>
          <div class="wicketkeeper-spinner"></div>
        </div>
        <span class="wicketkeeper-message">${DEFAULT_MESSAGE}</span>
      </div>
    `;

    const indicator = $(".wicketkeeper-indicator", container);
    const msgEl = $(".wicketkeeper-message", container);

    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = options.inputName;
    hiddenInput.value = "";
    container.appendChild(hiddenInput);

    function setLoading(on) {
      indicator.classList.toggle("loading", on);
      container.setAttribute("aria-disabled", String(on));
      container.style.pointerEvents = on ? "none" : "auto";
    }

    function flashError(text) {
      const orig = container.style.borderColor;
      container.style.borderColor = "#e74c3c";
      container.title = text || "";
      setTimeout(() => {
        container.style.borderColor = orig;
        container.title = "";
      }, 2000);
    }

    function reset() {
      setLoading(false);
      indicator.classList.remove("loading", "success");
      container.classList.remove("success");
      msgEl.textContent = DEFAULT_MESSAGE;
      hiddenInput.value = "";
      delete container.dataset.wicketkeeperSolution;
    }
    container.wicketkeeperReset = reset;

    async function solve() {
      try {
        setLoading(true);
        msgEl.textContent = "Processing...";
        const ch = await getChallenge(endpoints.challenge);
        const { token } = ch;
        const { nonce, response } = await solver(ch);

        msgEl.textContent = "Verified!";
        indicator.classList.add("success");
        container.classList.add("success");
        setLoading(false);

        const solved = { id: ch.id, nonce, response, token };
        container.dataset.wicketkeeperSolution = JSON.stringify(solved);
        hiddenInput.value = JSON.stringify(solved);
        options.onSolved?.(solved);
      } catch (err) {
        console.error(err);
        flashError(err.message);
        reset();
        setLoading(false);
        msgEl.textContent = "Error. Click to retry";
        options.onError?.(err);
      }
    }

    function clickHandler() {
      if (
        indicator.classList.contains("loading") ||
        indicator.classList.contains("success")
      )
        return;
      solve();
    }
    container.addEventListener("click", clickHandler);
    container.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        clickHandler();
      }
    });
  }

  function autoRender() {
    document
      .querySelectorAll(".wicketkeeper:not([data-initialised])")
      .forEach((el) => {
        el.dataset.initialised = "true";
        const opts = {};
        if (el.dataset.challengeUrl)
          opts.endpoints = { challenge: el.dataset.challengeUrl };
        if (el.dataset.inputName) opts.inputName = el.dataset.inputName;
        render(el, opts);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoRender);
  } else {
    autoRender();
  }

  window.wicketkeeperCaptcha = {
    render,
    reset(el) {
      if (el?.wicketkeeperReset) el.wicketkeeperReset();
      else console.warn("reset method not found");
    },
  };
})(window, document);
