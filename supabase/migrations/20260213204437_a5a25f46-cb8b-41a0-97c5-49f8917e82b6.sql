
-- Add monetization_status to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS monetization_status text NOT NULL DEFAULT 'disponivel';
-- Values: disponivel, em_negociacao, alugado, suspenso, encerrado

-- Rank & Rent Clients (mini CRM)
CREATE TABLE public.rr_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text,
  phone text,
  whatsapp text,
  address text,
  niche text,
  notes text,
  billing_model text NOT NULL DEFAULT 'flat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rr_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their clients" ON public.rr_clients FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert clients" ON public.rr_clients FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update clients" ON public.rr_clients FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete clients" ON public.rr_clients FOR DELETE USING (auth.uid() = owner_id);

CREATE TRIGGER update_rr_clients_updated_at BEFORE UPDATE ON public.rr_clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rank & Rent Contracts
CREATE TABLE public.rr_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.rr_clients(id) ON DELETE SET NULL,
  contract_type text NOT NULL DEFAULT 'project',
  monthly_value numeric(12,2) NOT NULL DEFAULT 0,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  next_billing date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rr_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view contracts" ON public.rr_contracts FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert contracts" ON public.rr_contracts FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update contracts" ON public.rr_contracts FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete contracts" ON public.rr_contracts FOR DELETE USING (auth.uid() = owner_id);

CREATE TRIGGER update_rr_contracts_updated_at BEFORE UPDATE ON public.rr_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rank & Rent Pages (page inventory)
CREATE TABLE public.rr_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'disponivel',
  client_id uuid REFERENCES public.rr_clients(id) ON DELETE SET NULL,
  contract_id uuid REFERENCES public.rr_contracts(id) ON DELETE SET NULL,
  monthly_value numeric(12,2) NOT NULL DEFAULT 0,
  traffic integer NOT NULL DEFAULT 0,
  leads integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  roi_estimated numeric(8,2),
  priority text NOT NULL DEFAULT 'medium',
  niche text,
  location text,
  suggested_price numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rr_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view pages" ON public.rr_pages FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert pages" ON public.rr_pages FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update pages" ON public.rr_pages FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete pages" ON public.rr_pages FOR DELETE USING (auth.uid() = owner_id);

CREATE TRIGGER update_rr_pages_updated_at BEFORE UPDATE ON public.rr_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Financial records / invoices
CREATE TABLE public.rr_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  contract_id uuid REFERENCES public.rr_contracts(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.rr_clients(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid_date date,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rr_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view invoices" ON public.rr_invoices FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert invoices" ON public.rr_invoices FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update invoices" ON public.rr_invoices FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete invoices" ON public.rr_invoices FOR DELETE USING (auth.uid() = owner_id);
