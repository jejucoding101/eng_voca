// === SPA Hash Router ===
class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.params = {};
    this.beforeEachGuard = null;
    window.addEventListener('hashchange', () => this.resolve());
  }

  on(route, handler) {
    this.routes[route] = handler;
    return this;
  }

  beforeEach(guard) {
    this.beforeEachGuard = guard;
    return this;
  }

  navigate(route, params = {}) {
    this.params = params;
    window.location.hash = `#/${route}`;
  }

  getParams() {
    return this.params;
  }

  resolve() {
    const hash = window.location.hash.slice(2) || 'auth';
    const route = hash.split('?')[0];

    if (this.beforeEachGuard) {
      const canProceed = this.beforeEachGuard(route);
      if (!canProceed) return;
    }

    const handler = this.routes[route];
    if (handler) {
      this.currentRoute = route;

      const container = document.getElementById('page-container');
      container.classList.remove('page-enter');
      void container.offsetWidth;
      container.classList.add('page-enter');

      handler(this.params);
    }
  }

  start() {
    this.resolve();
  }
}

export const router = new Router();
