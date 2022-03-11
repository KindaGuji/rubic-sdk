export class RubicSdkError {
    name?: string;
    message?: string;

    constructor(message?: string) {
        this.message = message;
    }
}
