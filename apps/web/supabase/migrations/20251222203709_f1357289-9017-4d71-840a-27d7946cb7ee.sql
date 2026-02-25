-- Add UPDATE policy for pluggy_transactions to ensure users can only update their own transactions
CREATE POLICY "Users can update their own transactions"
ON public.pluggy_transactions
FOR UPDATE
USING (auth.uid() = user_id);