-- Drop existing RESTRICTIVE policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view their own consorcios" ON public.consorcios;
DROP POLICY IF EXISTS "Users can insert their own consorcios" ON public.consorcios;
DROP POLICY IF EXISTS "Users can update their own consorcios" ON public.consorcios;
DROP POLICY IF EXISTS "Users can delete their own consorcios" ON public.consorcios;

DROP POLICY IF EXISTS "Users can view their own financiamentos" ON public.financiamentos;
DROP POLICY IF EXISTS "Users can insert their own financiamentos" ON public.financiamentos;
DROP POLICY IF EXISTS "Users can update their own financiamentos" ON public.financiamentos;
DROP POLICY IF EXISTS "Users can delete their own financiamentos" ON public.financiamentos;

-- Recreate as PERMISSIVE policies for consorcios
CREATE POLICY "Users can view their own consorcios" 
ON public.consorcios 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consorcios" 
ON public.consorcios 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consorcios" 
ON public.consorcios 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own consorcios" 
ON public.consorcios 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Recreate as PERMISSIVE policies for financiamentos
CREATE POLICY "Users can view their own financiamentos" 
ON public.financiamentos 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financiamentos" 
ON public.financiamentos 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financiamentos" 
ON public.financiamentos 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financiamentos" 
ON public.financiamentos 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);