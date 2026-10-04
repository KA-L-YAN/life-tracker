// Browsers have no step or sleep data. The website shows what the Android app synced, and takes typed-in totals.
export type HealthStatus = 'unsupported' | 'needs-install' | 'off' | 'on';

export const healthSupported = false;
export const healthStatus = async (): Promise<HealthStatus> => 'unsupported';
export const connectHealth = async () => false;
export const disconnectHealth = async () => {};
export const openHealthSettings = () => {};
export const installHealthConnect = () => {};
export const lastHealthSync = async (): Promise<Date | null> => null;
export const syncHealth = async (_options?: { force?: boolean; days?: number }) => false;
