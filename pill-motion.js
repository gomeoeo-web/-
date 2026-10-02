/* A single sliding selection surface for each capsule button group. */
(() => {
  const pillSelector = '.home-filter-btn,.mode-pill,.nlp-mode-pill,.category-chip,.subcat-pill,.nlp-time-pill,.pill-segment,.nlp-day-pill';
  const states = new Map();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;

  function update(state, animate = true) {
    const {group, indicator} = state;
    const active = [...group.children].find(el => el.matches?.(pillSelector) && el.classList.contains('active'));
    if (!active || !active.offsetWidth || !group.offsetWidth) {
      indicator.hidden = true;
      return;
    }
    indicator.hidden = false;
    const geometry = [active.offsetLeft, active.offsetTop, active.offsetWidth, active.offsetHeight];
    const style = getComputedStyle(active);
    const color = group.querySelector('.home-filter-btn') && document.documentElement.dataset.theme === 'light' ? '#3f5b4b' : '#38383c';
    const key = [...geometry, style.borderRadius, color].join('|');
    if (key === state.key) return;
    const snap = !state.key || !animate || reducedMotion.matches;
    if (snap) indicator.style.transition = 'none';
    indicator.style.width = geometry[2] + 'px';
    indicator.style.height = geometry[3] + 'px';
    indicator.style.transform = `translate(${geometry[0]}px,${geometry[1]}px)`;
    indicator.style.borderRadius = style.borderRadius;
    indicator.style.backgroundColor = color;
    state.key = key;
    if (snap) requestAnimationFrame(() => indicator.style.removeProperty('transition'));
  }

  const sizes = new ResizeObserver(entries => {
    for (const entry of entries) {
      const state = states.get(entry.target) || states.get(entry.target.parentElement);
      if (state) update(state, false);
    }
  });

  function refresh() {
    frame = 0;
    for (const [group, state] of states) {
      if (!group.isConnected) {
        sizes.unobserve(group);
        state.buttons.forEach(button => sizes.unobserve(button));
        states.delete(group);
      }
    }
    const groups = new Set([...document.querySelectorAll(pillSelector)].map(button => button.parentElement));
    for (const group of groups) {
      const buttons = [...group.children].filter(el => el.matches?.(pillSelector));
      if (buttons.length < 2) continue;
      let state = states.get(group);
      if (!state) {
        const indicator = document.createElement('span');
        indicator.className = 'pill-motion-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        group.prepend(indicator);
        group.classList.add('pill-motion-ready');
        state = {group, indicator, buttons: [], key: ''};
        states.set(group, state);
        sizes.observe(group);
        group.addEventListener('click', event => {
          const button = event.target.closest('.nlp-day-pill');
          if (button && button.parentElement === group) {
            state.buttons.forEach(el => el.classList.toggle('active', el === button));
          }
          schedule();
        });
      }
      // Dynamic category/time options may replace their entire button list.
      if (!state.indicator.isConnected) group.prepend(state.indicator);
      state.buttons.filter(button => !buttons.includes(button)).forEach(button => sizes.unobserve(button));
      buttons.filter(button => !state.buttons.includes(button)).forEach(button => sizes.observe(button));
      state.buttons = buttons;
      update(state);
    }
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(refresh);
  }

  const observer = new MutationObserver(records => {
    if (records.some(record => {
      if (record.target.closest?.('.pill-motion-indicator')) return false;
      if (record.type === 'childList') return [...record.addedNodes, ...record.removedNodes].some(node => !node.classList?.contains('pill-motion-indicator'));
      if (record.attributeName === 'style') return record.target.matches('#itemModal,#nlpConfirmModal,.view-panel');
      return record.target.matches(pillSelector + ',html,body') || states.has(record.target);
    })) schedule();
  });
  observer.observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['class','aria-pressed','hidden','data-theme','style']});
  document.addEventListener('click', event => {
    if (event.target.closest?.(pillSelector)) schedule();
  }, true);
  reducedMotion.addEventListener('change', () => states.forEach(state => update(state, false)));
  document.fonts.ready.then(schedule);
  schedule();
})();
