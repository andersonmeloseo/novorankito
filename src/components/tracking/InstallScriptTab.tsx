import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { Copy, Check, Code, Globe, ShoppingCart, FileCode, Zap, ChevronDown, ChevronUp, Tag, Settings, AlertTriangle, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { TagHealthMonitor } from "@/components/tracking/TagHealthMonitor";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

function useProjectId() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);

  useEffect(() => {
    async function loadProject() {
      const stored = localStorage.getItem("rankito_current_project");
      if (stored) {
        setProjectId(stored);
        // Fetch project name from database
        const { data } = await supabase
          .from("projects")
          .select("name, domain")
          .eq("id", stored)
          .maybeSingle();
        if (data) {
          setProjectName(data.name || data.domain || null);
        }
      }
    }
    loadProject();

    const handleStorage = () => {
      const s = localStorage.getItem("rankito_current_project");
      if (s) {
        setProjectId(s);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return { projectId, projectName };
}

function CopyBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {label && <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">{label}</p>}
      <div className="relative bg-muted/50 border border-border rounded-lg overflow-hidden">
        <pre className="p-4 text-xs text-foreground overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap break-all">
          {code}
        </pre>
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 h-7 gap-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">{n}</div>
  );
}

function InstructionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h4 className="text-sm font-bold font-display">{title}</h4>
      </div>
      <div className="text-xs text-muted-foreground space-y-2">{children}</div>
    </Card>
  );
}

type VerifyStatus = "idle" | "loading" | "success" | "error";

