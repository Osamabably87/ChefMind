/* ChefMind splash: intentional click-to-enter, no timer or auto-dismiss */
(() => {
  const screen = document.getElementById('splashScreen');
  if (!screen) return;
  const enter = document.getElementById('splashEnter');
  let dismissed = false;
  const close = () => {
    if (dismissed) return;
    dismissed = true;
    screen.classList.add('is-leaving');
    document.body.classList.remove('splash-active');
    window.setTimeout(() => screen.remove(), 950);
  };
  enter?.addEventListener('click', close);
  document.body.classList.add('splash-active');
})();