-- Add missing DELETE policy for profiles table
CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add missing UPDATE and DELETE policies for code_runs table
-- code_runs links to notes, which has user_id
CREATE POLICY "Users can update their own code runs" 
ON public.code_runs 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.notes 
    WHERE notes.id = code_runs.note_id 
    AND notes.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own code runs" 
ON public.code_runs 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.notes 
    WHERE notes.id = code_runs.note_id 
    AND notes.user_id = auth.uid()
  )
);

-- Add missing UPDATE policy for concept_edges table
CREATE POLICY "Users can update their own concept edges" 
ON public.concept_edges 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add missing UPDATE and DELETE policies for quizzes table
CREATE POLICY "Users can update their own quizzes" 
ON public.quizzes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quizzes" 
ON public.quizzes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add missing DELETE policy for quiz_items table
-- quiz_items links to quizzes, which has user_id
CREATE POLICY "Users can delete their own quiz items" 
ON public.quiz_items 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes 
    WHERE quizzes.id = quiz_items.quiz_id 
    AND quizzes.user_id = auth.uid()
  )
);