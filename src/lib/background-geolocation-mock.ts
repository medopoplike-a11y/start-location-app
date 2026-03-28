export const BackgroundGeolocation = {
  addWatcher: async (_options: unknown, _callback: unknown) => {
    console.warn('BackgroundGeolocation is not available in web mode.');
    return null;
  },
  openSettings: () => {
    console.warn('BackgroundGeolocation openSettings is not available in web mode.');
  },
};
