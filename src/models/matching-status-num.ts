export enum MatchingStatusNum {
    Unknown = 0, // Should not be used
    Pending = 1,
    Processing = 2,
    ProcessedWithResults = 3,
    ProcessedWithNoResults = 4,
    Failed = 5,
    NotAvailable = 6,
}