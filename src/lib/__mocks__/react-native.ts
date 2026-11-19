export const Platform = {
  OS: 'ios',
  select: <T>(obj: Record<string, T>): T => (obj.ios ?? obj.default ?? Object.values(obj)[0]),
};

export const AppState = {
  currentState: 'active',
  addEventListener: () => ({ remove: () => {} }),
};

export const Linking = {
  openURL: async () => {},
  canOpenURL: async () => true,
};
