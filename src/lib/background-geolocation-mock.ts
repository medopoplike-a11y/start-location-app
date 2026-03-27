export const BackgroundGeolocation = {
  addWatcher: async (_options: any, _callback: any) => {
    console.warn('BackgroundGeolocation is not available in web mode.');
    return null;
  },
  openSettings: () => {
    console.warn('BackgroundGeolocation openSettings is not available in web mode.');
  },
};