function VerifyConnection({ projectId }: { projectId: string | null }) {
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [eventCount, setEventCount] = useState<number | null>(null);

  const verify = useCallback(async () => {
    if (!projectId) {
      toast.error("Selecione um projeto primeiro.");
      return;
    }

    setStatus("loading");

    try {
      // Check if any tracking events exist for this project in the last 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error, count } = await supabase
        .from("tracking_events")
        .select("id, created_at", { count: "exact" })
        .eq("project_id", projectId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      const total = count ?? 0;
      setEventCount(total);
      setLastCheck(new Date().toLocaleTimeString("pt-BR"));

      if (total > 0) {
        setStatus("success");
        toast.success(`Script detectado! ${total} evento(s) nas últimas 24h.`);
      } else {
        setStatus("error");
        toast.error("Nenhum evento recebido nas últimas 24h. Verifique se o script está instalado corretamente.");
      }
    } catch (err) {
      console.error("Verify error:", err);
      setStatus("error");
      toast.error("Erro ao verificar conexão.");
    }
  }, [projectId]);

  const sendTestEvent = useCallback(async () => {
    if (!projectId) {
      toast.error("Selecione um projeto primeiro.");
      return;
    }

    setStatus("loading");

    try {
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-event`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          events: [{
            event_type: "page_view",
            page_url: "https://test.rankito.com/verification",
            page_title: "Rankito - Teste de Conexão",
            device: "desktop",
            browser: "Rankito Dashboard",
            os: "Web",
            session_id: "test_" + Date.now(),
            visitor_id: "test_verification",
          }],
        }),
      });

      if (!res.ok) throw new Error("Failed to send test event");

      // Wait briefly then check
      await new Promise((r) => setTimeout(r, 2000));

      const since = new Date(Date.now() - 60 * 1000).toISOString();
      const { count } = await supabase
        .from("tracking_events")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .gte("created_at", since);

      if ((count ?? 0) > 0) {
        setStatus("success");
        setEventCount(count);
        setLastCheck(new Date().toLocaleTimeString("pt-BR"));
        toast.success("Evento de teste recebido com sucesso!");
      } else {
        setStatus("error");
        toast.error("Evento enviado, mas não foi encontrado. Tente novamente em alguns segundos.");
      }
    } catch (err) {
      console.error("Test event error:", err);
      setStatus("error");
      toast.error("Erro ao enviar evento de teste.");
    }
  }, [projectId]);

  const debugSnippet = `// Cole no Console do navegador (F12) no site onde instalou o script:
window.__RANKITO_DEBUG = true;
if(window._rkStatus) {
  console.log('✅ Script Rankito detectado!', window._rkStatus());
  window.rankitoTrack('page_view', { page_url: location.href, page_title: document.title });
  console.log('📤 Evento de teste enviado!');
} else {
  console.log('❌ Script Rankito NÃO encontrado. Verifique a instalação.');
}`;

  return (
    <Card className="p-5 border-border">
      <div className="flex items-center gap-2 mb-3">
        <StepNumber n={3} />
        <h4 className="text-sm font-bold font-display">Verificar Conexão</h4>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Após instalar o script, verifique se os eventos estão chegando corretamente.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          size="sm"
          onClick={verify}
          disabled={status === "loading" || !projectId}
          className="gap-1.5 text-xs"
        >
          {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Verificar Eventos (24h)
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={sendTestEvent}
          disabled={status === "loading" || !projectId}
          className="gap-1.5 text-xs"
        >
          {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
          Enviar Evento de Teste (direto)
        </Button>
      </div>

      {status !== "idle" && status !== "loading" && (
        <div className={`flex items-start gap-2.5 p-3 rounded-lg border ${
          status === "success" 
            ? "bg-success/5 border-success/20" 
            : "bg-destructive/5 border-destructive/20"
        }`}>
          {status === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            {status === "success" ? (
              <>
                <p className="font-semibold text-success">Conexão verificada com sucesso!</p>
                <p className="text-muted-foreground">
                  {eventCount} evento(s) detectado(s).
                  {lastCheck && <span className="ml-1">Verificado às {lastCheck}.</span>}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-destructive">Nenhum evento detectado</p>
                <p className="text-muted-foreground">
                  Verifique se o script foi instalado corretamente antes do <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> e se o Project ID está correto.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Debug snippet */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          <p className="text-xs font-medium text-foreground">Não funciona? Diagnóstico rápido:</p>
        </div>
        <div className="text-[11px] text-muted-foreground space-y-1.5">
          <p>1. Abra o site onde instalou o script</p>
          <p>2. Adicione <code className="bg-muted px-1 rounded">?rankito_debug=1</code> na URL e recarregue</p>
          <p>3. Abra o Console (F12) e veja os logs <code className="bg-muted px-1 rounded text-success">[Rankito]</code></p>
          <p>4. Ou cole este código no Console:</p>
        </div>
        <CopyBlock code={debugSnippet} label="Snippet de diagnóstico (Console do navegador)" />
      </div>
    </Card>
  );
}

export function InstallScriptTab() {
  const { projectId, projectName } = useProjectId();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-event`;
  const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const mainScript = `<!-- Rankito Analytics v3.3.0 -->
<script>
(function(w,d){
  var P="${projectId || 'SEU_PROJECT_ID'}";
  var E="${ENDPOINT}";
  var K="${ANON_KEY}";
  var DBG=location.search.indexOf('rankito_debug')>-1||w.__RANKITO_DEBUG;
  var Q=[];var S=Date.now();
  var VID=localStorage.getItem('_rk_vid');
  if(!VID){VID='rk_'+Math.random().toString(36).substr(2,12)+Date.now().toString(36);localStorage.setItem('_rk_vid',VID);}
  var SID='rs_'+Math.random().toString(36).substr(2,8)+Date.now().toString(36);
  function log(msg,data){if(DBG)console.log('%c[Rankito]%c '+msg,'color:#00FF88;font-weight:bold','color:inherit',data||'');}

  function getDevice(){var w=screen.width;if(w<768)return'mobile';if(w<1024)return'tablet';return'desktop';}
  function getBrowser(){var u=navigator.userAgent;if(u.indexOf('Chrome')>-1&&u.indexOf('Edg')===-1)return'Chrome';if(u.indexOf('Safari')>-1&&u.indexOf('Chrome')===-1)return'Safari';if(u.indexOf('Firefox')>-1)return'Firefox';if(u.indexOf('Edg')>-1)return'Edge';if(u.indexOf('Opera')>-1||u.indexOf('OPR')>-1)return'Opera';return'Other';}
  function getOS(){var u=navigator.userAgent;if(u.indexOf('Windows')>-1)return'Windows';if(u.indexOf('Mac')>-1)return'macOS';if(u.indexOf('Linux')>-1)return'Linux';if(u.indexOf('Android')>-1)return'Android';if(u.indexOf('iPhone')>-1||u.indexOf('iPad')>-1)return'iOS';return'Other';}
  function getUTM(){var p=new URLSearchParams(location.search);return{utm_source:p.get('utm_source'),utm_medium:p.get('utm_medium'),utm_campaign:p.get('utm_campaign'),utm_term:p.get('utm_term'),utm_content:p.get('utm_content'),gclid:p.get('gclid'),fbclid:p.get('fbclid')};}

  var base={device:getDevice(),browser:getBrowser(),os:getOS(),screen_width:screen.width,screen_height:screen.height,language:navigator.language,referrer:d.referrer||null,page_url:location.href,page_title:d.title};
  var utm=getUTM();Object.assign(base,utm);
  var geo={country:null,city:null,state:null};
  log('Script carregado',{project_id:P,endpoint:E});

  // Fetch geolocation client-side (more accurate than server IP)
  fetch('https://ipapi.co/json/',{signal:AbortSignal.timeout(4000)})
  .then(function(r){return r.json();})
  .then(function(d){
    geo.country=d.country_name||null;
    geo.city=d.city||null;
    geo.state=d.region||null;
    log('Geolocalização detectada',geo);
  })
  .catch(function(e){log('Geo falhou (usando fallback servidor)',e);});

  function send(ev){
    ev.session_id=SID;ev.visitor_id=VID;
    if(geo.country){ev.country=geo.country;ev.city=geo.city;ev.state=geo.state;}
    Q.push(ev);
    log('Evento capturado: '+ev.event_type,ev);
    if(Q.length>=10||ev.event_type==='page_exit'||ev.event_type==='page_view'){flush();}else{clearTimeout(w._rkTimer);w._rkTimer=setTimeout(flush,2000);}
  }

  function flush(){
    if(!Q.length)return;
    var batch=Q.splice(0,50);
    var body=JSON.stringify({project_id:P,events:batch});
    log('Enviando '+batch.length+' evento(s)...');
    fetch(E,{method:'POST',headers:{'Content-Type':'application/json','apikey':K,'Authorization':'Bearer '+K},body:body,keepalive:true})
    .then(function(r){
      log('Resposta: '+r.status);
      if(!r.ok)r.text().then(function(t){log('Erro: '+t);});
      return r.json();
    })
    .then(function(j){log('Resultado',j);})
    .catch(function(e){log('Falha no envio',e);});
  }

  // Delay first page_view slightly to allow geo fetch to complete
  setTimeout(function(){send(Object.assign({event_type:'page_view'},base));},500);

  d.addEventListener('click',function(e){
    var t=e.target.closest('a,button,[data-rk-track]');if(!t)return;
    var ev=Object.assign({event_type:'click',cta_text:(t.textContent||'').trim().substring(0,100),cta_selector:t.tagName.toLowerCase()+(t.id?'#'+t.id:'')+(t.className?'.'+String(t.className).split(' ')[0]:'')},base);
    var href=t.getAttribute('href')||'';
    if(href.indexOf('wa.me')>-1||href.indexOf('whatsapp')>-1)ev.event_type='whatsapp_click';
    else if(href.indexOf('tel:')===0)ev.event_type='phone_click';
    else if(href.indexOf('mailto:')===0)ev.event_type='email_click';
    else if(t.tagName==='BUTTON'||t.getAttribute('type')==='submit')ev.event_type='button_click';
    send(ev);
  },true);

  d.addEventListener('submit',function(e){
    var f=e.target;
    send(Object.assign({event_type:'form_submit',form_id:f.id||f.getAttribute('name')||f.action||null},base));
  },true);

  var maxScroll=0;
  w.addEventListener('scroll',function(){
    var h=d.documentElement;var pct=Math.round((w.scrollY/(h.scrollHeight-h.clientHeight))*100);
    if(pct>maxScroll)maxScroll=pct;
  },{passive:true});

  w.addEventListener('beforeunload',function(){
    send(Object.assign({event_type:'page_exit',scroll_depth:maxScroll,time_on_page:Math.round((Date.now()-S)/1000)},base));
    flush();
  });

  setInterval(flush,30000);

  w._rkTrack=function(eventType,data){send(Object.assign({event_type:eventType},base,data||{}));};
  w.rankitoTrack=w._rkTrack;
  w._rkStatus=function(){return{project_id:P,endpoint:E,queue:Q.length,visitor_id:VID,session_id:SID};};

  // --- Auto E-commerce: WooCommerce ---
  function initWoo(){
    if(!w.jQuery)return false;
    var $=w.jQuery;
    log('WooCommerce detectado — ativando e-commerce automático');
    // Product view
    if(d.querySelector('.single-product')){
      var pN=(d.querySelector('.product_title')||{}).textContent||'';
      var pP=(d.querySelector('.price .amount')||{}).textContent||'';
      var pId=d.querySelector('.product')&&d.querySelector('.product').getAttribute('data-product-id')||d.querySelector('input[name=product_id],button.single_add_to_cart_button')&&d.querySelector('button.single_add_to_cart_button').getAttribute('value')||'';
      send(Object.assign({event_type:'product_view',product_name:pN.trim(),product_id:pId,product_price:parseFloat((pP).replace(/[^0-9.,]/g,'').replace(',','.'))||0},base));
    }
    // Add to cart (AJAX — WooCommerce fires this jQuery event)
    $(d.body).on('added_to_cart',function(e,frags,hash,btn){
      var row=btn.closest('.product,.product-item,.wc-block-grid__product');
      var nm=row?row.find('.woocommerce-loop-product__title,.product-title,h2').first().text().trim():'';
      var pr=row?row.find('.price .amount').first().text():'';
      var pid=btn.data('product_id')||btn.attr('data-product_id')||'';
      send(Object.assign({event_type:'add_to_cart',product_name:nm,product_id:String(pid),product_price:parseFloat((pr).replace(/[^0-9.,]/g,'').replace(',','.'))||0},base));
    });
    // Add to cart (non-AJAX single product page)
    var singleForm=d.querySelector('form.cart');
    if(singleForm){
      singleForm.addEventListener('submit',function(){
        var nm=(d.querySelector('.product_title')||{}).textContent||'';
        var pr=(d.querySelector('.price .amount')||{}).textContent||'';
        var qty=parseInt((d.querySelector('input.qty')||{}).value)||1;
        send(Object.assign({event_type:'add_to_cart',product_name:nm.trim(),product_price:parseFloat((pr).replace(/[^0-9.,]/g,'').replace(',','.'))||0,metadata:{quantity:qty}},base));
      });
    }
    // Remove from cart
    $(d.body).on('removed_from_cart',function(){
      send(Object.assign({event_type:'remove_from_cart'},base));
    });
    // Checkout page
    if(d.querySelector('.woocommerce-checkout')){
      var cv=(d.querySelector('.order-total .amount')||{}).textContent||'0';
      send(Object.assign({event_type:'begin_checkout',cart_value:parseFloat(cv.replace(/[^0-9.,]/g,'').replace(',','.'))||0},base));
    }
    // Order received (purchase)
    if(d.querySelector('.woocommerce-order-received')){
      var tot=(d.querySelector('.order-total .amount')||{}).textContent||'0';
      send(Object.assign({event_type:'purchase',cart_value:parseFloat(tot.replace(/[^0-9.,]/g,'').replace(',','.'))||0},base));
    }
    return true;
  }

  // --- Auto E-commerce: Shopify ---
  function initShopify(){
    if(!w.Shopify&&!w.ShopifyAnalytics)return false;
    log('Shopify detectado — ativando e-commerce automático');
    // Product view
    if(w.ShopifyAnalytics&&w.ShopifyAnalytics.meta&&w.ShopifyAnalytics.meta.product){
      var sp=w.ShopifyAnalytics.meta.product;
      send(Object.assign({event_type:'product_view',product_id:String(sp.id||''),product_name:sp.type||d.querySelector('.product-single__title,.product__title,h1')&&d.querySelector('.product-single__title,.product__title,h1').textContent.trim()||'',product_price:sp.variants&&sp.variants[0]?parseFloat(sp.variants[0].price)||0:0},base));
    }
    // Add to cart
    d.querySelectorAll('form[action*="/cart/add"]').forEach(function(f){
      f.addEventListener('submit',function(){
        var nm=(d.querySelector('.product-single__title,.product__title,h1')||{}).textContent||'';
        var pr=(d.querySelector('.product__price,.price__regular,.price .money')||{}).textContent||'';
        send(Object.assign({event_type:'add_to_cart',product_name:nm.trim(),product_price:parseFloat((pr).replace(/[^0-9.,]/g,'').replace(',','.'))||0},base));
      });
    });
    // Shopify AJAX add to cart intercept
    var origFetch=w.fetch;
    w.fetch=function(){
      var url=arguments[0];var opts=arguments[1]||{};
      if(typeof url==='string'&&url.indexOf('/cart/add')>-1&&opts.method&&opts.method.toUpperCase()==='POST'){
        log('Shopify AJAX add_to_cart interceptado');
        try{
          var bd=opts.body;
          if(typeof bd==='string'){var parsed=JSON.parse(bd);send(Object.assign({event_type:'add_to_cart',product_id:String(parsed.id||''),metadata:{quantity:parsed.quantity||1}},base));}
        }catch(ex){}
      }
      return origFetch.apply(this,arguments);
    };
    // Purchase (thank-you page)
    if(w.Shopify&&w.Shopify.checkout){
      var sc=w.Shopify.checkout;
      send(Object.assign({event_type:'purchase',cart_value:parseFloat(sc.total_price)||0,metadata:{order_id:sc.order_id||'',currency:sc.currency||''}},base));
    }
    return true;
  }

  // --- Auto E-commerce: Generic (data attributes & structured data) ---
  function initGenericEcom(){
    // Support data-rk-product elements
    d.querySelectorAll('[data-rk-product]').forEach(function(el){
      var nm=el.getAttribute('data-rk-product')||'';
      var pr=parseFloat(el.getAttribute('data-rk-price'))||0;
      var pid=el.getAttribute('data-rk-product-id')||'';
      // Observe visibility for product_view
      var obs=new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if(en.isIntersecting){send(Object.assign({event_type:'product_view',product_name:nm,product_id:pid,product_price:pr},base));obs.unobserve(en.target);}
        });
      },{threshold:0.5});
      obs.observe(el);
    });
    // Support data-rk-add-to-cart buttons
    d.querySelectorAll('[data-rk-add-to-cart]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var nm=btn.getAttribute('data-rk-product')||btn.closest('[data-rk-product]')&&btn.closest('[data-rk-product]').getAttribute('data-rk-product')||'';
        var pr=parseFloat(btn.getAttribute('data-rk-price')||btn.closest('[data-rk-product]')&&btn.closest('[data-rk-product]').getAttribute('data-rk-price'))||0;
        var pid=btn.getAttribute('data-rk-product-id')||'';
        send(Object.assign({event_type:'add_to_cart',product_name:nm,product_id:pid,product_price:pr},base));
      });
    });
    // Support data-rk-purchase on thank-you pages
    var purchaseEl=d.querySelector('[data-rk-purchase]');
    if(purchaseEl){
      var cv=parseFloat(purchaseEl.getAttribute('data-rk-value'))||0;
      send(Object.assign({event_type:'purchase',cart_value:cv},base));
    }
    log('E-commerce genérico (data-rk-*) inicializado');
  }

  // Run e-commerce auto-detection after DOM is ready
  function initEcom(){
    var detected=initWoo()||initShopify();
    initGenericEcom();
    if(!detected)log('Nenhuma plataforma de e-commerce detectada. Use data-rk-* ou rankitoTrack() para tracking manual.');
  }
  if(d.readyState==='loading'){d.addEventListener('DOMContentLoaded',initEcom);}else{initEcom();}

  // --- Custom Events (Event Builder) ---
  var CFG_URL='${import.meta.env.VITE_SUPABASE_URL}/rest/v1/custom_event_configs?project_id=eq.'+P+'&enabled=eq.true&select=name,trigger_type,selector,metadata';
  fetch(CFG_URL,{headers:{'apikey':K,'Authorization':'Bearer '+K}})
  .then(function(r){return r.json();})
  .then(function(cfgs){
    log('Custom events carregados: '+cfgs.length);
    var scrollFired={};
    cfgs.forEach(function(c){
      var meta=Array.isArray(c.metadata)&&c.metadata.length?c.metadata.reduce(function(o,m){o[m.key]=m.value;return o;},{}):{};
      if(c.trigger_type==='click'){
        d.querySelectorAll(c.selector).forEach(function(el){
          el.addEventListener('click',function(evt){
            var t=evt.currentTarget;
            var href=t.getAttribute('href')||t.closest('a')&&t.closest('a').getAttribute('href')||'';
            var txt=(t.textContent||t.getAttribute('aria-label')||t.getAttribute('title')||'').trim().substring(0,120);
            var sel=t.tagName.toLowerCase()+(t.id?'#'+t.id:'')+(t.className?'.'+String(t.className).split(' ')[0]:'');
            send(Object.assign({event_type:c.name,cta_text:txt,cta_selector:sel,metadata:Object.assign({},meta,{href:href||undefined,tag:t.tagName,id:t.id||undefined})},base));
          });
        });
      }else if(c.trigger_type==='submit'){
        d.querySelectorAll(c.selector).forEach(function(form){
          form.addEventListener('submit',function(evt){
            var f=evt.currentTarget;
            var fid=f.id||f.getAttribute('name')||f.getAttribute('action')||'';
            var btn=f.querySelector('button[type=submit],input[type=submit],button:not([type])');
            var btnTxt=btn?(btn.textContent||btn.value||'').trim().substring(0,120):'';
            var inputs=[];f.querySelectorAll('input[name],select[name],textarea[name]').forEach(function(i){inputs.push(i.getAttribute('name'));});
            send(Object.assign({event_type:c.name,form_id:fid,cta_text:btnTxt,metadata:Object.assign({},meta,{form_id:fid,fields:inputs.join(','),action:f.getAttribute('action')||undefined})},base));
          });
        });
      }else if(c.trigger_type==='visible'){
        var obs=new IntersectionObserver(function(entries){
          entries.forEach(function(e){
            if(e.isIntersecting){
              var t=e.target;
              var sel=t.tagName.toLowerCase()+(t.id?'#'+t.id:'')+(t.className?'.'+String(t.className).split(' ')[0]:'');
              send(Object.assign({event_type:c.name,cta_selector:sel,metadata:Object.assign({},meta,{visible_element:sel,visible_ratio:Math.round(e.intersectionRatio*100)+'%'})},base));
              obs.unobserve(t);
            }
          });
        },{threshold:0.5});
        d.querySelectorAll(c.selector).forEach(function(el){obs.observe(el);});
      }else if(c.trigger_type==='scroll'){
        var thr=parseInt(c.selector)||75;
        w.addEventListener('scroll',function(){
          if(scrollFired[c.name])return;
          var pct=Math.round((w.scrollY/(d.documentElement.scrollHeight-w.innerHeight))*100);
          if(pct>=thr){scrollFired[c.name]=true;send(Object.assign({event_type:c.name,scroll_depth:pct,metadata:Object.assign({},meta,{threshold:thr+'%',actual:pct+'%'})},base));}
        },{passive:true});
      }else if(c.trigger_type==='timer'){
        var secs=parseInt(c.selector)||30;
        setTimeout(function(){send(Object.assign({event_type:c.name,time_on_page:secs,metadata:Object.assign({},meta,{timer_seconds:secs})},base));},secs*1000);
      }
      log('Evento custom registrado: '+c.name+' ('+c.trigger_type+')');
    });
  })
  .catch(function(e){log('Erro ao carregar custom events',e);});

  log('Pronto! v3.3.0 com e-commerce automático. Use ?rankito_debug=1 para ver logs.');
})(window,document);
</script>`;

  const manualTrackingSnippet = `// Tracking manual de eventos customizados
window.rankitoTrack('custom', {
  cta_text: 'Nome do evento',
  metadata: { key: 'valor' }
});

// Exemplos:
window.rankitoTrack('video_play', { cta_text: 'Video Hero' });
window.rankitoTrack('file_download', { cta_text: 'Ebook SEO.pdf' });
window.rankitoTrack('search', { cta_text: 'termo buscado' });`;

  const dataAttributeSnippet = `<!-- Para sites sem WooCommerce/Shopify, use data attributes: -->

<!-- Produto (auto-detecta product_view ao ficar visível) -->
<div data-rk-product="Camiseta Premium" data-rk-price="89.90" data-rk-product-id="SKU-001">
  <h3>Camiseta Premium</h3>
  <p>R$ 89,90</p>
  <button data-rk-add-to-cart>Adicionar ao Carrinho</button>
</div>

<!-- Página de obrigado (auto-detecta purchase) -->
<div data-rk-purchase data-rk-value="189.80"></div>`;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <AnimatedContainer>
        <Card className="p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Code className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold font-display text-foreground">Pixel Rankito — Instalar Script</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Cole o script abaixo em qualquer site para capturar eventos automaticamente. 
                Funciona em <strong>WordPress</strong>, <strong>Shopify</strong>, <strong>HTML puro</strong> e qualquer plataforma.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="text-[10px] gap-1"><Globe className="h-3 w-3" /> HTML / Sites</Badge>
                <Badge variant="secondary" className="text-[10px] gap-1"><FileCode className="h-3 w-3" /> WordPress</Badge>
                <Badge variant="secondary" className="text-[10px] gap-1"><ShoppingCart className="h-3 w-3" /> WooCommerce</Badge>
                <Badge variant="secondary" className="text-[10px] gap-1"><ShoppingCart className="h-3 w-3" /> Shopify</Badge>
                <Badge variant="secondary" className="text-[10px] gap-1"><Tag className="h-3 w-3" /> Tag Manager</Badge>
              </div>
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Project ID auto-detected */}
      <AnimatedContainer delay={0.02}>
        {projectId ? (
          <Card className="p-4 border-success/30 bg-success/5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Projeto detectado: <strong>{projectName || "Sem nome"}</strong>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">ID: {projectId}</p>
              </div>
              <Badge variant="secondary" className="text-[9px]">Auto-detectado</Badge>
            </div>
          </Card>
        ) : (
          <Card className="p-4 border-warning/30 bg-warning/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <p className="text-sm text-warning font-medium">⚠️ Selecione um projeto na sidebar para gerar o script com o ID correto.</p>
            </div>
          </Card>
        )}
      </AnimatedContainer>

      {/* Step 1: Main Script */}
      <AnimatedContainer delay={0.04}>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <StepNumber n={1} />
            <h4 className="text-sm font-bold font-display">Script Principal</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Script único que captura automaticamente: <strong>page views</strong>, <strong>cliques</strong>, <strong>formulários</strong>, 
            <strong> scroll depth</strong>, <strong>tempo na página</strong>, <strong>UTMs/GCLID/FBCLID</strong> e 
            <strong> e-commerce completo</strong> (WooCommerce, Shopify e sites genéricos via <code className="bg-muted px-1 rounded text-[10px]">data-rk-*</code>).
          </p>
          <CopyBlock code={mainScript} />
        </Card>
      </AnimatedContainer>

      {/* Step 2: How to Install — sub-tabs */}
      <AnimatedContainer delay={0.06}>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <StepNumber n={2} />
            <h4 className="text-sm font-bold font-display">Como Instalar</h4>
          </div>

          <Tabs defaultValue="html" className="w-full">
            <TabsList className="flex-wrap h-auto gap-1 mb-4">
              <TabsTrigger value="html" className="text-[11px] gap-1.5"><Globe className="h-3 w-3" /> HTML Puro</TabsTrigger>
              <TabsTrigger value="wordpress" className="text-[11px] gap-1.5"><FileCode className="h-3 w-3" /> WordPress</TabsTrigger>
              <TabsTrigger value="tagmanager" className="text-[11px] gap-1.5"><Tag className="h-3 w-3" /> Google Tag Manager</TabsTrigger>
              <TabsTrigger value="shopify" className="text-[11px] gap-1.5"><ShoppingCart className="h-3 w-3" /> Shopify</TabsTrigger>
            </TabsList>

            {/* HTML */}
            <TabsContent value="html" className="space-y-3 mt-0">
              <InstructionCard icon={<Globe className="h-4 w-4 text-primary" />} title="Site HTML / Landing Page">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Abra o arquivo <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">index.html</code> do seu site.</li>
                  <li>Cole o <strong>Script Principal</strong> (copiado acima) <strong>antes da tag</strong> <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">&lt;/body&gt;</code>.</li>
                  <li>Salve e publique o arquivo.</li>
                </ol>
                <div className="p-3 mt-2 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-[11px] font-medium text-foreground mb-1">📄 Exemplo de posição no HTML:</p>
                  <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre">{`    ...
    <!-- Seu conteúdo -->

    <!-- Rankito Analytics -->
    <script>
      (function(w,d,r){ ... })(window,document);
    </script>

  </body>
</html>`}</pre>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10 mt-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px]"><strong>Importante:</strong> Sempre coloque antes do <code className="bg-muted px-1 rounded">&lt;/body&gt;</code>, nunca no <code className="bg-muted px-1 rounded">&lt;head&gt;</code>. Isso garante que o DOM está carregado e não bloqueia o carregamento da página.</p>
                </div>
              </InstructionCard>
            </TabsContent>

            {/* WordPress */}
            <TabsContent value="wordpress" className="space-y-3 mt-0">
              <InstructionCard icon={<FileCode className="h-4 w-4 text-primary" />} title="WordPress — Via Plugin (Recomendado)">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Instale o plugin gratuito <strong>Insert Headers and Footers</strong> (WPCode) ou <strong>Header Footer Code Manager</strong>.</li>
                  <li>Vá em <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">WPCode → Header & Footer</code>.</li>
                  <li>Cole o <strong>Script Principal</strong> no campo <strong>"Footer"</strong>.</li>
                  <li>Clique em <strong>Salvar</strong>.</li>
                </ol>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10 mt-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px]"><strong>Não cole no campo "Header"!</strong> Sempre use o campo <strong>Footer</strong> para garantir que o DOM está carregado.</p>
                </div>
              </InstructionCard>

              <InstructionCard icon={<Settings className="h-4 w-4 text-muted-foreground" />} title="WordPress — Via Editor de Temas (Alternativa)">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Vá em <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">Aparência → Editor de Temas</code>.</li>
                  <li>Selecione o arquivo <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">footer.php</code>.</li>
                  <li>Cole o script <strong>antes do</strong> <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">&lt;/body&gt;</code>.</li>
                  <li>Clique em <strong>Atualizar Arquivo</strong>.</li>
                </ol>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/5 border border-warning/20 mt-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                  <p className="text-[10px]"><strong>Atenção:</strong> Ao atualizar o tema, o código pode ser perdido. Prefira o método via plugin ou use um <strong>child theme</strong>.</p>
                </div>
              </InstructionCard>

              <InstructionCard icon={<ShoppingCart className="h-4 w-4 text-success" />} title="WooCommerce — Auto-detectado ✓">
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-success/5 border border-success/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                  <p className="text-[10px]">O script v3.3.0 <strong>detecta automaticamente</strong> o WooCommerce e captura <strong>product_view</strong>, <strong>add_to_cart</strong>, <strong>remove_from_cart</strong>, <strong>begin_checkout</strong> e <strong>purchase</strong> sem snippets extras.</p>
                </div>
              </InstructionCard>
            </TabsContent>

            {/* Google Tag Manager */}
            <TabsContent value="tagmanager" className="space-y-3 mt-0">
              <InstructionCard icon={<Tag className="h-4 w-4 text-primary" />} title="Google Tag Manager">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Acesse o <strong>Google Tag Manager</strong> e selecione seu contêiner.</li>
                  <li>Clique em <strong>Tags → Nova</strong>.</li>
                  <li>Escolha o tipo <strong>"HTML Personalizado"</strong>.</li>
                  <li>Cole o <strong>Script Principal</strong> inteiro (com as tags <code className="bg-muted px-1 rounded text-[10px]">&lt;script&gt;</code>).</li>
                  <li>Em <strong>Acionamento (Trigger)</strong>, selecione <strong>"All Pages"</strong>.</li>
                  <li>Nomeie a tag como <strong>"Rankito Analytics"</strong> e clique em <strong>Salvar</strong>.</li>
                  <li>Clique em <strong>Enviar → Publicar</strong> para ativar.</li>
                </ol>
                <div className="p-3 mt-2 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-[11px] font-medium text-foreground mb-1">⚙️ Configuração avançada (opcional):</p>
                  <ul className="list-disc list-inside text-[10px] space-y-1 text-muted-foreground">
                    <li>Em <strong>Configurações avançadas → Opções de disparo</strong>, selecione <strong>"Uma vez por página"</strong>.</li>
                    <li>Marque <strong>"Suportar document.write"</strong> se necessário.</li>
                  </ul>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10 mt-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px]"><strong>Dica:</strong> Use o modo de <strong>Visualização</strong> do GTM para testar antes de publicar.</p>
                </div>
              </InstructionCard>
            </TabsContent>

            {/* Shopify */}
            <TabsContent value="shopify" className="space-y-3 mt-0">
              <InstructionCard icon={<ShoppingCart className="h-4 w-4 text-primary" />} title="Shopify — Instalação">
                <ol className="list-decimal list-inside space-y-2">
                  <li>No admin do Shopify, vá em <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">Loja Online → Temas</code>.</li>
                  <li>Clique em <strong>Ações → Editar código</strong>.</li>
                  <li>Abra o arquivo <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">theme.liquid</code>.</li>
                  <li>Cole o <strong>Script Principal</strong> antes do <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">&lt;/body&gt;</code>.</li>
                  <li>Clique em <strong>Salvar</strong>. <strong>Pronto!</strong></li>
                </ol>
              </InstructionCard>

              <InstructionCard icon={<ShoppingCart className="h-4 w-4 text-success" />} title="Shopify — Auto-detectado ✓">
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-success/5 border border-success/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                  <p className="text-[10px]">O script v3.3.0 <strong>detecta automaticamente</strong> o Shopify e captura <strong>product_view</strong>, <strong>add_to_cart</strong> (incluindo AJAX) e <strong>purchase</strong> sem snippets extras.</p>
                </div>
              </InstructionCard>
            </TabsContent>
          </Tabs>
        </Card>
      </AnimatedContainer>

      {/* Step 3: Verify Connection */}
      <AnimatedContainer delay={0.08}>
        <VerifyConnection projectId={projectId} />
      </AnimatedContainer>

      {/* Advanced: Manual tracking */}
      <AnimatedContainer delay={0.1}>
        <Card className="p-5">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 w-full text-left"
          >
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold font-display flex-1">Tracking Manual (Avançado)</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  Use <code className="bg-muted px-1 rounded text-[10px]">window.rankitoTrack()</code> para enviar eventos customizados.
                </p>
                <CopyBlock code={manualTrackingSnippet} />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground mb-1">🏷️ E-commerce via Data Attributes (sites genéricos)</p>
                <p className="text-[10px] text-muted-foreground mb-3">
                  Para sites que não usam WooCommerce ou Shopify, use atributos <code className="bg-muted px-1 rounded">data-rk-*</code> no HTML:
                </p>
                <CopyBlock code={dataAttributeSnippet} />
              </div>
            </div>
          )}
        </Card>
      </AnimatedContainer>

      {/* Events captured list */}
      <AnimatedContainer delay={0.12}>
        <Card className="p-5">
          <h4 className="text-sm font-bold font-display mb-3">📊 Eventos Capturados Automaticamente</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
             {[
              { emoji: "👁️", name: "Page View", desc: "Visualização de página" },
              { emoji: "🚪", name: "Page Exit", desc: "Saída + tempo + scroll" },
              { emoji: "🖱️", name: "Button Click", desc: "Cliques em botões" },
              { emoji: "🔗", name: "Link Click", desc: "Cliques em links" },
              { emoji: "💬", name: "WhatsApp Click", desc: "Cliques em WhatsApp" },
              { emoji: "📞", name: "Phone Click", desc: "Cliques em telefone" },
              { emoji: "✉️", name: "Email Click", desc: "Cliques em mailto" },
              { emoji: "📝", name: "Form Submit", desc: "Submissão de formulários" },
              { emoji: "📏", name: "Scroll Depth", desc: "Profundidade de rolagem" },
              { emoji: "🛍️", name: "Product View", desc: "Auto: Woo/Shopify/data-rk" },
              { emoji: "🛒", name: "Add to Cart", desc: "Auto: Woo/Shopify/data-rk" },
              { emoji: "🗑️", name: "Remove from Cart", desc: "Auto: WooCommerce" },
              { emoji: "💳", name: "Begin Checkout", desc: "Auto: WooCommerce" },
              { emoji: "💰", name: "Purchase", desc: "Auto: Woo/Shopify/data-rk" },
              { emoji: "🔍", name: "Search", desc: "Via rankitoTrack()" },
            ].map((ev) => (
              <div key={ev.name} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border/40">
                <span className="text-base">{ev.emoji}</span>
                <div>
                  <p className="text-[11px] font-semibold text-foreground">{ev.name}</p>
                  <p className="text-[9px] text-muted-foreground">{ev.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </AnimatedContainer>

      {/* Tag Health Monitor */}
      <AnimatedContainer delay={0.14}>
        <TagHealthMonitor />
      </AnimatedContainer>
    </div>
  );
}
