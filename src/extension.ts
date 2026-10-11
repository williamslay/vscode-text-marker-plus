import * as vscode from 'vscode';
import AppIntegrator from './lib/app-integrator';
import {createNodeMatchService} from './lib/matching/node-match-worker';

exports.activate = (context: vscode.ExtensionContext) => {
    AppIntegrator.create(vscode as any, console, () => createNodeMatchService(console)).integrate(context);
};

exports.deactivate = () => {
};
