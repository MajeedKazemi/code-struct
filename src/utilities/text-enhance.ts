export enum CSSClasses {
    identifier = "identifier",
    type = "type",
    keyword = "keyword",
    other = "other",
}

export class TextEnhance {
    constructor() {}

    getStyledSpan(content: string, styleClass: string): string {
        return `<span class=${styleClass}>${content}</span>`;
    }
}
