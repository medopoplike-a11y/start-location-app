export const BackgroundGeolocation = {
  addWatcher: async (_options: unknown, _callback: unknown) => {
    void _options;
    void _callback;
    console.warn('BackgroundGeolocation is not available in web mode.');
    return null;
  },
  openSettings: () => {
    console.warn('BackgroundGeolocation openSettings is not available in web mode.');
  },
};
