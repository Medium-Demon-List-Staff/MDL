import routes from './routes.js';

function readFlag(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) === true;
    } catch {
        return false;
    }
}

function writeFlag(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
    }
}

function applyCanvasTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
}

export const store = Vue.reactive({
    dark: readFlag('dark'),
    shitty: readFlag('shitty'),
    toggleDark() {
        this.dark = !this.dark;
        writeFlag('dark', this.dark);
        applyCanvasTheme(this.dark);
    },
    toggleShitty() {
        this.shitty = !this.shitty;
        writeFlag('shitty', this.shitty);
    },
});

applyCanvasTheme(store.dark);

const app = Vue.createApp({
    data: () => ({ store }),
});
const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') document.documentElement.dataset.input = 'keyboard';
}, true);
document.addEventListener('pointerdown', () => {
    document.documentElement.dataset.input = 'pointer';
}, true);

app.use(router);

app.mount('#app');
