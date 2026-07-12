-- Migration 032: admission_requests.review_recommendation column fix
--
-- lib/engine/admission.js's reviewAdmissionRequest() writes a
-- 'accept' | 'reject' | 'request_info' recommendation into a
-- review_recommendation column. That column was only ever declared
-- inside 031_admission_requests.sql's `CREATE TABLE IF NOT EXISTS
-- admission_requests`, which is a documented no-op against this live
-- database — the table already existed (created by 028), so that
-- CREATE TABLE never ran, and the column was never actually added.
-- Confirmed against the live schema dump: no review_recommendation
-- column exists. This is why every click of "Recommend Accept" /
-- "Recommend Reject" / "Request More Info" in the Butler admissions
-- queue currently fails with "column does not exist."
--
-- Safe to run more than once.

ALTER TABLE public.admission_requests
ADD COLUMN IF NOT EXISTS review_recommendation text;

COMMENT ON COLUMN public.admission_requests.review_recommendation IS
'Admissions Office / Butler''s Office non-binding recommendation: accept | reject | request_info. Set by reviewAdmissionRequest(). Does not itself change admission outcome — only decideAdmissionRequest() (Palace Authority) can set status to approved/rejected.';
