import { createApp } from 'vue'
import App from './App.vue'

import { TroisJSVuePlugin } from 'troisjs';

// Entrypoint
const app = createApp(App)
app.use(TroisJSVuePlugin);
app.mount('#app')