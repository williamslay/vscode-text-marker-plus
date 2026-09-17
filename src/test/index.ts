// PLEASE DO NOT MODIFY / DELETE UNLESS YOU KNOW WHAT YOU ARE DOING
//
// This file is providing the test runner to use when running extension tests.
// By default the test runner in use is Mocha based.
//
// You can provide your own test runner if you want to override it by exporting
// a function run(testRoot: string, clb: (error:Error) => void) that the extension
// host can call to run the tests. The test runner is expected to use console.log
// to report the results back to the caller. When the tests are finished, return
// a possible error to the callback or null if none.

export {};

const fs = require('fs');
const path = require('path');
const MochaConstructor = require('mocha');
const tty = require('tty');

if (!tty.getWindowSize) {
    tty.getWindowSize = () => [80, 75];
}

let mochaInstance = new MochaConstructor({
    ui: 'tdd',
    useColors: true
});

function configure(options: any) {
    mochaInstance = new MochaConstructor(options);
}

function findTestFiles(directory: string): string[] {
    return fs.readdirSync(directory, {withFileTypes: true}).reduce((files: string[], entry: any) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return files.concat(findTestFiles(entryPath));
        return entry.name.endsWith('.test.js') ? files.concat(entryPath) : files;
    }, []);
}

function run(testsRoot: string, callback: (error: Error | null, failures?: number) => void) {
    try {
        findTestFiles(testsRoot).forEach(file => mochaInstance.addFile(file));
        mochaInstance.run((failures: number) => callback(null, failures));
    } catch (error) {
        callback(error);
    }
}

const testRunner = {configure, run};

// You can directly control Mocha options by uncommenting the following lines
// See https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically#set-options for more info
testRunner.configure({
    ui: 'tdd', 	    // the TDD UI is being used in extension.test.js (suite, test, etc.)
    useColors: true // colored output from test results
});

module.exports = testRunner;
