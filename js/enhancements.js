/* =========================================================================
   LA MAJESTE GROUP (MEK) — enhancements

   Purely additive interactive behaviour: scroll reveals, hero parallax,
   floor-plan hotspots, animated counters, the residential/commercial view
   toggle, the scroll progress bar, distance-ledger filter/sort, and the
   horizontal infrastructure timeline.

   This file never touches CONFIG, the lead-form submission logic, or the
   FAQ accordion in js/main.js — those keep working exactly as before.
   ========================================================================= */

(function () {
  'use strict';

  // JS is running — let CSS know so [data-reveal] content isn't stuck
  // invisible on the (unlikely) chance the reveal observer below fails.
  document.documentElement.classList.remove('no-js');

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Hero background video: respect reduced motion ---------------- */
  (function heroVideo() {
    var video = document.querySelector('.hero-bg video');
    if (!video) return;
    if (reduceMotion) {
      video.pause();
      video.removeAttribute('autoplay');
    }
  })();

  /* ---------------- Scroll progress bar ---------------- */
  (function scrollProgress() {
    var bar = document.getElementById('scrollProgress');
    if (!bar) return;

    var ticking = false;
    function update() {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var pct = height > 0 ? Math.min(100, Math.max(0, (scrollTop / height) * 100)) : 0;
      bar.style.width = pct + '%';
      bar.setAttribute('aria-valuenow', String(Math.round(pct)));
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  })();

  /* ---------------- Scroll-driven reveal animations ---------------- */
  (function reveal() {
    var targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------- Subtle hero parallax ---------------- */
  (function parallax() {
    if (reduceMotion) return;
    var bg = document.querySelector('[data-parallax] img, [data-parallax] video');
    var wrap = document.querySelector('[data-parallax]');
    if (!bg || !wrap) return;

    var ticking = false;
    function update() {
      var rect = wrap.getBoundingClientRect();
      // Only move while the hero is at least partly on screen.
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        var offset = rect.top * 0.18; // subtle: ~18% of scroll distance
        bg.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0) scale(1.08)';
      }
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* ---------------- Floor-plan hotspots ---------------- */
  (function hotspots() {
    var buttons = document.querySelectorAll('.hotspot');
    if (!buttons.length) return;

    var openTip = null;
    var openBtn = null;

    function closeTip() {
      if (openTip) {
        openTip.remove();
        openTip = null;
      }
      if (openBtn) {
        openBtn.setAttribute('aria-expanded', 'false');
        openBtn = null;
      }
    }

    function openTipFor(btn) {
      closeTip();

      var wrap = btn.closest('.floorplan-wrap');
      if (!wrap) return;

      var tip = document.createElement('div');
      tip.className = 'hotspot-tip';
      tip.setAttribute('role', 'tooltip');

      var dim = btn.getAttribute('data-dim') || '';
      var note = btn.getAttribute('data-note') || '';
      var label = btn.querySelector('.sr-only');
      var title = label ? label.textContent.replace(/\s*details\s*$/i, '') : '';

      var strong = document.createElement('strong');
      strong.textContent = title + (dim ? ' — ' + dim : '');
      tip.appendChild(strong);

      if (note) {
        var p = document.createElement('span');
        p.textContent = note.replace(/\s*—\s*placeholder.*$/i, '');
        tip.appendChild(p);
      }

      var flag = document.createElement('span');
      flag.className = 'placeholder-flag';
      flag.textContent = 'Placeholder figure — confirm with sales desk';
      tip.appendChild(flag);

      // Position as a percentage of the wrap, matching the button's own
      // left/top so the tip stays anchored under scaling/resizing.
      tip.style.left = btn.style.left;
      tip.style.top = btn.style.top;

      wrap.appendChild(tip);
      openTip = tip;
      openBtn = btn;
      btn.setAttribute('aria-expanded', 'true');
    }

    buttons.forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-haspopup', 'true');

      btn.addEventListener('click', function (event) {
        event.stopPropagation();
        if (openBtn === btn) {
          closeTip();
        } else {
          openTipFor(btn);
        }
      });

      btn.addEventListener('mouseenter', function () { openTipFor(btn); });
      btn.addEventListener('focus', function () { openTipFor(btn); });
    });

    document.addEventListener('click', closeTip);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeTip();
    });
  })();

  /* ---------------- Animated stat counters ---------------- */
  (function counters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;

    function animate(el) {
      var target = parseFloat(el.getAttribute('data-target'));
      if (isNaN(target)) return;
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';

      if (reduceMotion) {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
        return;
      }

      var duration = 1400;
      var start = null;

      function frame(ts) {
        if (start === null) start = ts;
        var progress = Math.min(1, (ts - start) / duration);
        // ease-out cubic
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = target * eased;
        el.textContent = prefix + value.toFixed(decimals) + suffix;
        if (progress < 1) {
          window.requestAnimationFrame(frame);
        } else {
          el.textContent = prefix + target.toFixed(decimals) + suffix;
        }
      }
      window.requestAnimationFrame(frame);
    }

    if (!('IntersectionObserver' in window)) {
      els.forEach(animate);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------- Possession countdown ---------------- */
  (function countdown() {
    var el = document.querySelector('[data-countdown]');
    if (!el) return;
    var target = new Date(el.getAttribute('data-countdown'));
    if (isNaN(target.getTime())) return;

    var original = el.textContent;

    function render() {
      var now = new Date();
      var diffMs = target.getTime() - now.getTime();
      if (diffMs <= 0) {
        el.textContent = original;
        return;
      }
      var days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      var years = Math.floor(days / 365);
      var remDays = days % 365;
      if (years > 0) {
        el.textContent = years + 'y ' + remDays + 'd';
      } else {
        el.textContent = days + 'd';
      }
      el.setAttribute('title', 'Possession target: ' + original);
    }

    render();
    // A daily tick is more than enough for a multi-year countdown.
    window.setInterval(render, 1000 * 60 * 60);
  })();

  /* ---------------- Residential/Commercial view toggle ---------------- */
  (function viewToggle() {
    var buttons = document.querySelectorAll('.view-btn');
    if (!buttons.length) return;

    var STORAGE_KEY = 'mek-view-focus';

    // Homes/offices are now fully display:none'd when not selected (see
    // css/enhancements.css), so after switching to a solo view the visitor
    // should land on the section that remains rather than stay wherever
    // they happened to be scrolled to on a page that just reshuffled under
    // them. Only do this on an explicit click, not on the initial
    // restore-from-sessionStorage on page load (nobody wants to be
    // auto-scrolled away from the top the moment the page opens).
    function scrollToView(view) {
      if (view !== 'homes' && view !== 'offices') return;
      var section = document.getElementById(view);
      if (!section) return;
      section.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start'
      });
    }

    function setView(view) {
      document.body.setAttribute('data-view', view);
      buttons.forEach(function (btn) {
        var active = btn.getAttribute('data-view') === view;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      try { window.sessionStorage.setItem(STORAGE_KEY, view); } catch (e) { /* ignore */ }
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var view = btn.getAttribute('data-view');
        setView(view);
        scrollToView(view);
      });
    });

    var saved = null;
    try { saved = window.sessionStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    if (saved === 'homes' || saved === 'offices' || saved === 'all') {
      setView(saved);
    }

    // Highlight-only scroll sync: as the visitor scrolls past the Home or
    // Offices section, the toggle pill follows along so it always shows
    // where they are on the page. This never touches body[data-view] or
    // hides anything — only setView() (an explicit click) does that — so
    // scrolling down the page always keeps every section reachable.
    var homeSection = document.getElementById('homes');
    var officeSection = document.getElementById('offices');
    if (homeSection && officeSection && 'IntersectionObserver' in window) {
      var highlightBtns = {
        all: document.querySelector('.view-btn[data-view="all"]'),
        homes: document.querySelector('.view-btn[data-view="homes"]'),
        offices: document.querySelector('.view-btn[data-view="offices"]')
      };

      function highlightOnly(view) {
        // Skip while a project is explicitly focused via click — that
        // filter state already drives its own highlight in setView().
        // No attribute yet (fresh page load, nothing clicked) counts as "all".
        var currentFocus = document.body.getAttribute('data-view') || 'all';
        if (currentFocus !== 'all') return;
        buttons.forEach(function (btn) {
          btn.classList.toggle('is-active', btn === highlightBtns[view]);
          btn.setAttribute('aria-pressed', btn === highlightBtns[view] ? 'true' : 'false');
        });
      }

      var sectionObserver = new IntersectionObserver(function () {
        // Recompute from scratch on every change (entering OR leaving) so
        // scrolling back above both sections correctly falls back to "All"
        // instead of leaving the last-seen section's pill stuck active.
        if (officeSection.getBoundingClientRect().top < window.innerHeight / 2 &&
            officeSection.getBoundingClientRect().bottom > window.innerHeight / 2) {
          highlightOnly('offices');
        } else if (homeSection.getBoundingClientRect().top < window.innerHeight / 2 &&
                   homeSection.getBoundingClientRect().bottom > window.innerHeight / 2) {
          highlightOnly('homes');
        } else {
          highlightOnly('all');
        }
      }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });

      sectionObserver.observe(homeSection);
      sectionObserver.observe(officeSection);
    }
  })();

  /* ---------------- Distance ledger: filter + sort ---------------- */
  (function ledger() {
    var controls = document.querySelector('[data-ledger-controls]');
    var grid = document.querySelector('[data-ledger-grid]');
    if (!controls || !grid) return;

    // Only reveal the interactive controls once JS confirms it can run them;
    // the plain grid underneath is always present for no-JS/SEO.
    controls.hidden = false;

    var cols = Array.prototype.slice.call(grid.querySelectorAll('.ledger-col'));
    var chips = controls.querySelectorAll('.chip');
    var sortSelect = controls.querySelector('[data-sort]');

    // Remember each column's original (nearest-first) order so "default"
    // sort can restore it even after other sorts have reordered the DOM.
    var originalOrder = cols.map(function (col) {
      return Array.prototype.slice.call(col.querySelectorAll('li'));
    });

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        var filter = chip.getAttribute('data-filter');
        cols.forEach(function (col) {
          var match = filter === 'all' || col.getAttribute('data-category') === filter;
          col.classList.toggle('is-hidden', !match);
        });
      });
    });

    if (sortSelect) {
      sortSelect.addEventListener('change', function () {
        var mode = sortSelect.value;
        cols.forEach(function (col, colIndex) {
          var list = col.querySelector('ul');
          var sorted = originalOrder[colIndex].slice();

          if (mode === 'distance') {
            sorted.sort(function (a, b) {
              return parseFloat(a.getAttribute('data-km')) - parseFloat(b.getAttribute('data-km'));
            });
          } else if (mode === 'time') {
            sorted.sort(function (a, b) {
              return parseFloat(a.getAttribute('data-min')) - parseFloat(b.getAttribute('data-min'));
            });
          } else if (mode === 'name') {
            sorted.sort(function (a, b) {
              var an = a.querySelector('.place').textContent;
              var bn = b.querySelector('.place').textContent;
              return an.localeCompare(bn);
            });
          }
          // "default" needs no sort — originalOrder is already nearest-first.

          sorted.forEach(function (li) { list.appendChild(li); });
        });
      });
    }
  })();

  /* ---------------- Horizontal timeline scroll progress ---------------- */
  (function timeline() {
    var track = document.querySelector('[data-timeline]');
    var fill = document.querySelector('[data-timeline-fill]');
    if (!track || !fill) return;

    function update() {
      var max = track.scrollWidth - track.clientWidth;
      var pct = max > 0 ? (track.scrollLeft / max) * 100 : 100;
      fill.style.width = pct + '%';
    }

    track.addEventListener('scroll', function () {
      window.requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* ---------------- Amenities showcase: category tabs swap list + visual ---------------- */
  (function amenTabs() {
    var groups = document.querySelectorAll('[data-amen-tabs]');
    if (!groups.length) return;

    groups.forEach(function (group) {
      var tabs = Array.prototype.slice.call(group.querySelectorAll('.amen-tab'));
      var panels = Array.prototype.slice.call(group.querySelectorAll('.amen-panel'));
      if (!tabs.length || !panels.length) return;

      function activate(index, focusTab) {
        tabs.forEach(function (tab, i) {
          var active = i === index;
          tab.classList.toggle('is-active', active);
          tab.setAttribute('aria-selected', active ? 'true' : 'false');
          tab.tabIndex = active ? 0 : -1;
        });
        panels.forEach(function (panel, i) {
          var active = i === index;
          panel.classList.toggle('is-active', active);
          panel.hidden = !active;
        });
        if (focusTab) tabs[index].focus();
      }

      tabs.forEach(function (tab, index) {
        tab.addEventListener('click', function () { activate(index, false); });

        // Standard ARIA tabs keyboard pattern: left/right (and home/end)
        // move focus between tabs and activate the newly focused one.
        tab.addEventListener('keydown', function (event) {
          var newIndex = null;
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            newIndex = (index + 1) % tabs.length;
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            newIndex = (index - 1 + tabs.length) % tabs.length;
          } else if (event.key === 'Home') {
            newIndex = 0;
          } else if (event.key === 'End') {
            newIndex = tabs.length - 1;
          }
          if (newIndex !== null) {
            event.preventDefault();
            activate(newIndex, true);
          }
        });
      });
    });
  })();

  /* ---------------- Floor plan switcher (#floorplan) ----------------
     Purpose-built for this section's ~10 options (8 residential incl. two
     "coming soon" placeholders, 1 commercial) rather than forcing the
     .amen-tab/.amen-panel component to scale past the 2-way toggle it was
     built for. Same engineering shape as amenTabs() above (flat option/panel
     arrays, [hidden] + .is-active driven from one activate() function,
     roving tabindex, arrow-key/Home/End keyboard support) but adds a real
     fade-out-then-fade-in handoff so old and new images never appear to
     jump-cut — the crossfade the user asked for ("photo changes with some
     good animation"), not just a fade-in of the new panel alone.
     Respects reduceMotion exactly like every other effect in this file:
     when true, the swap is instant with no transition delay at all. */
  (function fpSwitcher() {
    var root = document.querySelector('[data-fp-switcher]');
    if (!root) return;

    var opts = Array.prototype.slice.call(root.querySelectorAll('.fp-opt'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('.fp-panel'));
    if (!opts.length || !panels.length) return;

    var FADE_OUT_MS = 220; // matches the shorter half of the CSS transition below
    var current = opts.findIndex(function (o) { return o.classList.contains('is-active'); });
    if (current < 0) current = 0;
    var switching = false;

    function panelForOpt(opt) {
      var id = opt.getAttribute('data-panel');
      return panels.filter(function (p) { return p.id === id; })[0] || null;
    }

    function setActiveOpt(index, focusOpt) {
      opts.forEach(function (opt, i) {
        var active = i === index;
        opt.classList.toggle('is-active', active);
        opt.setAttribute('aria-selected', active ? 'true' : 'false');
        opt.tabIndex = active ? 0 : -1;
      });
      if (focusOpt) opts[index].focus();
      // The option row is a horizontal scroll-rail on narrow screens (see
      // .fp-opts in css/enhancements.css) — a tap near either edge can pick
      // an option that's only partly visible, so bring it fully into view.
      if (typeof opts[index].scrollIntoView === 'function') {
        opts[index].scrollIntoView({
          behavior: reduceMotion ? 'auto' : 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }

    function showPanel(panel) {
      panel.hidden = false;
      // Force layout so the browser registers the [hidden] removal before
      // .is-active is added a tick later — otherwise the opacity/transform
      // transition can get skipped (both states would land in the same frame).
      // eslint-disable-next-line no-unused-expressions
      panel.offsetHeight;
      panel.classList.add('is-active');
    }

    function activate(index, focusOpt) {
      if (switching || index === current) {
        if (focusOpt) opts[index].focus();
        return;
      }
      var nextPanel = panelForOpt(opts[index]);
      var currentPanel = panelForOpt(opts[current]);
      if (!nextPanel) return;

      setActiveOpt(index, focusOpt);

      if (reduceMotion || !currentPanel || currentPanel === nextPanel) {
        // Instant swap: no fade-out wait, matching how every other motion
        // effect on this site degrades under prefers-reduced-motion.
        if (currentPanel && currentPanel !== nextPanel) {
          currentPanel.classList.remove('is-active');
          currentPanel.hidden = true;
        }
        showPanel(nextPanel);
        current = index;
        return;
      }

      switching = true;
      currentPanel.classList.remove('is-active'); // starts the fade-out
      window.setTimeout(function () {
        currentPanel.hidden = true;
        showPanel(nextPanel); // starts the fade-in, once the old one is gone
        current = index;
        switching = false;
      }, FADE_OUT_MS);
    }

    opts.forEach(function (opt, index) {
      opt.addEventListener('click', function () { activate(index, false); });

      // Same ARIA tabs keyboard pattern as amenTabs(): arrows/Home/End move
      // focus between options and activate the newly focused one.
      opt.addEventListener('keydown', function (event) {
        var newIndex = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          newIndex = (index + 1) % opts.length;
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          newIndex = (index - 1 + opts.length) % opts.length;
        } else if (event.key === 'Home') {
          newIndex = 0;
        } else if (event.key === 'End') {
          newIndex = opts.length - 1;
        }
        if (newIndex !== null) {
          event.preventDefault();
          activate(newIndex, true);
        }
      });
    });
  })();

  /* ---------------- Enquiry popup: opens 20s after page load, every visit ---------------- */
  (function enquiryPopup() {
    var overlay = document.getElementById('enquiry-popup');
    if (!overlay) return;

    var closeBtn = overlay.querySelector('.popup-close');
    var lastFocused = null;

    function openPopup() {
      // Don't interrupt someone who has already reached a real form or
      // is mid-way through submitting one.
      if (document.querySelector('.lead-form .msg-ok:not([hidden])')) return;

      lastFocused = document.activeElement;
      overlay.hidden = false;
      document.body.style.overflow = 'hidden';
      var firstField = overlay.querySelector('input, select');
      if (firstField) firstField.focus();
    }

    function closePopup() {
      overlay.hidden = true;
      document.body.style.overflow = '';
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }

    closeBtn.addEventListener('click', closePopup);

    // Click on the dark backdrop (not the card itself) closes it too.
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closePopup();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !overlay.hidden) closePopup();
    });

    // A successful submission inside the popup closes it automatically.
    var popupForm = overlay.querySelector('.lead-form');
    if (popupForm) {
      popupForm.addEventListener('submit', function () {
        var okBox = popupForm.closest('.formcard').querySelector('[data-role="ok"]');
        if (!okBox) return;
        var observer = new MutationObserver(function () {
          if (!okBox.hidden) {
            window.setTimeout(closePopup, 1800);
            observer.disconnect();
          }
        });
        observer.observe(okBox, { attributes: true, attributeFilter: ['hidden'] });
      });
    }

    window.setTimeout(openPopup, 20000);
  })();

})();
