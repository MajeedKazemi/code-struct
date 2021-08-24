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

    getStyledSpanAtSubstrings(content: string, styleClass: string, matches: [][]): string {
        let finalHTML = "";

        const startIndexToLength = [];
        for (const listOfMatches of matches) {
            for (const matchRecord of listOfMatches) {
                startIndexToLength.push([matchRecord[0], matchRecord[1] - matchRecord[0] + 1]);
            }
        }

        for (let i = 0; i < content?.length; i++) {
            if (startIndexToLength.length > 0 && i === startIndexToLength[0][0]) {
                let stringToAdd = "";
                for (let j = i; j < i + startIndexToLength[0][1]; j++) {
                    stringToAdd += content[j];
                }

                finalHTML += this.getStyledSpan(stringToAdd, styleClass);
                i = startIndexToLength[0][0] + startIndexToLength[0][1] - 1;
                startIndexToLength.splice(0, 1);
            } else {
                finalHTML += content[i];
            }
        }

        return finalHTML;
    }
}
