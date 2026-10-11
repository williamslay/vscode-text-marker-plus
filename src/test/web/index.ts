// Test entry point for the VS Code web extension host. It is bundled for the browser by
// the build-web-test script, so the suites are listed here instead of being discovered on
// the file system with fs/path, which the browser host does not provide.

export {};

type WebMocha = {
    setup(options: {ui: string; reporter: string; timeout: number}): void;
    run(callback: (failures: number) => void): void;
};

export function run(): Promise<void> {
    // mocha/mocha.js is the prebuilt browser bundle. It ships the Node polyfills (util,
    // stream, process) that the browser extension host lacks.
    const mocha = require('mocha/mocha.js') as WebMocha;
    // The timeout is raised above the 2000ms default: decoration refreshes in the browser
    // host resolve slower than in the Node test runner.
    mocha.setup({ui: 'tdd', reporter: 'spec', timeout: 15000});
    // Loaded after setup because the tdd globals (suite/test) do not exist before it.
    require('./smoke.test');
    require('./restore.test');
    return new Promise<void>((resolve, reject) => {
        mocha.run(failures => failures > 0 ? reject(new Error(`Web host smoke tests failed with ${failures} error(s)`)) : resolve());
    });
}
