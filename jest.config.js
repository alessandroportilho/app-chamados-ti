module.exports = {
  preset: "jest-expo",

  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|expo(nent)?|@expo(nent)?|expo-font|expo-asset|expo-modules-core|@expo/vector-icons|react-native-safe-area-context|firebase|@firebase)"
  ],

  setupFilesAfterEnv: [
    "@testing-library/jest-native/extend-expect"
  ],

  moduleNameMapper: {
    "^@expo/vector-icons$": "<rootDir>/__mocks__/expoIconsMock.js"
  }
};