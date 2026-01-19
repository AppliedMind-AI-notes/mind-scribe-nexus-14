-- Create enum types
CREATE TYPE block_type AS ENUM ('text', 'math', 'code', 'pdf_ref', 'image_ref');
CREATE TYPE code_language AS ENUM ('python', 'r', 'cpp', 'matlab_pseudo');
CREATE TYPE concept_type AS ENUM ('concept', 'formula', 'code', 'experiment');
CREATE TYPE relation_type AS ENUM ('depends_on', 'derived_from', 'applied_in');
CREATE TYPE quiz_mode AS ENUM ('concept_check', 'feynman');

-- Users profile table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notebooks table
CREATE TABLE public.notebooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notebooks"
ON public.notebooks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notebooks"
ON public.notebooks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notebooks"
ON public.notebooks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notebooks"
ON public.notebooks FOR DELETE USING (auth.uid() = user_id);

-- Notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content_markdown TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes"
ON public.notes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
ON public.notes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
ON public.notes FOR DELETE USING (auth.uid() = user_id);

-- Note blocks table
CREATE TABLE public.note_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  type block_type NOT NULL DEFAULT 'text',
  order_index INTEGER NOT NULL DEFAULT 0,
  content_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.note_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own note blocks"
ON public.note_blocks FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = note_blocks.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "Users can create their own note blocks"
ON public.note_blocks FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = note_blocks.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "Users can update their own note blocks"
ON public.note_blocks FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = note_blocks.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "Users can delete their own note blocks"
ON public.note_blocks FOR DELETE 
USING (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = note_blocks.note_id AND notes.user_id = auth.uid()));

-- Code runs table
CREATE TABLE public.code_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  block_id UUID REFERENCES public.note_blocks(id) ON DELETE CASCADE,
  language code_language NOT NULL DEFAULT 'python',
  code TEXT NOT NULL,
  stdout TEXT DEFAULT '',
  stderr TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.code_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own code runs"
ON public.code_runs FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = code_runs.note_id AND notes.user_id = auth.uid()));

CREATE POLICY "Users can create their own code runs"
ON public.code_runs FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.notes WHERE notes.id = code_runs.note_id AND notes.user_id = auth.uid()));

-- Concepts table
CREATE TABLE public.concepts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type concept_type NOT NULL DEFAULT 'concept',
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own concepts"
ON public.concepts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own concepts"
ON public.concepts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own concepts"
ON public.concepts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own concepts"
ON public.concepts FOR DELETE USING (auth.uid() = user_id);

-- Concept edges table
CREATE TABLE public.concept_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_concept_id UUID REFERENCES public.concepts(id) ON DELETE CASCADE NOT NULL,
  to_concept_id UUID REFERENCES public.concepts(id) ON DELETE CASCADE NOT NULL,
  relation relation_type NOT NULL DEFAULT 'depends_on',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.concept_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own concept edges"
ON public.concept_edges FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own concept edges"
ON public.concept_edges FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own concept edges"
ON public.concept_edges FOR DELETE USING (auth.uid() = user_id);

-- Flashcards table
CREATE TABLE public.flashcards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  ease NUMERIC DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flashcards"
ON public.flashcards FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flashcards"
ON public.flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards"
ON public.flashcards FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards"
ON public.flashcards FOR DELETE USING (auth.uid() = user_id);

-- Quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL,
  mode quiz_mode NOT NULL DEFAULT 'concept_check',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quizzes"
ON public.quizzes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quizzes"
ON public.quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Quiz items table
CREATE TABLE public.quiz_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL,
  user_answer TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quiz items"
ON public.quiz_items FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_items.quiz_id AND quizzes.user_id = auth.uid()));

CREATE POLICY "Users can create their own quiz items"
ON public.quiz_items FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_items.quiz_id AND quizzes.user_id = auth.uid()));

CREATE POLICY "Users can update their own quiz items"
ON public.quiz_items FOR UPDATE 
USING (EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_items.quiz_id AND quizzes.user_id = auth.uid()));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_notebooks_updated_at
BEFORE UPDATE ON public.notebooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();