const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
    "bail": false,
    "verbose": true,
    "moduleFileExtensions": [
        "ts",
        "js",
        "json"
    ],
    "transform": {
        "^.+\\.jsx?$": "babel-jest",
        "^.+\\.(ts|tsx)$": "ts-jest"
    },
    "transformIgnorePatterns": [
        "node_modules/(?!@polkadot)/",
        "node_modules/libsodium-wrappers/"
    ],
    "testMatch": [
        "**/test/**/*.test.(ts|js)"
    ],
    "testEnvironment": "node",
    "moduleNameMapper": pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
};