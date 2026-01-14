# Fix RLS Policy for paper_orders

## Status
- [ ] Investigate current RLS policies
- [ ] Create migration to fix INSERT policy
- [ ] Verify fix

## Context
User reported: `new row violates row-level security policy for table "paper_orders"`
This occurs likely when placing a manual trade or when the algo tries to execute an order.

## Investigation
Need to check `pg_policies` for `paper_orders`.
