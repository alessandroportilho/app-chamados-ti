import { registerRootComponent } from 'expo';

import App from './App';

// Registra as chamadas do componente raiz AppRegistry.registerComponent('main', () => App);
// Também garante que, independentemente de você carregar o aplicativo no Expo Go ou em uma compilação nativa,
// o ambiente esteja configurado adequadamente
registerRootComponent(App);
