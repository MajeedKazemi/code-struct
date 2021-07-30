import { Module } from "../syntax-tree/module";

export class PreValidator {
    module: Module;

    constructor(module: Module) {
        this.module = module;
    }
}
