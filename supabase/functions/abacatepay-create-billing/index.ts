import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ABACATEPAY_API = "https://api.abacatepay.com/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const abacateKey = Deno.env.get("ABACATEPAY_API_KEY")!;

    // Validate auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }).auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      amount,
      description,
      customer_name,
      customer_email,
      customer_phone,
      customer_cpf,
      methods = ["PIX"],
      frequency = "ONE_TIME",
      return_url,
      completion_url,
    } = body;

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Valor (amount) é obrigatório e deve ser > 0" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Create or find customer
    let customerId: string | null = null;
    if (customer_email || customer_name) {
      const customerRes = await fetch(`${ABACATEPAY_API}/customer/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${abacateKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: customer_name || customer_email || "Cliente",
          email: customer_email || undefined,
          cellphone: customer_phone || undefined,
          taxId: customer_cpf || undefined,
        }),
      });
      const customerData = await customerRes.json();
      if (customerData?.data?.id) {
        customerId = customerData.data.id;
      }
    }

    // Step 2: Create billing
    const billingPayload: Record<string, unknown> = {
      frequency,
      methods,
      products: [
        {
          externalId: `rankito_${user.id}_${Date.now()}`,
          name: description || "Assinatura Rankito",
          quantity: 1,
          price: Math.round(amount), // amount in cents
        },
      ],
      returnUrl: return_url || undefined,
      completionUrl: completion_url || undefined,
    };

    if (customerId) {
      billingPayload.customer = { id: customerId };
    }

    const billingRes = await fetch(`${ABACATEPAY_API}/billing/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${abacateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(billingPayload),
    });

    const billingData = await billingRes.json();

    if (!billingRes.ok) {
      console.error("AbacatePay error:", billingData);
      return new Response(
        JSON.stringify({ error: "Erro ao criar cobrança", detail: billingData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the billing creation
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "abacatepay_billing_created",
      entity_type: "billing",
      entity_id: billingData?.data?.id || null,
      detail: JSON.stringify({
        amount,
        methods,
        frequency,
        billing_id: billingData?.data?.id,
      }),
      status: "success",
    });

    return new Response(JSON.stringify(billingData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
