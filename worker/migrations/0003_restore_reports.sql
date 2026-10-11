-- A merge transfers child records; its source cannot be restored as an intact report.
ALTER TABLE bugs ADD COLUMN merged_into TEXT;
