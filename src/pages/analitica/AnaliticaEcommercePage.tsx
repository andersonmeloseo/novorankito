import { TopBar } from "@/components/layout/TopBar";
import { EcommerceTrackingTab } from "@/components/tracking/EcommerceTrackingTab";

export default function AnaliticaEcommercePage() {
  return (
    <>
      <TopBar title="E-commerce" subtitle="Funis de compra, receita e eventos de e-commerce" />
      <div className="p-4 sm:p-6">
        <EcommerceTrackingTab />
      </div>
    </>
  );
}
