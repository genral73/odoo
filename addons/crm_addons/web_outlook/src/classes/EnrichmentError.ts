export enum EnrichmentErrorType {
    None = 'none',
    NoData = 'no_data',
    InsufficientCredit = 'insufficient_credit',
    Other = 'other'
}
class EnrichmentError {
    type: EnrichmentErrorType;
    info: string;

    constructor() {
        this.type = EnrichmentErrorType.None;
        this.info = "";
    }

    static fromJSON(o: Object): EnrichmentError {
        var e = Object.assign(new EnrichmentError(), o);
        return e;
    }
}

export default EnrichmentError;