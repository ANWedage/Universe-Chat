import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.universe.chat',
  appName: 'Universe Chat',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
