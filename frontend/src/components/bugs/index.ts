export * from "./bug-submission-form"
export * from "./bug-list"
export * from "./comment-section"

// Re-export from bug-detail with explicit naming to avoid Comment interface conflict
export { default as BugDetail } from "./bug-detail"
export type { BugDetail as BugDetailType, Comment as BugDetailComment } from "./bug-detail"