import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { useAuth } from "@/contexts/AuthContext";
import { Copy, Check, Code, Globe, ShoppingCart, FileCode, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

function useProjectId() {
  // Get from URL or localStorage
  const stored = localStorage.getItem("rankito_current_project");
  if (stored) {
    try { return JSON.parse(stored)?.id; } catch { return null; }
  }
  return null;
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

export function InstallScriptTab() {
  const projectId = useProjectId();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-event`;

  const mainScript = `<!-- Rankito Analytics v3.1.0 -->
<script>
(function(w,d,r){
  var P="${projectId || 'SEU_PROJECT_ID'}";
  var E="${ENDPOINT}";
  var Q=[];var S=Date.now();
  var VID=localStorage.getItem('_rk_vid');
  if(!VID){VID='rk_'+Math.random().toString(36).substr(2,12)+Date.now().toString(36);localStorage.setItem('_rk_vid',VID);}
  var SID='rs_'+Math.random().toString(36).substr(2,8)+Date.now().toString(36);

  function getDevice(){var w=screen.width;if(w<768)return'mobile';if(w<1024)return'tablet';return'desktop';}
  function getBrowser(){var u=navigator.userAgent;if(u.indexOf('Chrome')>-1&&u.indexOf('Edg')===-1)return'Chrome';if(u.indexOf('Safari')>-1&&u.indexOf('Chrome')===-1)return'Safari';if(u.indexOf('Firefox')>-1)return'Firefox';if(u.indexOf('Edg')>-1)return'Edge';if(u.indexOf('Opera')>-1||u.indexOf('OPR')>-1)return'Opera';return'Other';}
  function getOS(){var u=navigator.userAgent;if(u.indexOf('Windows')>-1)return'Windows';if(u.indexOf('Mac')>-1)return'macOS';if(u.indexOf('Linux')>-1)return'Linux';if(u.indexOf('Android')>-1)return'Android';if(u.indexOf('iPhone')>-1||u.indexOf('iPad')>-1)return'iOS';return'Other';}
  function getUTM(){var p=new URLSearchParams(location.search);return{utm_source:p.get('utm_source'),utm_medium:p.get('utm_medium'),utm_campaign:p.get('utm_campaign'),utm_term:p.get('utm_term'),utm_content:p.get('utm_content'),gclid:p.get('gclid'),fbclid:p.get('fbclid')};}

  var base={device:getDevice(),browser:getBrowser(),os:getOS(),screen_width:screen.width,screen_height:screen.height,language:navigator.language,referrer:d.referrer||null,page_url:location.href,page_title:d.title};
  var utm=getUTM();Object.assign(base,utm);

  function send(ev){
    ev.session_id=SID;ev.visitor_id=VID;
    Q.push(ev);
    if(Q.length>=10||ev.event_type==='page_exit'){flush();}
  }

  function flush(){
    if(!Q.length)return;
    var batch=Q.splice(0,50);
    var body=JSON.stringify({project_id:P,events:batch});
    if(navigator.sendBeacon){navigator.sendBeacon(E,new Blob([body],{type:'application/json'}));}
    else{fetch(E,{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true}).catch(function(){});}
  }

  // Page View
  send(Object.assign({event_type:'page_view'},base));

  // Click tracking
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

  // Form submit
  d.addEventListener('submit',function(e){
    var f=e.target;
    send(Object.assign({event_type:'form_submit',form_id:f.id||f.getAttribute('name')||f.action||null},base));
  },true);

  // Scroll depth
  var maxScroll=0;
  w.addEventListener('scroll',function(){
    var h=d.documentElement;var pct=Math.round((w.scrollY/(h.scrollHeight-h.clientHeight))*100);
    if(pct>maxScroll)maxScroll=pct;
  },{passive:true});

  // Page exit
  w.addEventListener('beforeunload',function(){
    send(Object.assign({event_type:'page_exit',scroll_depth:maxScroll,time_on_page:Math.round((Date.now()-S)/1000)},base));
    flush();
  });

  // Flush every 30s
  setInterval(flush,30000);

  // WooCommerce / E-commerce data layer
  w._rkTrack=function(eventType,data){send(Object.assign({event_type:eventType},base,data||{}));};

  // Expose for manual tracking
  w.rankitoTrack=w._rkTrack;
})(window,document);
</script>`;

  const wooCommerceSnippet = `<!-- Rankito WooCommerce Integration (adicionar APÓS o script principal) -->
<script>
document.addEventListener('DOMContentLoaded', function() {
  // Detecta adição ao carrinho (WooCommerce AJAX)
  jQuery && jQuery(document.body).on('added_to_cart', function(e, fragments, hash, btn) {
    var name = btn.closest('.product').find('.woocommerce-loop-product__title').text() || btn.data('product_name') || '';
    var price = btn.closest('.product').find('.price .amount').first().text() || '';
    window.rankitoTrack('add_to_cart', { product_name: name, product_id: btn.data('product_id'), product_price: parseFloat(price.replace(/[^0-9.,]/g,'')) || 0 });
  });

  // Detecta visualização de produto
  if (document.querySelector('.single-product')) {
    var pName = document.querySelector('.product_title') ? document.querySelector('.product_title').textContent : '';
    var pPrice = document.querySelector('.price .amount') ? document.querySelector('.price .amount').textContent : '';
    window.rankitoTrack('product_view', { product_name: pName, product_price: parseFloat(pPrice.replace(/[^0-9.,]/g,'')) || 0 });
  }

  // Detecta checkout
  if (document.querySelector('.woocommerce-checkout')) {
    window.rankitoTrack('begin_checkout', { cart_value: parseFloat(document.querySelector('.order-total .amount')?.textContent?.replace(/[^0-9.,]/g,'')) || 0 });
  }

  // Detecta compra finalizada
  if (document.querySelector('.woocommerce-order-received')) {
    var total = document.querySelector('.order-total .amount')?.textContent || '0';
    window.rankitoTrack('purchase', { cart_value: parseFloat(total.replace(/[^0-9.,]/g,'')) || 0 });
  }
});
</script>`;

  const shopifySnippet = `<!-- Rankito Shopify Integration (adicionar no theme.liquid APÓS o script principal) -->
<script>
// Product view
if (window.ShopifyAnalytics && ShopifyAnalytics.meta && ShopifyAnalytics.meta.product) {
  var p = ShopifyAnalytics.meta.product;
  window.rankitoTrack('product_view', { product_id: String(p.id), product_name: p.type, product_price: p.variants?.[0]?.price || 0 });
}

// Add to cart
document.querySelectorAll('form[action*="/cart/add"]').forEach(function(form) {
  form.addEventListener('submit', function() {
    var name = document.querySelector('.product-single__title, .product__title, h1')?.textContent?.trim() || '';
    var price = document.querySelector('.product__price, .price__regular')?.textContent?.trim() || '';
    window.rankitoTrack('add_to_cart', { product_name: name, product_price: parseFloat(price.replace(/[^0-9.,]/g,'')) || 0 });
  });
});

// Checkout & Purchase detection via Shopify events
if (window.Shopify && Shopify.checkout) {
  window.rankitoTrack('purchase', { cart_value: parseFloat(Shopify.checkout.total_price) || 0 });
}
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
              <h3 className="text-base font-bold font-display text-foreground">Instalar Script de Tracking</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Cole o script abaixo em qualquer site para capturar eventos automaticamente. 
                Funciona em <strong>WordPress</strong>, <strong>Shopify</strong>, <strong>HTML puro</strong> e qualquer plataforma.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="text-[10px] gap-1"><Globe className="h-3 w-3" /> HTML / Sites</Badge>
                <Badge variant="secondary" className="text-[10px] gap-1"><FileCode className="h-3 w-3" /> WordPress</Badge>
                <Badge variant="secondary" className="text-[10px] gap-1"><ShoppingCart className="h-3 w-3" /> WooCommerce</Badge>
                <Badge variant="secondary" className="text-[10px] gap-1"><ShoppingCart className="h-3 w-3" /> Shopify</Badge>
              </div>
            </div>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Project ID notice */}
      {!projectId && (
        <AnimatedContainer delay={0.02}>
          <Card className="p-4 border-warning/30 bg-warning/5">
            <p className="text-sm text-warning font-medium">⚠️ Selecione um projeto primeiro para gerar o script com o ID correto.</p>
          </Card>
        </AnimatedContainer>
      )}

      {/* Step 1: Main Script */}
      <AnimatedContainer delay={0.04}>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
            <h4 className="text-sm font-bold font-display">Script Principal — Cole antes do &lt;/body&gt;</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Este script captura automaticamente: <strong>page views</strong>, <strong>cliques</strong> (botões, links, WhatsApp, telefone, email), 
            <strong> submissões de formulário</strong>, <strong>scroll depth</strong>, <strong>tempo na página</strong> e <strong>UTMs/GCLID/FBCLID</strong>.
          </p>
          <CopyBlock code={mainScript} />
          
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-[11px] text-muted-foreground">
              <strong>WordPress:</strong> Cole em <code className="bg-muted px-1 rounded text-[10px]">Aparência → Editor de Temas → footer.php</code> antes do <code className="bg-muted px-1 rounded text-[10px]">&lt;/body&gt;</code>, 
              ou use um plugin como <strong>Insert Headers and Footers</strong>.
            </p>
          </div>
        </Card>
      </AnimatedContainer>

      {/* Step 2: WooCommerce (optional) */}
      <AnimatedContainer delay={0.06}>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
            <h4 className="text-sm font-bold font-display">WooCommerce — E-commerce Tracking <Badge variant="outline" className="text-[9px] ml-1">Opcional</Badge></h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Se o site usa WooCommerce, adicione este snippet <strong>após</strong> o script principal para capturar eventos de e-commerce automaticamente.
          </p>
          <CopyBlock code={wooCommerceSnippet} />
        </Card>
      </AnimatedContainer>

      {/* Step 3: Shopify (optional) */}
      <AnimatedContainer delay={0.08}>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</div>
            <h4 className="text-sm font-bold font-display">Shopify — E-commerce Tracking <Badge variant="outline" className="text-[9px] ml-1">Opcional</Badge></h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Para lojas Shopify, adicione no <code className="bg-muted px-1 rounded text-[10px]">theme.liquid</code> antes do <code className="bg-muted px-1 rounded text-[10px]">&lt;/body&gt;</code>.
          </p>
          <CopyBlock code={shopifySnippet} />
        </Card>
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
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-3">
                Use <code className="bg-muted px-1 rounded text-[10px]">window.rankitoTrack()</code> para enviar eventos customizados a qualquer momento.
              </p>
              <CopyBlock code={manualTrackingSnippet} />
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
              { emoji: "🛍️", name: "Product View", desc: "WooCommerce/Shopify" },
              { emoji: "🛒", name: "Add to Cart", desc: "WooCommerce/Shopify" },
              { emoji: "💰", name: "Purchase", desc: "Compra finalizada" },
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
    </div>
  );
}
